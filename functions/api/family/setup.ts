/**
 * POST /api/family/setup — 首次登入設定（密碼 + 暱稱 + 生日）
 *
 * ════════════════════════════════════════════════════════════
 * 新認人模型（取代舊 cookie 認證）：
 *   首次用戶未有 family_session cookie，故改靠傳入電話 + 85AI lookup 認人。
 *   member_no 完全從 85AI lookup 取得，前端傳嘅任何 id / member_no 一律唔信。
 *
 * 安全鐵律：
 *   - FAMILY_TREE_API_KEY 只作 Bearer header，絕不出現喺 body / log / 前端
 *   - 密碼用 PBKDF2-SHA256 hash 後才存；絕不存明文
 *   - 回應唔含 password_hash 或任何敏感欄位
 * ════════════════════════════════════════════════════════════
 *
 * 收 body：
 *   { phone: string, password: string, nickname: string, birth_date: string (YYYY-MM-DD) }
 *
 * 核心流程：
 *   1. 驗欄位（phone normalize / password / nickname / birth_date）
 *   2. 讀 FAMILY_TREE_API_KEY（讀唔到 → 503）
 *   3. lookup85AiByPhone → 非會員 → 403；lookup 失敗 → 透傳 upstream 狀態
 *   4. 查 member_auth（member_no 為 key）：已存在 → 409（已完成設定，改用登入）
 *   5. 靠 coeldery85_member_id = member_no 查本人 node：
 *      A. 搵到 → 只補 birth_date（若空）
 *      B. 搵唔到 → 建新 family + INSERT 自己 node
 *                 （不帶 phone / password_hash / nickname，認證改存 member_auth）
 *   6. INSERT member_auth（password_hash + nickname，per member_no）
 *   7. 無論 A / B 成功後種 family_session cookie（30 日）
 *
 * 回應（200）：
 *   { ok: true, member_id, family_id, created_new: boolean }
 *   header 帶 Set-Cookie: family_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000
 *
 * 錯誤：
 *   400  欄位不合格（phone / password / nickname / birth_date）
 *   403  非 85AI 會員
 *   409  member_no 已完成設定（member_auth 已存在，請改用登入）
 *   503  FAMILY_TREE_API_KEY 未設定
 *   upstream 非 200  原樣透傳
 *   500  DB 錯（記 log）
 *
 * Cloudflare Pages Function — edge runtime（Web Crypto 可用）
 * binding: DB (D1)
 * secret:  FAMILY_TREE_API_KEY
 */

import type { Env } from '../_types'
import { lookup85AiByPhone } from './_lookup85ai'
import { hashPassword } from './_password'
import { markReferralJoined } from '../_referrals'

/* ════════════════════════════════════════════════════════════
 * session helpers（照抄 session.ts，唔 import 以免 cross-import）
 * ════════════════════════════════════════════════════════════ */
const SESSION_DAYS = 30

