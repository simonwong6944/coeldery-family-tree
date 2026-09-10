/**
 * /api/gatherings/:id
 *   GET    → 聚會詳情（候選項 + 商戶資料 + 票數 + 我嘅一票）
 *   PATCH  → 改標題／場合／對象／目標日期／備註／狀態（確認 → 自動生成家庭圈邀請卡）
 *   DELETE → 刪聚會（連候選／投票；同步出嘅邀請卡貼文一併刪）
 *
 * 規格：.coappery/family_gather.md §5（含 §5.2 邀請卡）、§7、rules §23
 * 權限：必須登入，且聚會屬登入者家族（family-shared，與成員編輯一致）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'
import { getCurrentMember } from '../_currentMember'
import {
  loadGathering, occasionAllowed, isDateStr, genId,
  type GatheringRow, type OptionRow,
} from '../_gatherings'

/* ── 邀請卡內容（取自已確認候選項 + 商戶表）── */
function buildInviteText(g: GatheringRow, opts: Array<Record<string, unknown>>): string {
  const lines: string[] = [`🎉 ${g.title}`]
  const date = opts.find(o => o.kind === 'date')
  if (date) lines.push(`📅 ${date.label}${date.option_time ? ' ' + String(date.option_time) : ''}`)
  else if (g.target_date) lines.push(`📅 ${g.target_date}`)
  const place = opts.find(o => o.kind === 'place')
  if (place) lines.push(`📍 ${place.label}${place.address ? '（' + String(place.address) + '）' : ''}`)
  const cake = opts.find(o => o.kind === 'cake')
  if (cake) {
    const pickup = [cake.pickup_place, cake.option_date, cake.option_time].filter(Boolean).join(' ')
    lines.push(`🎂 ${cake.label}${pickup ? '（取貨：' + pickup + '）' : ''}`)
  }
  const gift = opts.find(o => o.kind === 'gift')
  if (gift) lines.push(`🎁 ${gift.label}`)
  lines.push('詳情請打開「家庭聚會」查看 🌳')
  return lines.join('\n')
}

