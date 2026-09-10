/**
 * /api/family/profile
 *   PATCH — 改暱稱（member_auth.nickname）
 *   POST  — 改密碼（驗舊密碼 → 寫新 PBKDF2 hash）
 * 兩者都需要有效 family_session cookie（member_no 由 session 取，前端不可覆蓋）。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'
import { hashPassword, verifyPassword } from './_password'

/* ── 從 Cookie header 解析指定 cookie 值 ── */
function parseCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const prefix = `${name}=`
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length)
  }
  return undefined
}

/** 由 session cookie 取 member_no；無效 → null */
async function currentMemberNo(ctx: EventContext<Env, string, unknown>): Promise<string | null> {
  const token = parseCookieValue(ctx.request.headers.get('cookie'), 'family_session')
  if (!token) return null
  const sess = await ctx.env.DB
    .prepare(`SELECT member_no FROM family_sessions WHERE token = ? AND expires_at > datetime('now')`)
    .bind(token)
    .first<{ member_no: string }>()
  return sess?.member_no ?? null
}

/* ════════════════════════════════════════════════════════════
 * PATCH — 改暱稱
 * ════════════════════════════════════════════════════════════ */
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const memberNo = await currentMemberNo(ctx)
  if (!memberNo) return Response.json({ ok: false, error: '請先登入' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const nicknameRaw = body.nickname
  if (typeof nicknameRaw !== 'string' || !nicknameRaw.trim())
    return Response.json({ ok: false, error: '暱稱不可為空' }, { status: 400 })
  const nickname = nicknameRaw.trim()

  const auth = await ctx.env.DB
    .prepare('SELECT member_no FROM member_auth WHERE member_no = ?')
    .bind(memberNo).first<{ member_no: string }>()
  if (!auth)
    return Response.json({ ok: false, error: '尚未完成首次設定' }, { status: 404 })

  await ctx.env.DB
    .prepare(`UPDATE member_auth SET nickname = ?, updated_at = datetime('now') WHERE member_no = ?`)
    .bind(nickname, memberNo).run()

  return Response.json({ ok: true, nickname })
}

/* ════════════════════════════════════════════════════════════
 * POST — 改密碼
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const memberNo = await currentMemberNo(ctx)
  if (!memberNo) return Response.json({ ok: false, error: '請先登入' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const oldPw = body.old_password
  const newPw = body.new_password
  if (typeof oldPw !== 'string' || oldPw === '')
    return Response.json({ ok: false, error: '請輸入舊密碼' }, { status: 400 })
  if (typeof newPw !== 'string' || newPw.trim().length < 8)
    return Response.json({ ok: false, error: '新密碼至少 8 個字元' }, { status: 400 })

  const auth = await ctx.env.DB
    .prepare('SELECT password_hash FROM member_auth WHERE member_no = ?')
    .bind(memberNo).first<{ password_hash: string }>()
  if (!auth)
    return Response.json({ ok: false, error: '尚未完成首次設定' }, { status: 404 })

  const passOk = await verifyPassword(oldPw, auth.password_hash)
  if (!passOk)
    return Response.json({ ok: false, error: '舊密碼錯誤' }, { status: 401 })

  const newHash = await hashPassword(newPw)
  await ctx.env.DB
    .prepare(`UPDATE member_auth SET password_hash = ?, updated_at = datetime('now') WHERE member_no = ?`)
    .bind(newHash, memberNo).run()

  return Response.json({ ok: true })
}