/* 生成 64-char hex token（256-bit random）*/
function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* 計算 expires_at（SQLite datetime 格式：YYYY-MM-DD HH:MM:SS）*/
function sessionExpiry(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

/* 組裝 Set-Cookie header value（host-only，唔設 Domain）*/
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

/* ════════════════════════════════════════════════════════════
 * hashPassword 已抽出至 _password.ts（共用）
 * ════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
 * 生成短 hex id（128-bit random，32-char hex）
 * 用於 families.id / members.id
 * ════════════════════════════════════════════════════════════ */
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

  /* ── 1. 解析 request body ── */
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 })
  }

  /* ── 2. 驗證欄位 ── */

  /* phone — normalize：去非數字 → 去 852/+852 前綴 → 留最後 8 位 */
  const phoneRaw = body.phone
  if (!phoneRaw || typeof phoneRaw !== 'string') {
    return Response.json({ ok: false, error: '電話格式錯誤' }, { status: 400 })
  }
  let phoneNorm = phoneRaw.replace(/\D/g, '')
  if (phoneNorm.startsWith('852')) phoneNorm = phoneNorm.slice(3)
  if (phoneNorm.length > 8)        phoneNorm = phoneNorm.slice(-8)
  if (!/^\d{8}$/.test(phoneNorm)) {
    return Response.json({ ok: false, error: '電話格式錯誤' }, { status: 400 })
  }
  const phone = phoneNorm

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

  /* ── 3. 讀 FAMILY_TREE_API_KEY ── */
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) {
    console.error('[family/setup] FAMILY_TREE_API_KEY 未設定')
    return Response.json(
      { ok: false, error: '家族樹服務未設定，請聯絡管理員' },
      { status: 503 },
    )
  }

  /* ── 4. 向 85AI lookup 電話 → 攞 member_no ── */
  const lookupResult = await lookup85AiByPhone(apiKey, phone)

  /* lookup 失敗（網絡 / upstream 4xx / 5xx）→ 原樣透傳，唔加料 */
  if (!lookupResult.ok) {
    return Response.json(lookupResult.body, { status: lookupResult.httpStatus })
  }

  /* 非會員 → 403 */
  if (!lookupResult.isMember) {
    return Response.json(
      { ok: false, error: '此電話未登記為 CoEldery 85 會員，請先完成會員登記' },
      { status: 403 },
    )
  }

  /* 攞到 memberNo */
  const memberNo = lookupResult.memberNo

  /* ── 5. 計算 password hash（PBKDF2-SHA256）── */
  let passwordHash: string
  try {
    passwordHash = await hashPassword(password)
  } catch (e) {
    console.error('[family/setup] hashPassword 失敗:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }

  /* ── 6. 查本人 node + 寫入認證（member_auth）── */
  try {
    /* ── 6a. 查 member_auth（member_no 為 key）── */
    const existingAuth = await db
      .prepare(`SELECT member_no FROM member_auth WHERE member_no = ?`)
      .bind(memberNo)
      .first<{ member_no: string }>()

    /* ── 6b. 查本人 node（靠 coeldery85_member_id = memberNo）── */
    const node = await db
      .prepare(
        `SELECT id, family_id
         FROM members
         WHERE coeldery85_member_id = ? AND member_kind = 'person'
         LIMIT 1`
      )
      .bind(memberNo)
      .first<{ id: string; family_id: string }>()

    /* 真正「已完成設定」＝ 已有密碼【且】已有節點 → 409（改用登入）
     * 只有其一（有密碼無節點 / 有節點無密碼）→ 照行落去補齊，避免登入死循環 */
    if (existingAuth && node) {
      return Response.json(
        { ok: false, error: '此帳號已完成設定，請使用密碼登入' },
        { status: 409 },
      )
    }

    let memberId:  string
    let familyId:  string
    let createdNew: boolean

    /* ── A. 搵到 node（已存在）→ 補 birth_date + 顯示名 ── */
    if (node) {
      if (birthDate) {
        await db
          .prepare(
            `UPDATE members
             SET birth_date = ?
             WHERE id = ? AND (birth_date IS NULL OR birth_date = '')`
          )
          .bind(birthDate, node.id)
          .run()
      }

      /* 本人設定時同步顯示名（本人控制自己個名；放寬紅線 4 之「本人」例外）*/
      await db
        .prepare('UPDATE members SET display_name = ? WHERE id = ?')
        .bind(nickname, node.id)
        .run()

      console.log(`[family/setup] 已存在 member ${node.id}（memberNo=${memberNo}）`)

      memberId   = node.id
      familyId   = node.family_id
      createdNew = false

    /* ── B. 搵唔到 node（真開山）→ 建新 family + INSERT 自己 node ── */
    } else {
      const newFamilyId  = makeId()
      const newMemberId  = makeId()
      const familyName   = `${nickname}家族樹`

      /* B-1. INSERT families */
      await db
        .prepare(`INSERT INTO families (id, name) VALUES (?, ?)`)
        .bind(newFamilyId, familyName)
        .run()

      /* B-2. INSERT members（不帶 phone / password_hash / nickname）*/
      await db
        .prepare(
          `INSERT INTO members
             (id, family_id, member_kind, display_name, birth_date, coeldery85_member_id)
           VALUES (?, ?, 'person', ?, ?, ?)`
        )
        .bind(newMemberId, newFamilyId, nickname, birthDate || null, memberNo)
        .run()

      console.log(
        `[family/setup] 新建 family ${newFamilyId}、member ${newMemberId}` +
        `（memberNo=${memberNo}）`
      )

      memberId   = newMemberId
      familyId   = newFamilyId
      createdNew = true
    }

    /* ── 6c. 寫入 member_auth（只在未有時；已有就保留原本密碼）── */
    if (!existingAuth) {
      await db
        .prepare(
          `INSERT INTO member_auth (member_no, password_hash, nickname, updated_at)
           VALUES (?, ?, ?, datetime('now'))`
        )
        .bind(memberNo, passwordHash, nickname)
        .run()
    }

    /* ── 6d. 推薦獎勵：若呢個電話曾被家人邀請 → 標記「成功加入」（Type B 解鎖條件）── */
    try {
      await markReferralJoined(db, phoneNorm, memberNo)
    } catch (e) {
      console.error('[family/setup] markReferralJoined failed:', e)
    }

    /* ── 7. 種 family_session cookie（A / B 均執行）── */
    const sessionToken = makeToken()
    const expiresAt    = sessionExpiry(SESSION_DAYS)

    await db
      .prepare(
        `INSERT INTO family_sessions (token, member_no, expires_at)
         VALUES (?, ?, ?)`
      )
      .bind(sessionToken, memberNo, expiresAt)
      .run()

    /* ── 8. 回應（帶 Set-Cookie）── */
    return new Response(
      JSON.stringify({ ok: true, member_id: memberId, family_id: familyId, created_new: createdNew }),
      {
        status:  200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie':   buildSetCookieHeader(sessionToken),
        },
      },
    )

  } catch (e) {
    console.error('[family/setup] DB 操作失敗:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }
}
