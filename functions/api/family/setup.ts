/**
 * POST /api/family/setup — 首次登入設定（密碼 + 暱稱 + 生日）
 *
 * ════════════════════════════════════════════════════════════
 * 安全鐵律：
 *   - 認證完全靠 family_session cookie；前端傳嘅任何 id / member_no 一律唔信
 *   - 密碼用 PBKDF2-SHA256 hash 後才存；絕不存明文
 *   - 回應唔回 password_hash 或任何敏感欄位
 * ════════════════════════════════════════════════════════════
 *
 * 認證流程：
 *   1. 讀 Cookie header → parse family_session token
 *   2. SELECT member_no, expires_at FROM family_sessions WHERE token = ? AND expires_at > datetime('now')
 *   3. 冇 / 過期 → 401
 *   4. 攞到 member_no（只信 DB，唔信前端）
 *
 * 收 body：
 *   { password: string, nickname: string, birth_date: string (YYYY-MM-DD) }
 *
 * 寫入邏輯（用 member_no 認本人 node）：
 *   A. SELECT id, family_id FROM members WHERE coeldery85_member_id = ? AND member_kind = 'person'
 *      → 搵到 → UPDATE password_hash, nickname, birth_date
 *   B. 搵唔到 → 建新樹 + 開自己 node
 *      → INSERT families (id, name)
 *      → INSERT members (id, family_id, member_kind, display_name, birth_date,
 *                        coeldery85_member_id, nickname, password_hash)
 *      → phone 暫留 NULL（cookie 只有 member_no，反查唔到電話；將來由 profile 補）
 *
 * 回應（200）：
 *   { ok: true, member_id, family_id, created_new: boolean }
 *   （唔含 password_hash 或任何敏感資料）
 *
 * 錯誤：
 *   401  冇 / 過期 session
 *   400  欄位不合格（密碼 < 8、nickname 空、birth_date 格式錯）
 *   500  DB 錯（記 log）
 *
 * Cloudflare Pages Function — edge runtime（Web Crypto 可用）
 * binding: DB (D1)
 */

import type { Env } from '../_types'

/* ────────────────────────────────────────────────────────────
 * 從 Cookie header string parse 出指定 cookie 值
 * （複製 _currentMember.ts 同款 helper，避免 cross-import cycle）
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

/* ────────────────────────────────────────────────────────────
 * hashPassword — PBKDF2-SHA256，Web Crypto，edge runtime 可用
 *
 * 存格式：pbkdf2$100000$<saltHex>$<hashHex>
 *   - salt：16-byte random（crypto.getRandomValues）
 *   - iterations：100 000
 *   - derived key：32 bytes
 * ──────────────────────────────────────────────────────────── */
async function hashPassword(password: string): Promise<string> {
  const ITERATIONS = 100_000
  const HASH_BYTES = 32

  /* 1. 生成 16-byte 隨機 salt */
  const saltArr = new Uint8Array(16)
  crypto.getRandomValues(saltArr)
  const saltHex = Array.from(saltArr).map(b => b.toString(16).padStart(2, '0')).join('')

  /* 2. import key material */
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,            // not extractable
    ['deriveBits'],
  )

  /* 3. PBKDF2-SHA256，derive 32 bytes */
  const derived = await crypto.subtle.deriveBits(
    {
      name:       'PBKDF2',
      salt:       saltArr,
      iterations: ITERATIONS,
      hash:       'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8,   // length in bits
  )

  const hashHex = Array.from(new Uint8Array(derived))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  /* 4. 回傳存格式 */
  return `pbkdf2$${ITERATIONS}$${saltHex}$${hashHex}`
}

/* ────────────────────────────────────────────────────────────
 * 生成短 hex id（128-bit random，32-char hex）
 * 同 session.ts makeToken 做法；用於 families.id / members.id
 * ──────────────────────────────────────────────────────────── */
