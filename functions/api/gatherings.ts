/**
 * /api/gatherings
 *   GET  → 登入者主樹嘅聚會清單（連候選／確認／投票數）
 *   POST → 發起聚會
 *
 * 規格：.coappery/family_gather.md §5（聚會發起）、§7（忌辰硬攔截）、rules §23
 * 認證：必須登入（getCurrentMember → primaryFamilyId）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { genId, occasionAllowed, isDateStr, type GatheringRow } from './_gatherings'

/* ── GET：聚會清單 ── */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const rows = await ctx.env.DB
    .prepare(
      `SELECT g.id, g.title, g.occasion_type, g.subject_member_id, g.target_date,
              g.status, g.note, g.created_at, m.display_name AS subject_name,
              (SELECT COUNT(*) FROM gathering_option o WHERE o.gathering_id = g.id) AS option_count,
              (SELECT COUNT(*) FROM gathering_option o
                 WHERE o.gathering_id = g.id AND o.status = 'confirmed') AS confirmed_count,
              (SELECT COUNT(DISTINCT v.voter_member_id) FROM gathering_vote v
                 WHERE v.gathering_id = g.id) AS voter_count,
              (SELECT o.option_date FROM gathering_option o
                 WHERE o.gathering_id = g.id AND o.kind = 'date' AND o.status = 'confirmed'
                 LIMIT 1) AS plan_date
       FROM gathering g
       LEFT JOIN members m ON m.id = g.subject_member_id
       WHERE g.family_id = ?
       ORDER BY g.created_at DESC`
    )
    .bind(cur.primaryFamilyId)
    .all<Record<string, unknown>>()

  return Response.json({ ok: true, gatherings: rows.results ?? [] })
}

/* ── POST：發起聚會 ── */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const { title, occasion_type, subject_member_id, target_date, festival_id, note } = body as {
    title?: string; occasion_type?: string; subject_member_id?: string
    target_date?: string; festival_id?: string; note?: string
  }

  /* §7 硬攔截：忌辰唔可以發起聚會（唔靠前端隱藏按鈕） */
  if (typeof occasion_type !== 'string' || !occasionAllowed(occasion_type))
    return Response.json(
      { ok: false, error: '此場合不可發起聚會（忌辰等莊重場合一律禁止）' },
      { status: 400 },
    )

  const cleanTitle = typeof title === 'string' ? title.trim() : ''
  if (!cleanTitle)
    return Response.json({ ok: false, error: '缺少聚會標題' }, { status: 400 })
  if (cleanTitle.length > 60)
    return Response.json({ ok: false, error: '標題不可超過 60 字' }, { status: 400 })

  /* 對象成員必須屬同一家族 */
  let subjectId: string | null = null
  if (subject_member_id) {
    const sub = await ctx.env.DB
      .prepare('SELECT id, family_id FROM members WHERE id = ?')
      .bind(subject_member_id)
      .first<{ id: string; family_id: string }>()
    if (!sub || !cur.familyIds.includes(sub.family_id))
      return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })
    subjectId = sub.id
  }

  let targetDate: string | null = null
  if (target_date) {
    if (!isDateStr(target_date))
      return Response.json({ ok: false, error: 'target_date 格式須為 YYYY-MM-DD' }, { status: 400 })
    targetDate = target_date
  }

  /* 節日（可選）：必須存在於節日曆；節日聚會用佢帶出該節日嘅商戶推廣 */
  let festivalId: string | null = null
  if (festival_id) {
    const f = await ctx.env.DB
      .prepare('SELECT id FROM festival WHERE id = ? AND is_active = 1')
      .bind(festival_id)
      .first<{ id: string }>()
    if (!f) return Response.json({ ok: false, error: '找不到此節日' }, { status: 404 })
    festivalId = f.id
  }

  const id  = genId()
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

  await ctx.env.DB
    .prepare(
      `INSERT INTO gathering
         (id, family_id, initiator_member_id, title, occasion_type, subject_member_id,
          target_date, festival_id, status, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`
    )
    .bind(
      id, cur.primaryFamilyId, cur.primaryMemberId, cleanTitle, occasion_type,
      subjectId, targetDate, festivalId,
      typeof note === 'string' && note.trim() ? note.trim() : null, now, now,
    )
    .run()

  const gathering = await ctx.env.DB
    .prepare('SELECT * FROM gathering WHERE id = ?')
    .bind(id)
    .first<GatheringRow>()

  return Response.json({ ok: true, gathering }, { status: 201 })
}
