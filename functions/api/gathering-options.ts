/**
 * /api/gathering-options
 *   POST → 為聚會加入候選項（date／place／cake／gift）
 *
 * 規格：.coappery/family_gather.md §5（候選日期／地點／蛋糕／禮物）
 * 認證：必須登入，且聚會屬登入者家族；商戶必須 is_listed = 1（沿用 merchant 准入）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import {
  loadGathering, genId, OPTION_KINDS, isDateStr, isTimeStr,
} from './_gatherings'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const {
    gathering_id, kind, label, merchant_id,
    option_date, option_time, pickup_place, assignee_member_id, note,
  } = body as {
    gathering_id?: string; kind?: string; label?: string; merchant_id?: string
    option_date?: string; option_time?: string; pickup_place?: string
    assignee_member_id?: string; note?: string
  }

  if (!gathering_id)
    return Response.json({ ok: false, error: '缺少 gathering_id' }, { status: 400 })
  const g = await loadGathering(ctx.env.DB, gathering_id)
  if (!g) return Response.json({ ok: false, error: '找不到此聚會' }, { status: 404 })
  if (!cur.familyIds.includes(g.family_id))
    return Response.json({ ok: false, error: '無權修改此聚會' }, { status: 403 })
  if (g.status === 'cancelled')
    return Response.json({ ok: false, error: '已取消嘅聚會不可再加候選' }, { status: 400 })

  if (typeof kind !== 'string' || !(OPTION_KINDS as readonly string[]).includes(kind))
    return Response.json({ ok: false, error: 'kind 必須為 date／place／cake／gift' }, { status: 400 })

  let cleanLabel = typeof label === 'string' ? label.trim() : ''
  if (!cleanLabel && kind === 'date' && isDateStr(option_date)) cleanLabel = option_date as string
  if (!cleanLabel)
    return Response.json({ ok: false, error: '缺少候選項名稱' }, { status: 400 })
  if (cleanLabel.length > 60)
    return Response.json({ ok: false, error: '名稱不可超過 60 字' }, { status: 400 })

  if (option_date && !isDateStr(option_date))
    return Response.json({ ok: false, error: '日期格式須為 YYYY-MM-DD' }, { status: 400 })
  if (option_time && !isTimeStr(option_time))
    return Response.json({ ok: false, error: '時間格式須為 HH:MM' }, { status: 400 })

  /* 商戶（可選）：必須已上架，否則唔應該出現喺聚會（沿用 merchant 准入規則） */
  let merchantId: string | null = null
  if (merchant_id) {
    const mc = await ctx.env.DB
      .prepare('SELECT id FROM merchant WHERE id = ? AND is_listed = 1')
      .bind(merchant_id)
      .first<{ id: string }>()
    if (!mc) return Response.json({ ok: false, error: '找不到此商戶' }, { status: 404 })
    merchantId = mc.id
  }

  /* 負責人（可選）：必須屬同一家族 */
  let assigneeId: string | null = null
  if (assignee_member_id) {
    const am = await ctx.env.DB
      .prepare('SELECT id, family_id FROM members WHERE id = ?')
      .bind(assignee_member_id)
      .first<{ id: string; family_id: string }>()
    if (!am || !cur.familyIds.includes(am.family_id))
      return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })
    assigneeId = am.id
  }

  const maxRow = await ctx.env.DB
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS mx FROM gathering_option WHERE gathering_id = ?')
    .bind(gathering_id)
    .first<{ mx: number }>()

  const id = genId()
  await ctx.env.DB
    .prepare(
      `INSERT INTO gathering_option
         (id, gathering_id, kind, label, merchant_id, option_date, option_time,
          pickup_place, assignee_member_id, status, note, sort_order, created_by_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?)`
    )
    .bind(
      id, gathering_id, kind, cleanLabel, merchantId,
      option_date ?? null, option_time ?? null,
      typeof pickup_place === 'string' && pickup_place.trim() ? pickup_place.trim() : null,
      assigneeId,
      typeof note === 'string' && note.trim() ? note.trim() : null,
      (maxRow?.mx ?? -1) + 1, cur.primaryMemberId,
    )
    .run()

  const option = await ctx.env.DB
    .prepare('SELECT * FROM gathering_option WHERE id = ?')
    .bind(id)
    .first<Record<string, unknown>>()

  /* 加入候選即代表進入投票階段（draft → voting） */
  if (g.status === 'draft') {
    await ctx.env.DB.prepare("UPDATE gathering SET status = 'voting', updated_at = datetime('now') WHERE id = ?")
      .bind(gathering_id)
      .run()
  }

  return Response.json({ ok: true, option }, { status: 201 })
}
