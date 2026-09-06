/**
 * /api/members/:id/important-dates
 *
 * GET    — 回該 member 全部重要日子，按 date 升序排列
 *          Response: { ok: true, dates: ImportantDate[] }
 *
 * POST   — 新增一筆重要日子
 *          Body: { label: string, date: string (YYYY-MM-DD), is_recurring?: 0 | 1 }
 *          label 空 → 400；date 格式錯 → 400
 *          Response 201: { ok: true, date: ImportantDate }
 *
 * PATCH  — 修改一筆重要日子（防越權：date_id 須屬同一 family 的 member）
 *          Body: { date_id: string, label?: string, date?: string, is_recurring?: 0 | 1 }
 *          date_id 缺 → 400；至少一個可改欄位；date 格式錯 → 400；label 空 → 400
 *          Response: { ok: true, date: ImportantDate }
 *
 * DELETE — 刪除一筆重要日子（防越權：date_id 須屬同一 family 的 member）
 *          Body or query: { date_id: string }
 *          找不到或越權 → 404
 *          Response: { ok: true, deleted_id: string }
 *
 * 安全：透過 _currentMember 確保操作者屬同一 family；
 *       target member 亦須屬同一 family，否則回 404（防橫向越權）。
 *       PATCH / DELETE 的 date_id 亦須屬此 member，否則 404（防橫向越權）。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../../_types'
import { getCurrentMember } from '../../_currentMember'

/* ─── 型別 ─── */
interface ImportantDate {
  id:           string
  member_id:    string
  label:        string
  date:         string
  is_recurring: number   // 1 = 每年提醒，0 = 只提醒一次
  created_at:   string
}

/* ─── 工具函式 ─── */
function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/* ─── GET /api/members/:id/important-dates ─── */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const targetMemberId = ctx.params['id'] as string
  if (!targetMemberId)
    return Response.json({ ok: false, error: '缺少 member id' }, { status: 400 })

  // 1. 取得當前用戶（確認 family 歸屬）
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { familyId } = cur

  // 2. 確認 target member 屬同一 family（防越權）
  const targetMember = await ctx.env.DB
    .prepare('SELECT id FROM members WHERE id = ? AND family_id = ?')
    .bind(targetMemberId, familyId)
    .first<{ id: string }>()
  if (!targetMember)
    return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })

  // 3. 查詢重要日子，按 date 升序
  const rows = await ctx.env.DB
    .prepare('SELECT id, member_id, label, date, is_recurring, created_at FROM member_important_dates WHERE member_id = ? ORDER BY date ASC')
    .bind(targetMemberId)
    .all<ImportantDate>()

  return Response.json({ ok: true, dates: rows.results ?? [] })
}

/* ─── POST /api/members/:id/important-dates ─── */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const targetMemberId = ctx.params['id'] as string
  if (!targetMemberId)
    return Response.json({ ok: false, error: '缺少 member id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { familyId } = cur

  // 2. 確認 target member 屬同一 family
  const targetMember = await ctx.env.DB
    .prepare('SELECT id FROM members WHERE id = ? AND family_id = ?')
    .bind(targetMemberId, familyId)
    .first<{ id: string }>()
  if (!targetMember)
    return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })

  // 3. Parse body
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  // 4. 驗證 label
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!label)
    return Response.json({ ok: false, error: 'label 不可為空' }, { status: 400 })

  // 5. 驗證 date
  const dateVal = typeof body.date === 'string' ? body.date.trim() : ''
  if (!DATE_RE.test(dateVal))
    return Response.json({ ok: false, error: 'date 格式須為 YYYY-MM-DD' }, { status: 400 })

  // 6. is_recurring（選填，預設 1）
  const isRecurring = body.is_recurring === 0 ? 0 : 1

  // 7. 插入
  const newId = genId()
  await ctx.env.DB
    .prepare('INSERT INTO member_important_dates (id, member_id, label, date, is_recurring) VALUES (?, ?, ?, ?, ?)')
    .bind(newId, targetMemberId, label, dateVal, isRecurring)
    .run()

  // 8. 取出剛建立的紀錄回傳
  const created = await ctx.env.DB
    .prepare('SELECT id, member_id, label, date, is_recurring, created_at FROM member_important_dates WHERE id = ?')
    .bind(newId)
    .first<ImportantDate>()

  return Response.json({ ok: true, date: created }, { status: 201 })
}

