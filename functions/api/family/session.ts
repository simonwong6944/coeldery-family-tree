/**
 * POST /api/family/session — 驗身後種 family_session cookie
 *
 * 漸進式乙方案 — Step 1：建立 session 機制（向後兼容）
 *
 * ⚠️  安全鐵律：
 *     FAMILY_TREE_API_KEY 只在 server 側讀取，只用作向 85AI 發出 Bearer header。
 *     此 key 絕對唔可出現喺回應 body、log 輸出、或任何前端可見位置。
 *
 * 職責：
 *   1. 接收 { member_no, phone }
 *   2. 呼叫共用 helper call85AiVerify（唔重複帶 key 邏輯）向 85AI 確認身份
 *   3. verify 失敗：原樣回失敗（守 85AI 三態 401 防列舉，唔加料）
 *   4. verify 成功：
 *      a. UPDATE members SET coeldery85_member_id = member_no WHERE is_self=1 AND coeldery85_member_id IS NULL
 *         （過渡：單棵樹單一 is_self；無 is_self → skip 綁定，記 log，session 照種）
 *      b. 生成 64-char hex token（256-bit random）
 *      c. INSERT family_sessions（token, member_no, expires_at）—— 唔再存 local id
 *      d. 種 family_session cookie（HttpOnly, Secure, SameSite=Lax, Path=/, MaxAge=30d）
 *      e. 回 { ok: true, member_no, name_zh, tier, ...（verify 返嘅資訊）}
 *
 * Cookie flags（照抄 CoLinkery colinkery_session，host-only）：
 *   HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000（30 日）
 *   唔設 domain → host-only，只對 family.coeldery85.com 有效
 *
 * 錯誤：
 *   503  FAMILY_TREE_API_KEY 未設定
 *   400  缺必填欄位
 *   502  upstream fetch 拋出異常 / 10s timeout
 *   upstream 非 200 原樣透傳（含 401 防列舉）
 *   （無 is_self member 只 skip 綁定 + log，session 照種，唔回 409）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 * secret:  FAMILY_TREE_API_KEY
 */

import type { Env } from '../_types'
import { call85AiVerify } from './_verify85ai'

/* ── session 有效期：30 日 ── */
const SESSION_DAYS = 30

/* ── 生成 64-char hex token（256-bit random，照抄 CoLinkery makeCsrpnToken）── */
function makeToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ── 計算 expires_at（ISO datetime string，照抄 CoLinkery sessionExpiry）── */
function sessionExpiry(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  // SQLite datetime() 格式："YYYY-MM-DD HH:MM:SS"
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

/* ── 組裝 Set-Cookie header value（原生 Web API，唔用 hono/cookie）── */
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
    //    將來做 SSO 跨子域時才加 Domain=.coeldery85.com
  ].join('; ')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  /* ── 1. 讀 key（讀唔到 → 503）── */
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) {
    console.error('[family/session] FAMILY_TREE_API_KEY 未設定')
    return Response.json(
      { ok: false, error: '家族樹服務未設定，請聯絡管理員' },
      { status: 503 }
    )
  }

  /* ── 2. 解析 request body ── */
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 })
  }

  const { member_no, phone } = body as { member_no?: unknown; phone?: unknown }

  if (!member_no || typeof member_no !== 'string' || member_no.trim() === '') {
    return Response.json({ ok: false, error: 'member_no 及 phone 為必填' }, { status: 400 })
  }
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return Response.json({ ok: false, error: 'member_no 及 phone 為必填' }, { status: 400 })
  }

  const memberNoClean = member_no.trim()
  const phoneClean    = phone.trim()

  /* ── 3. 向 85AI 驗身（重用共用 helper，唔重複帶 key）── */
  const verifyResult = await call85AiVerify(apiKey, memberNoClean, phoneClean)

  if (!verifyResult.ok) {
    /* 驗身失敗：原樣透傳（守 85AI 三態 401 防列舉，唔種 cookie，唔加料）*/
    return Response.json(verifyResult.body, { status: verifyResult.httpStatus })
  }

  /* ── 4. verify 成功 → 用電話查本人 node，按需寫入 coeldery85_member_id ── */
  const db = ctx.env.DB

  /*
   * 用 phoneClean 查 members，唔再靠「最早 family + is_self」過渡做法。
   * - 搵到 node 且 coeldery85_member_id IS NULL → UPDATE 寫入 memberNoClean
   * - 搵到 node 但已有值 → 唔郁（避免覆蓋）
   * - 搵唔到 node（電話未被加入任何樹）→ skip 綁定，log，session 照種
   * try/catch 保底：綁定出錯唔阻塞 session，needsSetup 保守預設 true
   */
  let needsSetup = true  // 保守預設：寧可引導 setup

  try {
    const node = await db
      .prepare(
        `SELECT id, coeldery85_member_id, password_hash
         FROM members
         WHERE phone = ? AND member_kind = 'person'`
      )
      .bind(phoneClean)
      .first<{ id: string; coeldery85_member_id: string | null; password_hash: string | null }>()

    if (node) {
      /* 有 password_hash → 熟客；null/空 → 首次登入 */
      needsSetup = !node.password_hash

      if (node.coeldery85_member_id === null) {
        await db
          .prepare(`UPDATE members SET coeldery85_member_id = ? WHERE id = ?`)
          .bind(memberNoClean, node.id)
          .run()
      }
      /* coeldery85_member_id 已有值 → 唔郁 */
    } else {
      /* 搵唔到 node → 電話未被加過，一定係首次，needsSetup 維持 true */
      console.log('[family/session] phone 未對應 node，skip 綁定，session 照種')
    }
  } catch (e) {
    /* 綁定失敗唔阻塞 session，記 log 後繼續；needsSetup 維持保守預設 true */
    console.error('[family/session] UPDATE coeldery85_member_id 失敗:', e)
  }

  /* ── 5. 生成 token、INSERT family_sessions（只存 member_no，唔存 local id）── */
  const token     = makeToken()
  const expiresAt = sessionExpiry(SESSION_DAYS)

  await db
    .prepare(
      `INSERT INTO family_sessions (token, member_no, expires_at)
       VALUES (?, ?, ?)`
    )
    .bind(token, memberNoClean, expiresAt)
    .run()

  /* ── 6. 種 family_session cookie + 回傳成功 ── */
  const { name_zh, tier, parent_no, relation } = verifyResult.data

  return new Response(
    JSON.stringify({
      ok:          true,
      member_no:   memberNoClean,
      name_zh,
      tier,
      parent_no,
      relation,
      needs_setup: needsSetup,
    }),
    {
      status:  200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie':   buildSetCookieHeader(token),
      },
    }
  )
}
