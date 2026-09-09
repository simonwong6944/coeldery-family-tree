/**
 * POST /api/family/setup-with-session — 靠 session cookie 首次設定（密碼 + 暱稱 + 生日）
 *
 * ════════════════════════════════════════════════════════════
 * 此 endpoint 係給「經 handoff token 入嚟、已有 family_session cookie」嘅用戶用。
 * member_no 從 family_sessions 取得，完全唔需要電話驗證。
 *
 * 原有 POST /api/family/setup（靠電話 + 85AI lookup）繼續存在，兩者互不干擾。
 *
 * 安全鐵律：
 *   - 必須有有效嘅 family_session cookie（唔接受 unauthenticated 請求）
 *   - member_no 100% 從 session 取，前端唔可覆蓋
 *   - 密碼用 PBKDF2-SHA256 hash 後才存，絕不存明文
 *   - 回應唔含 password_hash 或任何敏感欄位
 * ════════════════════════════════════════════════════════════
 *
 * 收 body：
 *   { password: string, nickname: string, birth_date: string (YYYY-MM-DD) }
 *   （唔需要 phone，member_no 由 session 取）
 *
 * 核心流程：
 *   1. 讀 family_session cookie → 查 family_sessions → 取 member_no（無效 → 401）
 *   2. 驗欄位（password / nickname / birth_date）
 *   3. 用 member_no 查 members（coeldery85_member_id = member_no, member_kind='person'）：
 *      A. 搵到 → 若已有 password_hash → 409（已設定，改用登入）
 *                 → UPDATE password_hash, nickname, birth_date
 *      B. 搵唔到 → 此 member 未被加入任何樹，唔允許自建（403）
 *         （setup-with-session 唔建新 family；建新 family 走原有 setup 電話路徑）
 *   4. 種新 family_session cookie（刷新有效期，SESSION_DAYS）
 *   5. 回 { ok: true, member_id, family_id }
 *
 * 回應（200）：
 *   { ok: true, member_id, family_id }  + Set-Cookie（刷新 session）
 *
 * 錯誤：
 *   400  欄位不合格（password / nickname / birth_date）
 *   401  冇有效 session cookie
 *   403  此會員未被加入任何家族樹（需要管理員先加）
 *   409  已有 password_hash（已完成 setup，改用 /api/family/login）
 *   500  DB 錯
 *
 * Cloudflare Pages Function — edge runtime（Web Crypto 可用）
 * binding: DB (D1)
 */

import type { Env } from '../_types'

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
 * hashPassword — PBKDF2-SHA256（與 setup.ts 完全一致）
 * 格式：pbkdf2$100000$<saltHex>$<hashHex>
 * ════════════════════════════════════════════════════════════ */
async function hashPassword(password: string): Promise<string> {
  const ITERATIONS = 100_000
  const HASH_BYTES = 32

  const saltArr = new Uint8Array(16)
  crypto.getRandomValues(saltArr)
  const saltHex = Array.from(saltArr).map(b => b.toString(16).padStart(2, '0')).join('')

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )

  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltArr, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8,
  )

  const hashHex = Array.from(new Uint8Array(derived))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `pbkdf2$${ITERATIONS}$${saltHex}$${hashHex}`
}

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

  /* ── 5. 查 node（靠 coeldery85_member_id）── */
  try {
    const node = await db
      .prepare(
        `SELECT id, family_id, password_hash
         FROM members
         WHERE coeldery85_member_id = ? AND member_kind = 'person'
         LIMIT 1`
      )
      .bind(memberNo)
      .first<{ id: string; family_id: string; password_hash: string | null }>()

    /* 搵唔到 node → 此會員未被加入任何家族樹 */
    if (!node) {
      console.warn(`[family/setup-with-session] memberNo=${memberNo} 未有對應 node，拒絕 setup`)
      return Response.json(
        { ok: false, error: '此會員尚未被加入任何家族樹，請聯絡家族管理員' },
        { status: 403 },
      )
    }

    /* 已有 password_hash → 已完成 setup，唔准重覆（改用 login）*/
    if (node.password_hash) {
      return Response.json(
        { ok: false, error: '此帳號已完成設定，請使用密碼登入' },
        { status: 409 },
      )
    }

    /* ── 6. UPDATE password_hash, nickname, birth_date ── */
    await db
      .prepare(
        `UPDATE members
         SET password_hash = ?, nickname = ?, birth_date = ?
         WHERE id = ?`
      )
      .bind(passwordHash, nickname, birthDate, node.id)
      .run()

    console.log(
      `[family/setup-with-session] 已設定 member ${node.id}（memberNo=${memberNo}）`
    )

    /* ── 7. 刷新 family_session（種新 token，舊 token 可繼續用直到過期）── */
    const newSessionToken = makeToken()
    const expiresAt       = sessionExpiry(SESSION_DAYS)

    await db
      .prepare(
        `INSERT INTO family_sessions (token, member_no, expires_at)
         VALUES (?, ?, ?)`
      )
      .bind(newSessionToken, memberNo, expiresAt)
      .run()

    /* ── 8. 回應（帶 Set-Cookie）── */
    return new Response(
      JSON.stringify({ ok: true, member_id: node.id, family_id: node.family_id }),
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
