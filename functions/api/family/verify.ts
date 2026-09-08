/**
 * POST /api/family/verify — 85AI 身份驗證代理
 *
 * ⚠️  安全鐵律：
 *     FAMILY_TREE_API_KEY 只在 server 側讀取，只用作向 85AI 發出 Bearer header。
 *     此 key 絕對唔可出現喺回應 body、log 輸出、或任何前端可見位置。
 *
 * 職責：
 *   1. 接收前端傳入 { member_no, phone }
 *   2. 代理轉發至 POST https://www.coeldery85.com/api/member/verify
 *      帶 Authorization: Bearer <FAMILY_TREE_API_KEY>
 *   3. 原樣透傳 upstream status + JSON body（唔拆解、唔加料）
 *      — 85AI 三態同一 401 係防列舉刻意設計，代理層守住唔干預
 *   4. 剝走所有 upstream response header，只轉 status + JSON body
 *
 * 本地代理層防護（慳 round-trip）：
 *   - member_no 缺失 → 400
 *   - phone 缺失     → 400
 *   （upstream 收錯值會乾淨回 4xx，此層只擋明顯缺欄位）
 *
 * 錯誤：
 *   503  FAMILY_TREE_API_KEY 未設定（跟 cloudinary-sign 慣例）
 *   400  body parse 失敗 / 缺必填欄位
 *   502  upstream fetch 拋出異常 / 10s timeout
 *
 * Cloudflare Pages Function — edge runtime
 * secret: FAMILY_TREE_API_KEY
 */

import type { Env } from '../_types'
import { call85AiVerify } from './_verify85ai'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  /* ── 1. 讀 key（讀唔到 → 503，跟 cloudinary-sign 慣例）── */
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) {
    console.error('[family/verify] FAMILY_TREE_API_KEY 未設定')  // 只 log 事件，不 log key 內容
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
    return Response.json(
      { ok: false, error: '無效的 JSON 格式' },
      { status: 400 }
    )
  }

  const { member_no, phone } = body as { member_no?: unknown; phone?: unknown }

  /* 代理層只擋明顯缺欄位（慳 round-trip），不做格式驗證（交由 85AI 判斷） */
  if (!member_no || typeof member_no !== 'string' || member_no.trim() === '') {
    return Response.json(
      { ok: false, error: 'member_no 及 phone 為必填' },
      { status: 400 }
    )
  }
  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    return Response.json(
      { ok: false, error: 'member_no 及 phone 為必填' },
      { status: 400 }
    )
  }

  /* ── 3. 呼叫共用 helper 向 85AI 代理請求（10s timeout）── */
  const result = await call85AiVerify(apiKey, member_no.trim(), phone.trim())

  /* ── 4. 原樣透傳 upstream status + JSON body，剝走所有 upstream header ── */
  /*
   * ⚠️  刻意不透傳任何 upstream header：
   *     - 避免洩漏 Set-Cookie / X-Internal-* 等 85AI 內部 header
   *     - 避免透傳錯誤的 Content-Length（body 重新序列化後長度可能變）
   *     - 前端只需 status + JSON，header 無用
   */
  if (result.ok) {
    return Response.json(result.data, { status: 200 })
  }
  return Response.json(result.body, { status: result.httpStatus })
}
