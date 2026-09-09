/**
 * POST /api/family/login — 熟客電話 + 密碼登入
 *
 * ════════════════════════════════════════════════════════════
 * 安全鐵律：
 *   - 唔信前端傳嘅任何 node id / member_no；由 DB phone 查出本人 node
 *   - 密碼用 PBKDF2-SHA256 constant-time verify，唔存明文
 *   - 回應絕不含 password_hash 或任何敏感欄位
 *   - 錯誤訊息唔分開講「電話」還係「密碼」錯（防列舉）
 * ════════════════════════════════════════════════════════════
 *
 * 收 body：
 *   { phone: string, password: string }
 *
 * phone normalize（同 setup.ts 一套）：
 *   去非數字 → 去 852/+852 前綴 → 留最後 8 位 → 須恰好 8 位數字
 *
 * 分支：
 *   A. 搵唔到 node，或搵到但 password_hash NULL/空
 *      → 首次未設定：200 { ok: true, needs_setup: true }，唔種 cookie
 *   B. 搵到 node 且有 password_hash
 *      B-ok. verify 通過 → 生成 token、INSERT family_sessions、種 cookie
 *            → 200 { ok: true, needs_setup: false, member_no }
 *      B-ng. verify 失敗 → 401 { ok: false, error: '電話或密碼錯誤' }
 *   C. node 有 password_hash 但 coeldery85_member_id 為 NULL（理論異常）
 *      → 401 同上訊息 + log
 *
 * Cookie flags（照抄 session.ts buildSetCookieHeader）：
 *   HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
 *   唔設 domain → host-only
 *
 * 錯誤：
 *   400  欄位不合格（phone 格式錯、password 空）
 *   401  密碼錯 / node 異常（統一訊息，防列舉）
 *   500  DB 錯（記 log）
 *
 * Cloudflare Pages Function — edge runtime（Web Crypto 可用）
 * binding: DB (D1)
 */

import type { Env } from '../_types'

/* ── session 有效期：30 日（同 session.ts）── */
const SESSION_DAYS = 30

/* ────────────────────────────────────────────────────────────
 * makeToken — 64-char hex token（256-bit random）
 * 照抄 session.ts makeToken，自己複製一份，唔 import session.ts
 * ──────────────────────────────────────────────────────────── */
function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ────────────────────────────────────────────────────────────
 * sessionExpiry — 計算 expires_at（SQLite datetime 格式）
 * 照抄 session.ts sessionExpiry
 * ──────────────────────────────────────────────────────────── */
