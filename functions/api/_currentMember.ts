/**
 * _currentMember — 共用 helper
 *
 * 漸進式乙方案：session-first，fallback 返 is_self
 *
 * ── 優先路徑（有 family_session cookie）──
 *   1. 從 request Cookie header 讀 family_session token
 *   2. 查 family_sessions WHERE token=? AND expires_at > datetime('now')
 *   3. 搵到: 直接用 local_family_id + local_member_id 回傳（唔需要額外 JOIN）
 *   4. 搵唔到 / token 無效 / 過期: fallback 返 is_self 路徑
 *
 * ── Fallback 路徑（冇 cookie 或 session 無效）——現有行為完全不變 ──
 *   1. SELECT 最早建立的 family（created_at ASC LIMIT 1）
 *   2. 喺該 family 找 is_self = 1 成員
 *   3. 搵唔到 family → 409
 *   4. 搵唔到 is_self member → 409
 *
 * ── 向後兼容設計 ──
 *   - request 係 OPTIONAL 參數（request?: Request）
 *   - 所有現有 call site 只傳 db，一個都唔需要改
 *   - 冇傳 request = 唔可能有 cookie = 直接走 fallback
 *   - Task I-2 才逐個 call site 傳 ctx.request 通電
 *
 * 回傳格式：
 *   { ok: true,  familyId: string, memberId: string }   — 成功
 *   { ok: false, response: Response }                    — 失敗（已含 status / JSON）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

export type CurrentMemberOk = {
  ok: true
  familyId: string
  memberId: string
}

export type CurrentMemberErr = {
  ok: false
  response: Response
}

export type CurrentMemberResult = CurrentMemberOk | CurrentMemberErr

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
 * @param request - 原生 Request（可選）；傳入才能讀 cookie，冇傳直接走 is_self fallback
 *
 * ⚠️  request 係 optional：所有現有 call site（14 個）只傳 db 即可，行為完全不變。
 *     Task I-2 才逐個傳 request 啟用 session 路徑。
 */
export async function getCurrentMember(
  db: D1Database,
  request?: Request,
): Promise<CurrentMemberResult> {

  /* ════════════════════════════════════════════════════════════
   * 優先路徑：有 request → 嘗試讀 family_session cookie
   * ════════════════════════════════════════════════════════════ */
  if (request) {
    const cookieHeader = request.headers.get('cookie')
    const token        = parseCookieValue(cookieHeader, 'family_session')

    if (token) {
      /* 查 DB（同時檢查 token 存在 + 未過期）*/
      const sess = await db
        .prepare(
          `SELECT local_member_id, local_family_id
           FROM family_sessions
           WHERE token = ? AND expires_at > datetime('now')`
        )
        .bind(token)
        .first<{ local_member_id: string; local_family_id: string }>()

      if (sess) {
        /* ✅ 有效 session → 直接回真身份，唔走 is_self fallback */
        return {
          ok:       true,
          familyId: sess.local_family_id,
          memberId: sess.local_member_id,
        }
      }
      /* session 過期 / token 無效 → fall through 到 is_self fallback */
    }
  }

  /* ════════════════════════════════════════════════════════════
   * Fallback 路徑：is_self = 1（現有行為，完全不變）
   * 覆蓋場景：
   *   - request 未傳（現有 14 個 call site 全部如此）
   *   - 冇 family_session cookie
   *   - cookie 存在但 session 已過期 / token 無效
   * ════════════════════════════════════════════════════════════ */

  /* 1. 攞第一棵 family */
  const family = await db
    .prepare('SELECT id FROM families ORDER BY created_at ASC LIMIT 1')
    .first<{ id: string }>()

  if (!family) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: '找不到家族，請先建立成員' },
        { status: 409 }
      ),
    }
  }

  /* 2. 攞 is_self 成員 */
  const selfMember = await db
    .prepare('SELECT id FROM members WHERE family_id = ? AND is_self = 1 LIMIT 1')
    .bind(family.id)
    .first<{ id: string }>()

  if (!selfMember) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: '未設定本人，請先於成員資料設定本人' },
        { status: 409 }
      ),
    }
  }

  return {
    ok:       true,
    familyId: family.id,
    memberId: selfMember.id,
  }
}
