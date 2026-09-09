/**
 * POST /api/family/enter — 接收 85AI handoff token，驗後種 family_session cookie
 *
 * ════════════════════════════════════════════════════════════
 * 安全鐵律：
 *   1. 只信 HMAC-SHA256 簽名 token，完全唔讀 ?member= 或其他明文身份參數
 *   2. token 驗失敗（簽名錯 / 過期 / 格式錯）→ 401，唔 fallback，唔種 cookie
 *   3. FAMILY_TREE_API_KEY 只在 server 側讀取，絕不出現喺 response body / log
 * ════════════════════════════════════════════════════════════
 *
 * 流程：
 *   1. 讀 request body { token: string }
 *   2. 讀 FAMILY_TREE_API_KEY（未設定 → 503）
 *   3. 呼叫 verifyHandoffToken → 失敗 → 401
 *   4. 用 memberNo 查 members（coeldery85_member_id = memberNo, member_kind='person'）
 *      - 搵到 → 檢查 password_hash（有 → needs_setup:false；無 → needs_setup:true）
 *      - 搵唔到 → needs_setup:true（此會員未被加入任何家族樹，需要 setup）
 *   5. 生成 family_sessions token（SESSION_DAYS，沿用 session.ts 機制）
 *   6. 種 family_session cookie，回 { ok:true, needs_setup:boolean }
 *
 * 注意：needs_setup:true 時，用戶係以 member_no 記咗喺 session。
 *   後續 setup 流程（POST /api/family/setup-with-session）靠 session cookie 認人，
 *   唔需要再提供電話。
 *
 * 回應：
 *   200  { ok: true, needs_setup: boolean }  + Set-Cookie
 *   400  body 格式錯 / token 欄位缺失
 *   401  token 驗失敗（簽名錯 / 已過期 / 格式錯）
 *   503  FAMILY_TREE_API_KEY 未設定
 *   500  DB 錯
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 * secret:  FAMILY_TREE_API_KEY
 */

import type { Env }                from '../_types'
import { verifyHandoffToken }      from './_verifyHandoff'

/* ── session 有效期：30 日（SESSION_DAYS，唔准 hardcode 其他值）── */
const SESSION_DAYS = 30

/* ── 生成 64-char hex token（256-bit random）── */
function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ── 計算 expires_at（SQLite datetime 格式：YYYY-MM-DD HH:MM:SS）── */
function sessionExpiry(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

/* ── 組裝 Set-Cookie header value（host-only，唔設 Domain）── */
function buildSetCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 3600  // 2592000 秒
  return [
    `family_session=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
    // ⚠️ 刻意唔設 Domain → host-only，只對 family.coeldery85.com 有效
  ].join('; ')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  /* ── 1. 讀 FAMILY_TREE_API_KEY（讀唔到 → 503）── */
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) {
    console.error('[family/enter] FAMILY_TREE_API_KEY 未設定')
    return Response.json(
      { ok: false, error: '家族樹服務未設定，請聯絡管理員' },
      { status: 503 },
    )
  }

  /* ── 2. 解析 request body ── */
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 })
  }

  const tokenRaw = body.token
  if (!tokenRaw || typeof tokenRaw !== 'string' || tokenRaw.trim() === '') {
    return Response.json({ ok: false, error: 'token 為必填' }, { status: 400 })
  }

  /* ── 3. 驗 handoff token（HMAC-SHA256 + exp）── */
  const verifyResult = await verifyHandoffToken(tokenRaw.trim(), apiKey)

  if (!verifyResult.ok) {
    /* 驗失敗：唔洩露具體原因，一律 401 */
    return Response.json({ ok: false, error: '無效或已過期的存取憑證' }, { status: 401 })
  }

  const { memberNo } = verifyResult
  const db = ctx.env.DB

  /* ── 4. 查 members（靠 coeldery85_member_id）── */
  let needsSetup = true  // 保守預設

  try {
    const node = await db
      .prepare(
        `SELECT id, password_hash
         FROM members
         WHERE coeldery85_member_id = ? AND member_kind = 'person'
         LIMIT 1`
      )
      .bind(memberNo)
      .first<{ id: string; password_hash: string | null }>()

    if (node) {
      /* 有 password_hash → 已完成 setup；null/空 → 首次登入 */
      needsSetup = !node.password_hash
    } else {
      /* 搵唔到 node：此會員未被加入任何家族樹 → 一定係首次（needs_setup:true）*/
      console.log(`[family/enter] memberNo=${memberNo} 未有對應 node，needs_setup=true`)
    }
  } catch (e) {
    console.error('[family/enter] DB 查詢失敗:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }

  /* ── 5. 生成 family_session token + INSERT family_sessions ── */
  const sessionToken = makeToken()
  const expiresAt    = sessionExpiry(SESSION_DAYS)

  try {
    await db
      .prepare(
        `INSERT INTO family_sessions (token, member_no, expires_at)
         VALUES (?, ?, ?)`
      )
      .bind(sessionToken, memberNo, expiresAt)
      .run()
  } catch (e) {
    console.error('[family/enter] INSERT family_sessions 失敗:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }

  /* ── 6. 種 family_session cookie + 回應 ── */
  return new Response(
    JSON.stringify({ ok: true, needs_setup: needsSetup }),
    {
      status:  200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie':   buildSetCookieHeader(sessionToken),
      },
    },
  )
}
