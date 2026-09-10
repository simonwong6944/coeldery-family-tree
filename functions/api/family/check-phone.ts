/**
 * POST /api/family/check-phone — 登入第一步：查電話嘅登入狀態
 *
 * 用途（配合「先認電話，再決定要唔要密碼」嘅兩步流程）：
 *   用戶喺 #/login 只輸入電話 → 呼叫此 endpoint →
 *     未有密碼 → 前端顯示「首次設定」
 *     已有密碼 → 前端顯示「輸入密碼」
 *
 * 流程：
 *   1. normalizePhone(phone) → 8 位；格式錯 → 400
 *   2. lookup85AiByPhone(apiKey, phone) 攞 memberNo
 *        - 讀唔到 FAMILY_TREE_API_KEY → 503（絕不 fallback）
 *        - 上游錯 → 502
 *   3. 查 member_auth（member_no）：存在 → needs_setup:false；唔存在 → needs_setup:true
 *   4. 回 { ok:true, is_member, needs_setup }
 *
 * 非會員：回 200 { ok:true, is_member:false, needs_setup:false }
 *   （唔用 403，方便前端單一分支；此 endpoint 本質已透露會員與否）
 *
 * 安全：永不回傳 password_hash / token / 任何敏感欄位。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 * secret:  FAMILY_TREE_API_KEY
 */

import type { Env } from '../_types'
import { lookup85AiByPhone } from './_lookup85ai'

/* ── normalizePhone：同 login.ts / setup.ts 一套 ── */
function normalizePhone(raw: string): string | null {
  let norm = raw.replace(/\D/g, '')
  if (norm.startsWith('852')) norm = norm.slice(3)
  if (norm.length > 8) norm = norm.slice(-8)
  if (!/^\d{8}$/.test(norm)) return null
  return norm
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB

  /* ── API key（server-only，讀唔到即 503）── */
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) {
    console.error('[family/check-phone] FAMILY_TREE_API_KEY missing')
    return Response.json({ ok: false, error: '伺服器設定錯誤' }, { status: 503 })
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

  /* ── 85AI lookup：電話 → member_no ── */
  const lk = await lookup85AiByPhone(apiKey, phone)
  if (!lk.ok) {
    console.error('[family/check-phone] 85AI lookup failed', lk.httpStatus)
    return Response.json({ ok: false, error: '家族樹服務暫時不可用' }, { status: 502 })
  }
  if (!lk.isMember) {
    return Response.json({ ok: true, is_member: false, needs_setup: false }, { status: 200 })
  }

  const memberNo = lk.memberNo

  /* ── 查 member_auth：有 record = 已設定密碼 ── */
  try {
    const auth = await db
      .prepare(`SELECT member_no FROM member_auth WHERE member_no = ? LIMIT 1`)
      .bind(memberNo)
      .first<{ member_no: string }>()

    return Response.json(
      { ok: true, is_member: true, needs_setup: !auth },
      { status: 200 },
    )
  } catch (err) {
    console.error('[family/check-phone] DB error', err)
    return Response.json({ ok: false, error: '伺服器錯誤' }, { status: 500 })
  }
}
