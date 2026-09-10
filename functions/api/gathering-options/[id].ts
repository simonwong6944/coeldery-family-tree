/**
 * /api/gathering-options/:id
 *   PATCH  → 改候選項（名稱／日期時間／取貨地點／負責人／備註／狀態）
 *   DELETE → 刪候選項（連投票）
 *
 * 規格：.coappery/family_gather.md §5
 * 確認規則：同一 kind 只可確認一項（date／place）—— 確認某地點時，同類其他候選自動 dropped。
 * 認證：必須登入，且候選屬登入者家族嘅聚會。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'
import { getCurrentMember } from '../_currentMember'
import {
  loadGathering, loadOption, isDateStr, isTimeStr, EXCLUSIVE_KINDS,
} from '../_gatherings'

const OPTION_STATUS = ['candidate', 'confirmed', 'dropped']

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const id = ctx.params['id'] as string
  const opt = await loadOption(ctx.env.DB, id)
  if (!opt) return Response.json({ ok: false, error: '找不到此候選項' }, { status: 404 })
  const g = await loadGathering(ctx.env.DB, opt.gathering_id)
  if (!g) return Response.json({ ok: false, error: '找不到此聚會' }, { status: 404 })
  if (!cur.familyIds.includes(g.family_id))
    return Response.json({ ok: false, error: '無權修改此候選項' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const sets: string[] = []
  const binds: unknown[] = []
  let confirmIt = false

  if (has('label')) {
    const v = typeof body.label === 'string' ? body.label.trim() : ''
    if (!v) return Response.json({ ok: false, error: '名稱不可為空' }, { status: 400 })
    if (v.length > 60) return Response.json({ ok: false, error: '名稱不可超過 60 字' }, { status: 400 })
    sets.push('label = ?'); binds.push(v)
  }
  if (has('option_date')) {
    if (body.option_date === null) { sets.push('option_date = ?'); binds.push(null) }
    else {
      if (!isDateStr(body.option_date))
        return Response.json({ ok: false, error: '日期格式須為 YYYY-MM-DD' }, { status: 400 })
      sets.push('option_date = ?'); binds.push(body.option_date)
    }
  }
  if (has('option_time')) {
    if (body.option_time === null) { sets.push('option_time = ?'); binds.push(null) }
    else {
      if (!isTimeStr(body.option_time))
        return Response.json({ ok: false, error: '時間格式須為 HH:MM' }, { status: 400 })
      sets.push('option_time = ?'); binds.push(body.option_time)
    }
  }
  if (has('pickup_place')) {
    const v = typeof body.pickup_place === 'string' ? body.pickup_place.trim() : ''
    sets.push('pickup_place = ?'); binds.push(v === '' ? null : v)
  }
  if (has('note')) {
    const v = typeof body.note === 'string' ? body.note.trim() : ''
    sets.push('note = ?'); binds.push(v === '' ? null : v)
  }
  if (has('assignee_member_id')) {
    if (body.assignee_member_id === null) { sets.push('assignee_member_id = ?'); binds.push(null) }
    else {
      const am = await ctx.env.DB
        .prepare('SELECT id, family_id FROM members WHERE id = ?')
        .bind(body.assignee_member_id as string)
        .first<{ id: string; family_id: string }>()
      if (!am || !cur.familyIds.includes(am.family_id))
        return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })
      sets.push('assignee_member_id = ?'); binds.push(am.id)
    }
  }
  if (has('status')) {
    const v = String(body.status)
    if (!OPTION_STATUS.includes(v))
      return Response.json({ ok: false, error: 'status 無效' }, { status: 400 })
    if (v === 'confirmed') confirmIt = true
    sets.push('status = ?'); binds.push(v)
  }

  if (sets.length === 0)
    return Response.json({ ok: false, error: '請提供至少一個可修改欄位' }, { status: 400 })

  await ctx.env.DB
    .prepare(`UPDATE gathering_option SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds, id)
    .run()

  /* date／place 屬「唯一」項目：確認一項 → 同類其他候選自動 dropped */
  if (confirmIt && (EXCLUSIVE_KINDS as readonly string[]).includes(opt.kind)) {
    await ctx.env.DB
      .prepare(
        `UPDATE gathering_option SET status = 'dropped'
         WHERE gathering_id = ? AND kind = ? AND id <> ? AND status <> 'dropped'`
      )
      .bind(opt.gathering_id, opt.kind, id)
      .run()
  }

  const fresh = await loadOption(ctx.env.DB, id)
  return Response.json({ ok: true, option: fresh })
}

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const id = ctx.params['id'] as string
  const opt = await loadOption(ctx.env.DB, id)
  if (!opt) return Response.json({ ok: false, error: '找不到此候選項' }, { status: 404 })
  const g = await loadGathering(ctx.env.DB, opt.gathering_id)
  if (!g) return Response.json({ ok: false, error: '找不到此聚會' }, { status: 404 })
  if (!cur.familyIds.includes(g.family_id))
    return Response.json({ ok: false, error: '無權刪除此候選項' }, { status: 403 })

  await ctx.env.DB.prepare('DELETE FROM gathering_option WHERE id = ?').bind(id).run()
  await ctx.env.DB.prepare('DELETE FROM gathering_vote WHERE option_id = ?').bind(id).run()

  return Response.json({ ok: true, deleted_option_id: id })
}
