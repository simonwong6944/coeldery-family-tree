/**
 * POST /api/family/enter — 接收 85AI handoff token，驗後種 family_session cookie
 *
 * ════════════════════════════════════════════════════════════
 * 架構（乙-1，rules §18 / §20）：
 *   needs_setup 由 member_auth（member_no 為 key）決定，唔查 node 密碼。
 *   member_auth 有此 member_no → 已設定（needs_setup:false）
 *   冇 → 首次（needs_setup:true）
 *
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
 *   4. 查 member_auth（member_no）→ 有 → needs_setup:false；冇 → needs_setup:true
 *   5. 生成 family_sessions token（SESSION_DAYS）
 *   6. 種 family_session cookie，回 { ok:true, needs_setup:boolean }
 *
 * 回應：
 *   200  { ok: true, needs_setup: boolean }  + Set-Cookie
 *   400  body 格式錯 / token 欄位缺失
 *   401  token 驗失敗
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

/* ── 計算 expires_at（SQLite datetime 格式）── */
function sessionExpiry(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

/* ── 組裝 Set-Cookie header value（host-only，唔設 Domain）── */
function buildSetCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 3600
  return [
    `family_session=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
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
    return Response.json({ ok: false, error: '無效或已過期的存取憑證' }, { status: 401 })
  }

  const { memberNo } = verifyResult
  const db = ctx.env.DB

  /* ── 4. 查 member_auth（member_no 為 key）決定 needs_setup ── */
  let needsSetup = true  // 保守預設：未設定

  try {
    const auth = await db
      .prepare(`SELECT member_no FROM member_auth WHERE member_no = ?`)
      .bind(memberNo)
      .first<{ member_no: string }>()

    /* member_auth 有此 member_no → 已完成 setup；冇 → 首次 */
    needsSetup = !auth
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
