/**
 * GET /api/tree?family_id=xxx
 * 讀取一棵家族樹的所有成員 + 關係邊，供 B1HomePage 畫樹用。
 *
 * ════════════════════════════════════════════════════════════
 * 安全鐵律：
 *   - 必須持有效 family_session cookie 方可呼叫（401 否則）
 *   - family_id 必須屬於當前登入者的 familyIds（403 否則）
 *   - 401 / 403 一律唔透露任何內部細節（防列舉）
 * ════════════════════════════════════════════════════════════
 *
 * 認證與授權流程：
 *   1. 呼叫 getCurrentMember → 驗 cookie + session + 計算主樹
 *      → !cur.ok → 直接 return 401「請先登入」
 *   2. 讀 URL query param family_id：
 *      (a) 有 family_id → 驗 cur.familyIds.includes(family_id)
 *                       → 不包含 → 403「無權查看此家族樹」
 *                       → 包含   → resolvedFamilyId = family_id
 *      (b) 無 family_id → resolvedFamilyId = cur.primaryFamilyId
 *   3. 移除：原「SELECT id FROM families ORDER BY created_at ASC LIMIT 1」
 *      （任意訪客均可讀最早樹）已刪除。
 *      登入者必有 primaryFamilyId，不再需要此 fallback。
 *   4. 三條 Promise.all query（family / members / relationships）完全不變，
 *      僅 bind resolvedFamilyId。
 *   5. 若 resolvedFamilyId 在 DB 查唔到 family，
 *      維持回 { members: [], relationships: [], family: null }（防禦性保留）。
 *
 * 回應 JSON：{ family, members, relationships }（格式與舊版完全相同）
 *
 * 錯誤：
 *   401  無效 session（冇 cookie / 過期 / 查唔到 / 未完成 setup）
 *   403  family_id 唔屬於登入者
 *   500  DB 錯（不對外透露細節）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'   // ← 【新增】登入驗證 + 主樹計算

export const onRequestGet: PagesFunction<Env> = async (ctx) => {

  /* ════════════════════════════════════════════════════════════
   * 【新增】步 1：登入驗證（必須喺任何 DB 查詢之前）
   *
   * getCurrentMember 負責：
   *   - 讀 family_session cookie → 查 family_sessions → 取 member_no
   *   - 呼叫 resolvePrimaryTree → 計算 primaryFamilyId / familyIds
   *   - 任何失敗（冇 cookie / 過期 / 無節點）→ { ok: false, response: 401 }
   * ════════════════════════════════════════════════════════════ */
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401「請先登入」

  /* ════════════════════════════════════════════════════════════
   * 【新增】步 2：決定 resolvedFamilyId + 家族歸屬驗證
   *
   * 移除段落（舊）：
   *   if (!resolvedFamilyId) {
   *     const first = await ctx.env.DB.prepare(
   *       'SELECT id FROM families ORDER BY created_at ASC LIMIT 1'
   *     ).first<{ id: string }>()
   *     resolvedFamilyId = first?.id ?? null
   *   }
   *   → 此段允許任意訪客（含未登入）讀最早家族樹，屬嚴重私隱漏洞，已完全刪除。
   *
   * 新邏輯：
   *   (a) URL 有 family_id → 驗 cur.familyIds.includes(family_id)
   *                        → 通過 → resolvedFamilyId = family_id
   *                        → 不通過 → 403「無權查看此家族樹」
   *   (b) URL 無 family_id → resolvedFamilyId = cur.primaryFamilyId
   *                        （登入者一定有 primaryFamilyId）
   * ════════════════════════════════════════════════════════════ */
  const url            = new URL(ctx.request.url)
  const paramFamilyId  = url.searchParams.get('family_id')

  let resolvedFamilyId: string

  if (paramFamilyId) {
    /* 【新增】家族歸屬驗證：403 */
    if (!cur.familyIds.includes(paramFamilyId)) {
      return Response.json(
        { ok: false, error: '無權查看此家族樹' },
        { status: 403 },
      )
    }
    resolvedFamilyId = paramFamilyId
  } else {
    /* 無 family_id → 用主樹（登入者必有） */
    resolvedFamilyId = cur.primaryFamilyId
  }

  /* ════════════════════════════════════════════════════════════
   * 步 3：三條 Promise.all query（與舊版完全相同，僅換 resolvedFamilyId）
   *
   * 保留防禦：若 resolvedFamilyId 查唔到 family，
   * 回 { members: [], relationships: [], family: null }
   * ════════════════════════════════════════════════════════════ */
  const [family, members, relationships] = await Promise.all([
    ctx.env.DB.prepare(
      'SELECT id, name, created_at FROM families WHERE id = ?'
    ).bind(resolvedFamilyId).first<{ id: string; name: string; created_at: string }>(),

    ctx.env.DB.prepare(
      `SELECT id, family_id, member_kind, display_name, birth_date, deceased_date, is_self, avatar_url, gender, created_at
       FROM members WHERE family_id = ? ORDER BY created_at ASC`
    ).bind(resolvedFamilyId).all<{
      id: string; family_id: string; member_kind: string
      display_name: string; birth_date: string | null
      deceased_date: string | null; is_self: number
      avatar_url: string | null; gender: string | null; created_at: string
    }>(),

    ctx.env.DB.prepare(
      `SELECT id, from_member, to_member, edge_type, relation_type, status, start_date, end_date
       FROM relationships WHERE family_id = ? ORDER BY created_at ASC`
    ).bind(resolvedFamilyId).all<{
      id: string; from_member: string; to_member: string
      edge_type: string; relation_type: string | null
      status: string | null; start_date: string | null; end_date: string | null
    }>(),
  ])

  /* 防禦：family 查唔到（正常不應發生，因上面已驗 familyIds） */
  if (!family) {
    return Response.json({ members: [], relationships: [], family: null })
  }

  return Response.json({
    family,
    members:       members.results,
    relationships: relationships.results,
  })
}

/* ════════════════════════════════════════════════════════════
 * PATCH — 改家族樹名稱（限登入者主樹）
 * ════════════════════════════════════════════════════════════ */
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const nameRaw = body.name
  if (typeof nameRaw !== 'string' || !nameRaw.trim())
    return Response.json({ ok: false, error: '名稱不可為空' }, { status: 400 })
  const name = nameRaw.trim()

  await ctx.env.DB
    .prepare('UPDATE families SET name = ? WHERE id = ?')
    .bind(name, cur.primaryFamilyId).run()

  return Response.json({ ok: true, family_id: cur.primaryFamilyId, name })
}