/* ─── PATCH /api/members/:id/important-dates ─── */
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const targetMemberId = ctx.params['id'] as string
  if (!targetMemberId)
    return Response.json({ ok: false, error: '缺少 member id' }, { status: 400 })

  // 1. 取得當前用戶（確認 family 歸屬）
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { familyId } = cur

  // 2. 確認 target member 屬同一 family（防越權）
  const targetMember = await ctx.env.DB
    .prepare('SELECT id FROM members WHERE id = ? AND family_id = ?')
    .bind(targetMemberId, familyId)
    .first<{ id: string }>()
  if (!targetMember)
    return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })

  // 3. Parse body
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  // 4. date_id 必填
  const dateId = typeof body.date_id === 'string' ? body.date_id.trim() : ''
  if (!dateId)
    return Response.json({ ok: false, error: '缺少 date_id' }, { status: 400 })

  // 5. 確認 date_id 存在且屬於此 member（防橫向越權）
  const existing = await ctx.env.DB
    .prepare('SELECT id, member_id, label, date, is_recurring, created_at FROM member_important_dates WHERE id = ? AND member_id = ?')
    .bind(dateId, targetMemberId)
    .first<ImportantDate>()
  if (!existing)
    return Response.json({ ok: false, error: '找不到此重要日子' }, { status: 404 })

  // 6. 提取可改欄位
  const hasLabel       = Object.prototype.hasOwnProperty.call(body, 'label')
  const hasDate        = Object.prototype.hasOwnProperty.call(body, 'date')
  const hasIsRecurring = Object.prototype.hasOwnProperty.call(body, 'is_recurring')

  if (!hasLabel && !hasDate && !hasIsRecurring)
    return Response.json({ ok: false, error: '請提供至少一個可修改欄位（label、date 或 is_recurring）' }, { status: 400 })

  // 7. 驗證各欄位值
  let newLabel: string | undefined
  if (hasLabel) {
    newLabel = typeof body.label === 'string' ? body.label.trim() : ''
    if (!newLabel)
      return Response.json({ ok: false, error: 'label 不可為空' }, { status: 400 })
  }

  let newDate: string | undefined
  if (hasDate) {
    newDate = typeof body.date === 'string' ? body.date.trim() : ''
    if (!DATE_RE.test(newDate))
      return Response.json({ ok: false, error: 'date 格式須為 YYYY-MM-DD' }, { status: 400 })
  }

  let newIsRecurring: number | undefined
  if (hasIsRecurring) {
    const v = body.is_recurring
    if (v !== 0 && v !== 1)
      return Response.json({ ok: false, error: 'is_recurring 只接受 0 或 1' }, { status: 400 })
    newIsRecurring = v as number
  }

  // 8. 動態組 SET clause（只更新有提供的欄）
  const setClauses: string[] = []
  const bindings:  unknown[] = []

  if (hasLabel)       { setClauses.push('label = ?');        bindings.push(newLabel) }
  if (hasDate)        { setClauses.push('date = ?');         bindings.push(newDate) }
  if (hasIsRecurring) { setClauses.push('is_recurring = ?'); bindings.push(newIsRecurring) }

  bindings.push(dateId)
  await ctx.env.DB
    .prepare(`UPDATE member_important_dates SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run()

  // 9. 取出更新後記錄回傳
  const updated = await ctx.env.DB
    .prepare('SELECT id, member_id, label, date, is_recurring, created_at FROM member_important_dates WHERE id = ?')
    .bind(dateId)
    .first<ImportantDate>()

  return Response.json({ ok: true, date: updated })
}

/* ─── DELETE /api/members/:id/important-dates ─── */
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const targetMemberId = ctx.params['id'] as string
  if (!targetMemberId)
    return Response.json({ ok: false, error: '缺少 member id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { familyId } = cur

  // 2. 確認 target member 屬同一 family（防越權）
  const targetMember = await ctx.env.DB
    .prepare('SELECT id FROM members WHERE id = ? AND family_id = ?')
    .bind(targetMemberId, familyId)
    .first<{ id: string }>()
  if (!targetMember)
    return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })

  // 3. 取得 date_id（支援 body 或 query string）
  let dateId: string | null = null

  // 嘗試從 query string 取
  const url = new URL(ctx.request.url)
  const qId = url.searchParams.get('date_id')
  if (qId) {
    dateId = qId
  } else {
    // 嘗試從 body 取（DELETE body 非必需，gracefully handle parse error）
    try {
      const body = await ctx.request.json() as Record<string, unknown>
      if (typeof body.date_id === 'string') dateId = body.date_id
    } catch { /* body 可能為空，無視 */ }
  }

  if (!dateId)
    return Response.json({ ok: false, error: '缺少 date_id' }, { status: 400 })

  // 4. 確認該 date_id 存在且屬於同一 family 的 target member（防橫向越權）
  const existing = await ctx.env.DB
    .prepare('SELECT id FROM member_important_dates WHERE id = ? AND member_id = ?')
    .bind(dateId, targetMemberId)
    .first<{ id: string }>()
  if (!existing)
    return Response.json({ ok: false, error: '找不到此重要日子' }, { status: 404 })

  // 5. 刪除
  await ctx.env.DB
    .prepare('DELETE FROM member_important_dates WHERE id = ?')
    .bind(dateId)
    .run()

  return Response.json({ ok: true, deleted_id: dateId })
}
