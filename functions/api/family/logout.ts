/**
 * POST /api/family/logout — 清除 family_session cookie
 *
 * 職責：
 *   1. 讀 family_session cookie（原生 Web API，無 hono/cookie dependency）
 *   2. 若 token 存在 → DELETE family_sessions WHERE token=?（即使已過期也清）
 *   3. 回傳 Set-Cookie 清除 cookie（Max-Age=0, expires past）
 *   4. 始終回 { ok: true }（唔論有冇 session，logout 操作係冪等的）
 *
 * Cookie 清除方式（原生 Web API）：
 *   Set-Cookie: family_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'

/* ── 從 Cookie header string parse 出指定 cookie 值 ── */
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

/* ── 組裝清除 cookie 的 Set-Cookie header value ── */
function buildClearCookieHeader(): string {
  return [
    'family_session=',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
    // 同種 cookie 時一樣唔設 Domain（host-only）
  ].join('; ')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  /* ── 1. 讀 cookie（原生 Request.headers.get）── */
  const cookieHeader = ctx.request.headers.get('cookie')
  const token        = parseCookieValue(cookieHeader, 'family_session')

  /* ── 2. 有 token 就 DELETE（無論是否過期，logout 直接清）── */
  if (token) {
    await ctx.env.DB
      .prepare('DELETE FROM family_sessions WHERE token = ?')
      .bind(token)
      .run()
  }

  /* ── 3. 清除 cookie + 回 ok ── */
  return new Response(
    JSON.stringify({ ok: true }),
    {
      status:  200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie':   buildClearCookieHeader(),
      },
    }
  )
}
