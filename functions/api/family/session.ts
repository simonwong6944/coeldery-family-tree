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
 *      a. 查家庭樹本地 is_self = 1 成員，攞 local_member_id + local_family_id
 *      b. 生成 64-char hex token（256-bit random）
 *      c. INSERT family_sessions（member_no, local_member_id, local_family_id, expires_at）
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
 *   409  驗身成功但找不到 is_self member（引導用戶先設定本人）
 *   upstream 非 200 原樣透傳（含 401 防列舉）
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

  /* ── 4. verify 成功 → 查本地 is_self member ── */
  const db = ctx.env.DB

  /*
   * 攞第一棵 family + 對應 is_self = 1 成員
   * 邏輯同 _currentMember.ts 一致，確保回傳嘅 local_family_id / local_member_id
   * 與現有所有 route 一致
   */
  const family = await db
    .prepare('SELECT id FROM families ORDER BY created_at ASC LIMIT 1')
    .first<{ id: string }>()

  if (!family) {
    return Response.json(
      { ok: false, error: '找不到家族，請先建立成員' },
      { status: 409 }
    )
  }

  const selfMember = await db
    .prepare('SELECT id FROM members WHERE family_id = ? AND is_self = 1 LIMIT 1')
    .bind(family.id)
    .first<{ id: string }>()

  if (!selfMember) {
    return Response.json(
      { ok: false, error: '未設定本人，請先於成員資料設定本人' },
      { status: 409 }
    )
  }

  /* ── 5. 生成 token、INSERT family_sessions ── */
  const token     = makeToken()
  const expiresAt = sessionExpiry(SESSION_DAYS)

  await db
    .prepare(
      `INSERT INTO family_sessions (token, member_no, local_member_id, local_family_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(token, memberNoClean, selfMember.id, family.id, expiresAt)
    .run()

  /* ── 6. 種 family_session cookie + 回傳成功 ── */
  const { name_zh, tier, parent_no, relation } = verifyResult.data

  return new Response(
    JSON.stringify({
      ok:        true,
      member_no: memberNoClean,
      name_zh,
      tier,
      parent_no,
      relation,
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