/** 確認聚會 → 新增／更新家庭圈邀請卡貼文；回傳 post id */
async function syncInvitePost(db: D1Database, g: GatheringRow): Promise<string> {
  const opts = await db
    .prepare(
      `SELECT o.kind, o.label, o.option_date, o.option_time, o.pickup_place,
              o.status, m.address, m.photo_url
       FROM gathering_option o
       LEFT JOIN merchant m ON m.id = o.merchant_id
       WHERE o.gathering_id = ? AND o.status = 'confirmed'
       ORDER BY o.kind`
    )
    .bind(g.id)
    .all<Record<string, unknown>>()

  const list = opts.results ?? []
  const place = list.find(o => o.kind === 'place')
  const bodyText = buildInviteText(g, list)
  const photoUrl = (place?.photo_url as string | null) ?? null

  if (g.invite_post_id) {
    await db
      .prepare('UPDATE posts SET body_text = ?, photo_url = ? WHERE id = ?')
      .bind(bodyText, photoUrl, g.invite_post_id)
      .run()
    return g.invite_post_id
  }

  const postId = genId()
  await db
    .prepare(
      `INSERT INTO posts (id, family_id, author_member_id, body_text, photo_url)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(postId, g.family_id, g.initiator_member_id, bodyText, photoUrl)
    .run()
  return postId
}

/* ════════════════════════════════════════════════════════════
 * GET — 聚會詳情
 * ════════════════════════════════════════════════════════════ */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const id = ctx.params['id'] as string
  const g  = await loadGathering(ctx.env.DB, id)
  if (!g) return Response.json({ ok: false, error: '找不到此聚會' }, { status: 404 })
  if (!cur.familyIds.includes(g.family_id))
    return Response.json({ ok: false, error: '無權查看此聚會' }, { status: 403 })

  const optRows = await ctx.env.DB
    .prepare(
      `SELECT o.*, m.name AS merchant_name, m.phone, m.whatsapp, m.map_url,
              m.address, m.photo_url, m.category_name
       FROM gathering_option o
       LEFT JOIN (SELECT mc.id, mc.name, mc.phone, mc.whatsapp, mc.map_url, mc.address,
                         mc.photo_url, mcat.name AS category_name
                  FROM merchant mc
                  LEFT JOIN merchant_category mcat ON mcat.id = mc.category_id) m
         ON m.id = o.merchant_id
       WHERE o.gathering_id = ?
       ORDER BY o.kind ASC, o.sort_order ASC, o.created_at ASC`
    )
    .bind(id)
    .all<Record<string, unknown>>()

  const voteRows = await ctx.env.DB
    .prepare('SELECT option_id, voter_member_id, choice FROM gathering_vote WHERE gathering_id = ?')
    .bind(id)
    .all<{ option_id: string; voter_member_id: string; choice: string }>()

  const votes = voteRows.results ?? []
  const memberRows = await ctx.env.DB
    .prepare('SELECT id, display_name FROM members WHERE family_id = ?')
    .bind(g.family_id)
    .all<{ id: string; display_name: string }>()
  const nameById = new Map((memberRows.results ?? []).map(m => [m.id, m.display_name]))

  const options = (optRows.results ?? []).map(o => {
    const mine = votes.filter(v => v.option_id === o.id)
    const tally = { yes: 0, no: 0, maybe: 0 }
    for (const v of mine) {
      if (v.choice === 'yes') tally.yes++
      else if (v.choice === 'no') tally.no++
      else tally.maybe++
    }
    return {
      ...(o as unknown as OptionRow),
      merchant: o.merchant_id
        ? {
            id: o.merchant_id, name: o.merchant_name, phone: o.phone, whatsapp: o.whatsapp,
            map_url: o.map_url, address: o.address, photo_url: o.photo_url,
            category_name: o.category_name,
          }
        : null,
      assignee_name: o.assignee_member_id ? (nameById.get(o.assignee_member_id as string) ?? null) : null,
      tally,
      voters: mine.map(v => ({
        member_id: v.voter_member_id, name: nameById.get(v.voter_member_id) ?? '', choice: v.choice,
      })),
      my_choice: mine.find(v => v.voter_member_id === cur.primaryMemberId)?.choice ?? null,
    }
  })

  return Response.json({
    ok: true,
    gathering: g,
    subject_name: g.subject_member_id ? (nameById.get(g.subject_member_id) ?? null) : null,
    initiator_name: nameById.get(g.initiator_member_id) ?? null,
    me: cur.primaryMemberId,
    members: memberRows.results ?? [],
    options,
  })
}

/* ════════════════════════════════════════════════════════════
 * PATCH — 修改聚會 / 確認 / 取消
 * ════════════════════════════════════════════════════════════ */
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const id = ctx.params['id'] as string
  const g  = await loadGathering(ctx.env.DB, id)
  if (!g) return Response.json({ ok: false, error: '找不到此聚會' }, { status: 404 })
  if (!cur.familyIds.includes(g.family_id))
    return Response.json({ ok: false, error: '無權修改此聚會' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const sets: string[] = []
  const binds: unknown[] = []
  let nextStatus = g.status

  if (has('title')) {
    const v = typeof body.title === 'string' ? body.title.trim() : ''
    if (!v) return Response.json({ ok: false, error: '標題不可為空' }, { status: 400 })
    if (v.length > 60) return Response.json({ ok: false, error: '標題不可超過 60 字' }, { status: 400 })
    sets.push('title = ?'); binds.push(v)
  }
  if (has('occasion_type')) {
    /* §7 硬攔截：唔可以由任何途徑改成（或改成）忌辰 */
    if (typeof body.occasion_type !== 'string' || !occasionAllowed(body.occasion_type))
      return Response.json({ ok: false, error: '此場合不可用於聚會' }, { status: 400 })
    sets.push('occasion_type = ?'); binds.push(body.occasion_type)
  }
  if (has('subject_member_id')) {
    if (body.subject_member_id === null) { sets.push('subject_member_id = ?'); binds.push(null) }
    else {
      const sub = await ctx.env.DB
        .prepare('SELECT id, family_id FROM members WHERE id = ?')
        .bind(body.subject_member_id as string)
        .first<{ id: string; family_id: string }>()
      if (!sub || !cur.familyIds.includes(sub.family_id))
        return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })
      sets.push('subject_member_id = ?'); binds.push(sub.id)
    }
  }
  if (has('target_date')) {
    if (body.target_date === null) { sets.push('target_date = ?'); binds.push(null) }
    else {
      if (!isDateStr(body.target_date))
        return Response.json({ ok: false, error: 'target_date 格式須為 YYYY-MM-DD' }, { status: 400 })
      sets.push('target_date = ?'); binds.push(body.target_date)
    }
  }
  if (has('festival_id')) {
    if (body.festival_id === null) { sets.push('festival_id = ?'); binds.push(null) }
    else {
      const f = await ctx.env.DB
        .prepare('SELECT id FROM festival WHERE id = ? AND is_active = 1')
        .bind(body.festival_id as string)
        .first<{ id: string }>()
      if (!f) return Response.json({ ok: false, error: '找不到此節日' }, { status: 404 })
      sets.push('festival_id = ?'); binds.push(f.id)
    }
  }
  if (has('note')) {
    const v = typeof body.note === 'string' ? body.note.trim() : ''
    sets.push('note = ?'); binds.push(v === '' ? null : v)
  }
  if (has('status')) {
    const v = String(body.status)
    if (!['draft', 'voting', 'confirmed', 'cancelled'].includes(v))
      return Response.json({ ok: false, error: 'status 無效' }, { status: 400 })
    nextStatus = v
    sets.push('status = ?'); binds.push(nextStatus)
  }

  if (sets.length === 0)
    return Response.json({ ok: false, error: '請提供至少一個可修改欄位' }, { status: 400 })

  await ctx.env.DB
    .prepare(`UPDATE gathering SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...binds, id)
    .run()

  /* 狀態副作用：確認 → 生成／更新邀請卡；取消 → 清走邀請卡 */
  const updated = await loadGathering(ctx.env.DB, id)
  if (updated && nextStatus === 'confirmed') {
    const postId = await syncInvitePost(ctx.env.DB, updated)
    if (postId !== updated.invite_post_id) {
      await ctx.env.DB
        .prepare('UPDATE gathering SET invite_post_id = ? WHERE id = ?')
        .bind(postId, id)
        .run()
    }
  } else if (updated && nextStatus === 'cancelled' && updated.invite_post_id) {
    await ctx.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(updated.invite_post_id).run()
    await ctx.env.DB.prepare('UPDATE gathering SET invite_post_id = NULL WHERE id = ?').bind(id).run()
  }

  const fresh = await loadGathering(ctx.env.DB, id)
  return Response.json({ ok: true, gathering: fresh })
}

/* ════════════════════════════════════════════════════════════
 * DELETE — 刪聚會
 * ════════════════════════════════════════════════════════════ */
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const id = ctx.params['id'] as string
  const g  = await loadGathering(ctx.env.DB, id)
  if (!g) return Response.json({ ok: false, error: '找不到此聚會' }, { status: 404 })
  if (!cur.familyIds.includes(g.family_id))
    return Response.json({ ok: false, error: '無權刪除此聚會' }, { status: 403 })

  if (g.invite_post_id) {
    await ctx.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(g.invite_post_id).run()
  }
  await ctx.env.DB.prepare('DELETE FROM gathering WHERE id = ?').bind(id).run()

  return Response.json({ ok: true, deleted_gathering_id: id })
}