function makeId(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ════════════════════════════════════════════════════════════
 * Main handler
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB

  /* ── 認證：讀 cookie → 查 family_sessions → 攞 member_no ── */
  const cookieHeader = ctx.request.headers.get('cookie')
  const token        = parseCookieValue(cookieHeader, 'family_session')

  if (!token) {
    return Response.json(
      { ok: false, error: '未登入，請先完成身份驗證' },
      { status: 401 },
    )
  }

  /* 查 family_sessions（含過期檢查）*/
  const sess = await db
    .prepare(
      `SELECT member_no
       FROM family_sessions
       WHERE token = ? AND expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ member_no: string }>()

  if (!sess) {
    /* session 不存在 or 已過期 */
    return Response.json(
      { ok: false, error: 'session 已過期，請重新驗證' },
      { status: 401 },
    )
  }

  /* member_no 只信 DB，唔信前端 */
  const memberNo = sess.member_no

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

  /* ── 驗證欄位 ── */

  /* password */
  const passwordRaw = body.password
  if (!passwordRaw || typeof passwordRaw !== 'string' || passwordRaw.trim().length < 8) {
    return Response.json(
      { ok: false, error: '密碼至少 8 個字元' },
      { status: 400 },
    )
  }
  const password = passwordRaw.trim()

  /* nickname */
  const nicknameRaw = body.nickname
  if (!nicknameRaw || typeof nicknameRaw !== 'string' || nicknameRaw.trim() === '') {
    return Response.json(
      { ok: false, error: 'nickname 為必填' },
      { status: 400 },
    )
  }
  const nickname = nicknameRaw.trim()

  /* birth_date — 基本格式 YYYY-MM-DD */
  const birthDateRaw = body.birth_date
  if (
    !birthDateRaw ||
    typeof birthDateRaw !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw.trim())
  ) {
    return Response.json(
      { ok: false, error: 'birth_date 格式錯誤，需為 YYYY-MM-DD' },
      { status: 400 },
    )
  }
  const birthDate = birthDateRaw.trim()

  /* ── 計算 password hash（PBKDF2-SHA256）── */
  let passwordHash: string
  try {
    passwordHash = await hashPassword(password)
  } catch (e) {
    console.error('[family/setup] hashPassword 失敗:', e)
    return Response.json(
      { ok: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 },
    )
  }

  /* ── 查本人 node（靠 coeldery85_member_id = member_no）── */
  try {
    const node = await db
      .prepare(
        `SELECT id, family_id
         FROM members
         WHERE coeldery85_member_id = ? AND member_kind = 'person'
         LIMIT 1`
      )
      .bind(memberNo)
      .first<{ id: string; family_id: string }>()

    /* ── A. 搵到 node → UPDATE ── */
    if (node) {
      await db
        .prepare(
          `UPDATE members
           SET password_hash = ?, nickname = ?, birth_date = ?
           WHERE id = ?`
        )
        .bind(passwordHash, nickname, birthDate, node.id)
        .run()

      console.log(`[family/setup] 已更新 member ${node.id}（member_no=${memberNo}）`)

      return Response.json({
        ok:          true,
        member_id:   node.id,
        family_id:   node.family_id,
        created_new: false,
      })
    }

    /* ── B. 搵唔到 node → 建新樹 + 開自己 node ── */
    const familyId  = makeId()
    const memberId  = makeId()
    const familyName = `${nickname}家族樹`

    /* B-1. INSERT families */
    await db
      .prepare(
        `INSERT INTO families (id, name)
         VALUES (?, ?)`
      )
      .bind(familyId, familyName)
      .run()

    /* B-2. INSERT members
     *  - phone 暫留 NULL：cookie 只有 member_no，反查唔到電話
     *    （被加入嘅 node 本身已有電話；自建 node 首次冇電話，可接受，將來由 profile 補）
     *  - display_name 暫用 nickname
     */
    await db
      .prepare(
        `INSERT INTO members
           (id, family_id, member_kind, display_name, birth_date,
            coeldery85_member_id, nickname, password_hash)
         VALUES (?, ?, 'person', ?, ?, ?, ?, ?)`
      )
      .bind(memberId, familyId, nickname, birthDate, memberNo, nickname, passwordHash)
      .run()

    console.log(
      `[family/setup] 新建 family ${familyId}、member ${memberId}（member_no=${memberNo}）`,
      '⚠️ phone 暫留 NULL，將來由 profile 補'
    )

    return Response.json({
      ok:          true,
      member_id:   memberId,
      family_id:   familyId,
      created_new: true,
    })

  } catch (e) {
    console.error('[family/setup] DB 操作失敗:', e)
    return Response.json(
      { ok: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 },
    )
  }
}
