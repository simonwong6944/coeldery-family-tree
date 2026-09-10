/**
 * POST /api/family/login — 熟客電話 + 密碼登入（PWA 獨立登入）
 *
 * 新 flow（85AI lookup，唔再查 node 嘅 phone/password_hash）：
 *   1. 收 { phone, password }
 *   2. normalizePhone(phone) → 8 位；格式錯 → 400
 *   3. lookup85AiByPhone(apiKey, phone) 攞 memberNo
 *        - 讀唔到 FAMILY_TREE_API_KEY → 503（絕不 fallback）
 *        - 上游錯 → 502
 *        - 唔係會員 → 401 統一訊息
 *   4. SELECT password_hash FROM member_auth WHERE member_no = ?
 *        - 冇 record → 200 { ok:true, needs_setup:true }（未設密碼）
 *        - 有 record → verifyPassword
 *              通過 → makeToken + INSERT family_sessions + 種 cookie → 200 { ok:true, needs_setup:false, member_no }
 *              失敗 → 401 { ok:false, error:'電話或密碼錯誤' }
 *
 * Cookie / 錯誤碼 / helper 全部照舊。
 */

import type { Env } from '../_types'
import { lookup85AiByPhone } from './_lookup85ai'

/* session 有效期：30 日（同 enter.ts / setup-with-session.ts） */
const SESSION_DAYS = 30

/* ── makeToken：64-char hex（256-bit random）── */
function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ── sessionExpiry：SQLite datetime 格式 ── */
function sessionExpiry(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

/* ── buildSetCookieHeader：host-only cookie ── */
function buildSetCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 3600  // 2592000 秒
  return [
    `family_session=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
    // ⚠️ 刻意唔設 Domain → host-only
  ].join('; ')
}

/* ── normalizePhone：同 setup.ts 一套 ── */
function normalizePhone(raw: string): string | null {
  let norm = raw.replace(/\D/g, '')
  if (norm.startsWith('852')) norm = norm.slice(3)
  if (norm.length > 8) norm = norm.slice(-8)
  if (!/^\d{8}$/.test(norm)) return null
  return norm
}

/* ── verifyPassword：PBKDF2-SHA256 constant-time ── */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = parseInt(parts[1], 10)
  const saltHex    = parts[2]
  const hashHex    = parts[3]

  if (!Number.isInteger(iterations) || iterations <= 0) return false
  if (saltHex.length === 0 || hashHex.length === 0)     return false

  const saltArr = new Uint8Array(saltHex.length / 2)
  for (let i = 0; i < saltArr.length; i++) {
    saltArr[i] = parseInt(saltHex.slice(i * 2, i * 2 + 2), 16)
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )

  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltArr, iterations, hash: 'SHA-256' },
    keyMaterial,
    32 * 8,
  )

  const derivedHex = Array.from(new Uint8Array(derived))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // constant-time 比對
  const len = Math.max(derivedHex.length, hashHex.length)
  let diff = 0
  for (let i = 0; i < len; i++) {
    const a = i < derivedHex.length ? derivedHex.charCodeAt(i) : 0
    const b = i < hashHex.length    ? hashHex.charCodeAt(i)    : 0
    diff |= (a ^ b)
  }
  return diff === 0
}

/* ══ Main handler ══ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB

  /* ── API key（server-only，讀唔到即 503，絕不 fallback）── */
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) {
    console.error('[family/login] FAMILY_TREE_API_KEY missing')
    return Response.json(
      { ok: false, error: '伺服器設定錯誤' },
      { status: 503 },
    )
  }

  /* ── 解析 body ── */
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 })
  }

  /* ── 驗 phone ── */
  const phoneRaw = body.phone
  if (!phoneRaw || typeof phoneRaw !== 'string') {
    return Response.json({ ok: false, error: '電話格式錯誤' }, { status: 400 })
  }
  const phone = normalizePhone(phoneRaw)
  if (!phone) {
    return Response.json({ ok: false, error: '電話格式錯誤' }, { status: 400 })
  }

  /* ── 驗 password（只需非空；長度由 hash verify 負責）── */
  const passwordRaw = body.password
  if (!passwordRaw || typeof passwordRaw !== 'string' || passwordRaw.trim() === '') {
    return Response.json({ ok: false, error: 'password 為必填' }, { status: 400 })
  }
  const password = passwordRaw  // 唔 trim，密碼允許空白字元

  /* ── 用 85AI lookup 攞 member_no（唔再查 node.phone）── */
  const lk = await lookup85AiByPhone(apiKey, phone)
  if (!lk.ok) {
    // 上游錯 / 網絡錯 → 502
    console.error('[family/login] 85AI lookup failed', lk.httpStatus)
    return Response.json({ ok: false, error: '家族樹服務暫時不可用' }, { status: 502 })
  }
  if (!lk.isMember) {
    // 唔係會員 → 統一 401（唔洩露「電話存唔存在」）
    return Response.json({ ok: false, error: '電話或密碼錯誤' }, { status: 401 })
  }
  const memberNo = lk.memberNo

  /* ── 查 member_auth ── */
  try {
    const auth = await db
      .prepare(`SELECT password_hash FROM member_auth WHERE member_no = ? LIMIT 1`)
      .bind(memberNo)
      .first<{ password_hash: string | null }>()

    /* ── A. 冇 record 或 hash 空 → 未設密碼，行 setup ── */
    if (!auth || !auth.password_hash) {
      return Response.json({ ok: true, needs_setup: true }, { status: 200 })
    }

    /* ── B. verify 密碼 ── */
    const pass = await verifyPassword(password, auth.password_hash)
    if (!pass) {
      return Response.json({ ok: false, error: '電話或密碼錯誤' }, { status: 401 })
    }

    /* ── 通過 → 種 session ── */
    const token = makeToken()
    const expiresAt = sessionExpiry(SESSION_DAYS)
    await db
      .prepare(`INSERT INTO family_sessions (token, member_no, expires_at) VALUES (?, ?, ?)`)
      .bind(token, memberNo, expiresAt)
      .run()

    return new Response(
      JSON.stringify({ ok: true, needs_setup: false, member_no: memberNo }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': buildSetCookieHeader(token),
        },
      },
    )
  } catch (err) {
    console.error('[family/login] DB error', err)
    return Response.json({ ok: false, error: '伺服器錯誤' }, { status: 500 })
  }
}
