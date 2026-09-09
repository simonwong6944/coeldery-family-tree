/**
 * GET /api/family/me — 查詢當前 session 狀態
 *
 * ════════════════════════════════════════════════════════════
 * 安全鐵律：
 *   - 回應絕不含 password_hash、phone、token 或任何敏感欄位
 *   - 401 一律回 { ok: false }，唔透露任何細節（防列舉）
 * ════════════════════════════════════════════════════════════
 *
 * 認證流程：
 *   1. 讀 Cookie header → parse family_session token
 *   2. SELECT member_no FROM family_sessions WHERE token = ? AND expires_at > datetime('now')
 *   3. 冇 cookie / 查唔到 / 過期 → 401 { ok: false }
 *   4. 有效 → 用 member_no 反查本人 node
 *
 * 分支：
 *   A. session 無效 → 401 { ok: false }
 *   B. session 有效，node 存在
 *      → 200 { ok: true, member_no, member_id, family_id, nickname, display_name }
 *   C. session 有效，但 node 未建（剛 verify 未 setup）
 *      → 200 { ok: true, member_no, member_id: null, family_id: null, nickname: null, display_name: null }
 *
 * 錯誤：
 *   401  無效 session（冇 cookie / 過期 / 查唔到）
 *   500  DB 錯（記 log）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'

/* ────────────────────────────────────────────────────────────
 * 從 Cookie header string parse 出指定 cookie 值
 * （複製 login.ts / setup.ts 同款 helper，避免 cross-import）
 * ──────────────────────────────────────────────────────────── */
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

/* ════════════════════════════════════════════════════════════
 * Main handler
 * ════════════════════════════════════════════════════════════ */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB

  /* ── 1. 讀 cookie → parse token ── */
  const cookieHeader = ctx.request.headers.get('cookie')
  const token        = parseCookieValue(cookieHeader, 'family_session')

  if (!token) {
    return Response.json({ ok: false }, { status: 401 })
  }

  try {
    /* ── 2. 查 family_sessions（含過期檢查）── */
    const sess = await db
      .prepare(
        `SELECT member_no
         FROM family_sessions
         WHERE token = ? AND expires_at > datetime('now')`
      )
      .bind(token)
      .first<{ member_no: string }>()

    /* session 不存在或已過期 → 401，唔透露細節 */
    if (!sess) {
      return Response.json({ ok: false }, { status: 401 })
    }

    const memberNo = sess.member_no

    /* ── 3. 用 member_no 反查本人 node ── */
    const node = await db
      .prepare(
        `SELECT id, family_id, nickname, display_name
         FROM members
         WHERE coeldery85_member_id = ? AND member_kind = 'person'
         LIMIT 1`
      )
      .bind(memberNo)
      .first<{
        id:           string
        family_id:    string
        nickname:     string | null
        display_name: string
      }>()

    /* ── B/C. 回應（ok 均為 true，node 未建時 id/family_id 回 null）── */
    return Response.json({
      ok:           true,
      member_no:    memberNo,
      member_id:    node?.id           ?? null,
      family_id:    node?.family_id    ?? null,
      nickname:     node?.nickname     ?? null,
      display_name: node?.display_name ?? null,
    })

  } catch (e) {
    console.error('[family/me] DB 操作失敗:', e)
    return Response.json(
      { ok: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 },
    )
  }
}
