/**
 * POST /api/family/setup-with-session — 靠 session cookie 首次設定密碼（PWA 自身登入憑證）
 *
 * ════════════════════════════════════════════════════════════
 * 架構（乙-1，rules §18 / §20）：
 *   密碼、暱稱屬「人身認證資料」，以 member_no 為 key，存 member_auth 表
 *   （per-member_no，一人一條，不論屬多少棵樹）。
 *   絕不寫入 members(node) 表 —— 一人多樹會 desync。
 *
 * member_no 從 family_sessions 取得，完全唔需要電話驗證。
 *
 * 安全鐵律：
 *   - 必須有有效 family_session cookie（唔接受 unauthenticated 請求）
 *   - member_no 100% 從 session 取，前端唔可覆蓋
 *   - 密碼用 PBKDF2-SHA256 hash 後才存，絕不存明文
 *   - 回應唔含 password_hash 或任何敏感欄位
 * ════════════════════════════════════════════════════════════
 *
 * 收 body：{ password: string, nickname: string, birth_date: string (YYYY-MM-DD) }
 *   （唔需要 phone，member_no 由 session 取）
 *
 * 核心流程：
 *   1. 讀 family_session cookie → 查 family_sessions → 取 member_no（無效 → 401）
 *   2. 驗欄位（password / nickname / birth_date）
 *   3. 查 member_auth（member_no）：
 *      - 已存在 → 409（已設定，改用登入）
 *      - 不存在 → INSERT member_auth（password_hash + nickname）
 *   4. birth_date：若該 member 有 node 且 node.birth_date 為空，順帶補上（顯示屬性，可有可無）
 *   5. 種新 family_session cookie（刷新有效期，SESSION_DAYS）
 *   6. 回 { ok: true }
 *
 * 回應（200）：{ ok: true } + Set-Cookie（刷新 session）
 *
 * 錯誤：
 *   400  欄位不合格
 *   401  冇有效 session cookie
 *   409  member_auth 已存在（已完成 setup，改用 /api/family/login）
 *   500  DB 錯
 *
 * Cloudflare Pages Function — edge runtime（Web Crypto 可用）
 * binding: DB (D1)
 */

import type { Env } from '../_types'
import { hashPassword } from './_password'

/* ════════════════════════════════════════════════════════════
 * session helpers（與 session.ts / setup.ts 同款，唔 cross-import）
 * ════════════════════════════════════════════════════════════ */
const SESSION_DAYS = 30

function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

function sessionExpiry(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

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

/* ── 從 Cookie header 解析指定 cookie 值 ── */
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
 * hashPassword 已抽出至 _password.ts（共用）
 * ════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
 * Main handler
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB

  /* ── 1. 讀 family_session cookie → 查 family_sessions → 取 member_no ── */
  const cookieHeader = ctx.request.headers.get('cookie')
  const sessionToken = parseCookieValue(cookieHeader, 'family_session')

  if (!sessionToken) {
    return Response.json({ ok: false, error: '請先登入' }, { status: 401 })
  }

  const sess = await db
    .prepare(
      `SELECT member_no
       FROM family_sessions
       WHERE token = ? AND expires_at > datetime('now')`
    )
    .bind(sessionToken)
    .first<{ member_no: string }>()

  if (!sess) {
    return Response.json({ ok: false, error: '請先登入' }, { status: 401 })
  }

  const memberNo = sess.member_no

  /* ── 2. 解析 request body ── */
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 })
  }

  /* ── 3. 驗證欄位 ── */

  /* password — trim 後 ≥ 8 位 */
  const passwordRaw = body.password
  if (!passwordRaw || typeof passwordRaw !== 'string' || passwordRaw.trim().length < 8) {
    return Response.json({ ok: false, error: '密碼至少 8 個字元' }, { status: 400 })
  }
  const password = passwordRaw.trim()

  /* nickname — trim 後非空 */
  const nicknameRaw = body.nickname
  if (!nicknameRaw || typeof nicknameRaw !== 'string' || nicknameRaw.trim() === '') {
    return Response.json({ ok: false, error: '暱稱為必填' }, { status: 400 })
  }
  const nickname = nicknameRaw.trim()

  /* birth_date — YYYY-MM-DD */
  const birthDateRaw = body.birth_date
  if (
    !birthDateRaw ||
    typeof birthDateRaw !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw.trim())
  ) {
    return Response.json({ ok: false, error: '生日格式錯誤，需為 YYYY-MM-DD' }, { status: 400 })
  }
  const birthDate = birthDateRaw.trim()

  /* ── 4. 計算 password hash ── */
  let passwordHash: string
  try {
    passwordHash = await hashPassword(password)
  } catch (e) {
    console.error('[family/setup-with-session] hashPassword 失敗:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }

  /* ── 5. 查 member_auth（member_no 為 key）── */
  try {
    const existing = await db
      .prepare(`SELECT member_no FROM member_auth WHERE member_no = ?`)
      .bind(memberNo)
      .first<{ member_no: string }>()

    /* 已有 auth → 已完成 setup，唔准重覆（改用 login）*/
    if (existing) {
      return Response.json(
        { ok: false, error: '此帳號已完成設定，請使用密碼登入' },
        { status: 409 },
      )
    }

    /* ── 6. INSERT member_auth ── */
    await db
      .prepare(
        `INSERT INTO member_auth (member_no, password_hash, nickname, updated_at)
         VALUES (?, ?, ?, datetime('now'))`
      )
      .bind(memberNo, passwordHash, nickname)
      .run()

    /* ── 7. birth_date：若該 member 有 node 且 birth_date 為空，順帶補（顯示屬性，可選）── */
    await db
      .prepare(
        `UPDATE members
         SET birth_date = ?
         WHERE coeldery85_member_id = ? AND member_kind = 'person'
           AND (birth_date IS NULL OR birth_date = '')`
      )
      .bind(birthDate, memberNo)
      .run()

    console.log(`[family/setup-with-session] member_auth 已建立（memberNo=${memberNo}）`)

    /* ── 8. 刷新 family_session（種新 token）── */
    const newSessionToken = makeToken()
    const expiresAt       = sessionExpiry(SESSION_DAYS)

    await db
      .prepare(
        `INSERT INTO family_sessions (token, member_no, expires_at)
         VALUES (?, ?, ?)`
      )
      .bind(newSessionToken, memberNo, expiresAt)
      .run()

    /* ── 9. 回應（帶 Set-Cookie）── */
    return new Response(
      JSON.stringify({ ok: true }),
      {
        status:  200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie':   buildSetCookieHeader(newSessionToken),
        },
      },
    )
  } catch (e) {
    console.error('[family/setup-with-session] DB 操作失敗:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }
}