function sessionExpiry(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

/* ────────────────────────────────────────────────────────────
 * buildSetCookieHeader — 組裝 Set-Cookie header value
 * 照抄 session.ts buildSetCookieHeader（HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000）
 * 唔設 domain → host-only
 * ──────────────────────────────────────────────────────────── */
function buildSetCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 3600  // 2592000 秒
  return [
    `family_session=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
    // ⚠️ 刻意唔設 Domain → host-only，只對當前 host 有效
  ].join('; ')
}

/* ────────────────────────────────────────────────────────────
 * normalizePhone — 同 setup.ts 一套 normalize 邏輯
 *   去非數字 → 去 852 前綴 → 留最後 8 位 → 必須恰好 8 位數字
 *
 * 回傳 normalize 後 8 位字串；格式唔合回 null
 * ──────────────────────────────────────────────────────────── */
function normalizePhone(raw: string): string | null {
  /* 1. 只保留數字 */
  let norm = raw.replace(/\D/g, '')
  /* 2. 去 852 前綴（+852 已被上一步變成 852）*/
  if (norm.startsWith('852')) {
    norm = norm.slice(3)
  }
  /* 3. 留最後 8 位（防帶國碼卻非 852 嘅情況）*/
  if (norm.length > 8) {
    norm = norm.slice(-8)
  }
  /* 4. 必須恰好 8 位純數字 */
  if (!/^\d{8}$/.test(norm)) return null
  return norm
}

/* ────────────────────────────────────────────────────────────
 * verifyPassword — PBKDF2-SHA256 constant-time verify
 *
 * 存格式：pbkdf2$<iterations>$<saltHex>$<hashHex>
 *
 * 步驟：
 *   1. 拆出 iterations、saltHex、hashHex
 *   2. saltHex → Uint8Array
 *   3. import 輸入密碼為 key material
 *   4. PBKDF2-SHA256，同一 salt + iterations，derive 32 bytes
 *   5. 將 derived hex 同 stored hashHex 做 constant-time 比對
 *      （逐字元 XOR 累加，唔好一唔同就 return，防 timing attack）
 *
 * 回傳 true = 通過，false = 錯
 * ──────────────────────────────────────────────────────────── */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  /* 1. 拆格式 pbkdf2$<iter>$<saltHex>$<hashHex> */
  const parts = storedHash.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = parseInt(parts[1], 10)
  const saltHex    = parts[2]
  const hashHex    = parts[3]

  if (!Number.isInteger(iterations) || iterations <= 0) return false
  if (saltHex.length === 0 || hashHex.length === 0)    return false

  /* 2. saltHex → Uint8Array */
  const saltArr = new Uint8Array(saltHex.length / 2)
  for (let i = 0; i < saltArr.length; i++) {
    saltArr[i] = parseInt(saltHex.slice(i * 2, i * 2 + 2), 16)
  }

  /* 3. import 輸入密碼為 PBKDF2 key material */
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )

  /* 4. PBKDF2-SHA256，同一 salt + iterations，derive 32 bytes */
  const derived = await crypto.subtle.deriveBits(
    {
      name:       'PBKDF2',
      salt:       saltArr,
      iterations,
      hash:       'SHA-256',
    },
    keyMaterial,
    32 * 8,   // 256 bits
  )

  /* 5. hex 化 derived bytes */
  const derivedHex = Array.from(new Uint8Array(derived))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  /* 6. Constant-time 比對（逐字元 XOR 累加，唔好一唔同就 return）
   *    長度唔同時補 0x00 XOR 非零 → diff 一定非零
   */
  const len = Math.max(derivedHex.length, hashHex.length)
  let diff  = 0
  for (let i = 0; i < len; i++) {
    const a = i < derivedHex.length ? derivedHex.charCodeAt(i) : 0
    const b = i < hashHex.length    ? hashHex.charCodeAt(i)    : 0
    diff |= (a ^ b)
  }
  return diff === 0
}

/* ════════════════════════════════════════════════════════════
 * Main handler
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB

  /* ── 解析 request body ── */
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json(
      { ok: false, error: '無效的 JSON 格式' },
      { status: 400 },
    )
  }

  /* ── 驗證 phone ── */
  const phoneRaw = body.phone
  if (!phoneRaw || typeof phoneRaw !== 'string') {
    return Response.json(
      { ok: false, error: '電話格式錯誤' },
      { status: 400 },
    )
  }
  const phone = normalizePhone(phoneRaw)
  if (!phone) {
    return Response.json(
      { ok: false, error: '電話格式錯誤' },
      { status: 400 },
    )
  }

  /* ── 驗證 password（只需非空；長度由 hash verify 負責）── */
  const passwordRaw = body.password
  if (!passwordRaw || typeof passwordRaw !== 'string' || passwordRaw.trim() === '') {
    return Response.json(
      { ok: false, error: 'password 為必填' },
      { status: 400 },
    )
  }
  const password = passwordRaw  // 唔 trim，密碼允許空白字元

  /* ── 查本人 node（靠 phone，唔信前端傳嘅 id）── */
  try {
    const node = await db
      .prepare(
        `SELECT id, password_hash, coeldery85_member_id
         FROM members
         WHERE phone = ? AND member_kind = 'person'
         LIMIT 1`
      )
      .bind(phone)
      .first<{
        id:                   string
        password_hash:        string | null
        coeldery85_member_id: string | null
      }>()

    /* ── A. 搵唔到 node 或 password_hash NULL/空 → 首次未設定 ── */
    if (!node || !node.password_hash) {
      return Response.json(
        { ok: true, needs_setup: true },
        { status: 200 },
      )
    }

    /* ── B. 搵到 node 且有 password_hash → 熟客，verify 密碼 ── */

    /* 保險：coeldery85_member_id 不應為 NULL；若係 → 異常，401 + log */
    if (!node.coeldery85_member_id) {
      console.error(
        `[family/login] node ${node.id} 有 password_hash 但 coeldery85_member_id 為 NULL` +
        `（phone=${phone}）— 資料異常`
      )
      return Response.json(
        { ok: false, error: '電話或密碼錯誤' },
        { status: 401 },
      )
    }

    /* PBKDF2 verify */
    let ok: boolean
    try {
      ok = await verifyPassword(password, node.password_hash)
    } catch (e) {
      console.error('[family/login] verifyPassword 拋出異常:', e)
      return Response.json(
        { ok: false, error: '伺服器錯誤，請稍後再試' },
        { status: 500 },
      )
    }

    /* B-ng. verify 失敗 → 401（訊息唔分開電話/密碼，防列舉）*/
    if (!ok) {
      return Response.json(
        { ok: false, error: '電話或密碼錯誤' },
        { status: 401 },
      )
    }

    /* B-ok. verify 通過 → 生成 token、INSERT family_sessions、種 cookie */
    const memberNo  = node.coeldery85_member_id
    const token     = makeToken()
    const expiresAt = sessionExpiry(SESSION_DAYS)

    await db
      .prepare(
        `INSERT INTO family_sessions (token, member_no, expires_at)
         VALUES (?, ?, ?)`
      )
      .bind(token, memberNo, expiresAt)
      .run()

    console.log(`[family/login] 登入成功（phone=${phone}，member_no=${memberNo}）`)

    return new Response(
      JSON.stringify({
        ok:          true,
        needs_setup: false,
        member_no:   memberNo,
      }),
      {
        status:  200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie':   buildSetCookieHeader(token),
        },
      },
    )

  } catch (e) {
    console.error('[family/login] DB 操作失敗:', e)
    return Response.json(
      { ok: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 },
    )
  }
}
