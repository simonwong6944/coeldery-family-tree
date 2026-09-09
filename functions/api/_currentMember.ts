/**
 * _currentMember — 共用 helper
 *
 * 讀 family_session cookie → 查 family_sessions → 取 member_no →
 * 呼叫 resolvePrimaryTree 計算「主樹」→ 回傳。
 *
 * ── 認證路徑 ──
 *   1. 從 request Cookie header 讀 family_session token
 *   2. SELECT member_no FROM family_sessions WHERE token=? AND expires_at > datetime('now')
 *   3. 搵到 member_no → 呼叫 resolvePrimaryTree(db, memberNo)
 *   4. 無任何節點（pt === null）→ 401（session 存在但未完成 setup）
 *   5. 有節點 → 回傳 primaryMemberId / primaryFamilyId / familyIds
 *
 * ── 主樹優先次序（由 resolvePrimaryTree 負責）──
 *   (1) 優先：節點 X 存在 parent_child edge 且 to_member = X.id（X 係子女）→ 最早者
 *   (2) 其次：節點 Y 存在 parent_child edge 且 from_member = Y.id（Y 做父母）→ 最早者
 *   (3) 再其次：所有節點中最早建立者
 *
 * ── 失敗情況（一律 401）──
 *   - 冇 family_session cookie
 *   - cookie 存在但 session 已過期 / token 無效
 *   - session 有效但 member_no 無對應 person 節點（未完成 setup）
 *   - request 未傳入（optional）→ 無 cookie = 未登入
 *
 * 回傳格式：
 *   { ok: true,  memberNo, primaryFamilyId, primaryMemberId, familyIds }  — 成功
 *   { ok: false, response: Response }                                       — 失敗（401）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import { resolvePrimaryTree } from './_resolvePrimaryTree'

export type CurrentMemberOk = {
  ok:              true
  memberNo:        string
  primaryFamilyId: string
  primaryMemberId: string
  familyIds:       string[]
}

export type CurrentMemberErr = {
  ok:       false
  response: Response
}

export type CurrentMemberResult = CurrentMemberOk | CurrentMemberErr

/* ── 401 回傳工廠 ── */
function unauthorized(): CurrentMemberErr {
  return {
    ok:       false,
    response: Response.json({ ok: false, error: '請先登入' }, { status: 401 }),
  }
}

/* ── 從 Cookie header string parse 出指定 cookie 值（純 JS，無第三方 dep）── */
function parseCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const prefix = `${name}=`
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length)
    }
  }
  return undefined
}

/**
 * getCurrentMember
 *
 * @param db      - D1Database binding（必填）
 * @param request - 原生 Request（可選）；冇傳一律視為未登入，回 401
 */
export async function getCurrentMember(
  db:       D1Database,
  request?: Request,
): Promise<CurrentMemberResult> {

  /* ════════════════════════════════════════════════════════════
   * 步 1：讀 cookie → 查 session → 取 member_no
   * ════════════════════════════════════════════════════════════ */
  if (!request) return unauthorized()

  const cookieHeader = request.headers.get('cookie')
  const token        = parseCookieValue(cookieHeader, 'family_session')
  if (!token) return unauthorized()

  const sess = await db
    .prepare(
      `SELECT member_no
       FROM family_sessions
       WHERE token = ? AND expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ member_no: string }>()

  if (!sess) return unauthorized()

  const memberNo = sess.member_no

  /* ════════════════════════════════════════════════════════════
   * 步 2 + 3：主樹計算（委託 resolvePrimaryTree）
   *
   * 移除段落：原本「步 2 查節點 + familyIds 去重 + 步 3 主樹三段判斷」
   * 已整體搬入 _resolvePrimaryTree.ts，此處改為直接呼叫。
   * ════════════════════════════════════════════════════════════ */
  const pt = await resolvePrimaryTree(db, memberNo)

  if (pt === null) {
    /* session 有效但無對應 node（未完成 setup）→ 視為未登入 */
    return unauthorized()
  }

  return {
    ok:              true,
    memberNo,
    primaryFamilyId: pt.primaryFamilyId,
    primaryMemberId: pt.primaryMemberId,
    familyIds:       pt.familyIds,
  }
}
