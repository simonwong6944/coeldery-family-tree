/**
 * _createNode85ai — 共用「向 85AI 建立 NODE_ONLY 純節點成員」helper
 *
 * 呼叫 85AI POST /api/family-tree/members，
 * 供 members.ts 加人（被加者非 85AI 會員分支）用，
 * 在 85AI 側建立一個 NODE_ONLY 成員節點（先人、嬰兒、未入會親戚等）。
 *
 * 注意：呢個 API 唔收 phone（純節點唔存電話）。
 *
 * 回傳型別（discriminated union，同 _lookup85ai.ts 同款做法）：
 *   { ok: true,  memberNo, memberType }             — upstream 201
 *   { ok: false, httpStatus, body }                 — 非 201 / 網絡錯誤
 *
 * ⚠️  安全鐵律：
 *     FAMILY_TREE_API_KEY 只在 server 側用作 Bearer header，
 *     絕不可出現喺回應 body、log 正文、或任何前端可見位置。
 *
 * Cloudflare Pages Function edge runtime — 唔依賴任何第三方 package
 */

import { API85_BASE } from './_verify85ai'

/* upstream fetch timeout（毫秒，同 _lookup85ai.ts 一致）*/
const UPSTREAM_TIMEOUT_MS = 10_000

/* ════════════════════════════════════════════════════════════
 * 輸入型別
 * ════════════════════════════════════════════════════════════ */
export interface CreateNode85aiInput {
  nameZh:        string    // 必填：中文名
  managedBy:     string    // 必填：代管人 member_no（加人者）
  gender?:       string    // 可選：'male' | 'female'
  birthYear?:    number    // 可選：出生年份
  deceasedDate?: string    // 可選：先人逝世日期（YYYY-MM-DD）
}

/* ════════════════════════════════════════════════════════════
 * 回傳型別
 * ════════════════════════════════════════════════════════════ */
export type CreateNode85aiResult =
  | { ok: true;  memberNo: string; memberType: string }
  | { ok: false; httpStatus: number; body: unknown }

/* ════════════════════════════════════════════════════════════
 * createNode85ai
 *
 * @param apiKey - FAMILY_TREE_API_KEY（由呼叫者從 ctx.env 讀取，唔在此處讀 env）
 * @param input  - 建立 NODE_ONLY 成員所需欄位
 * ════════════════════════════════════════════════════════════ */
export async function createNode85ai(
  apiKey: string,
  input:  CreateNode85aiInput,
): Promise<CreateNode85aiResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  /* ── 組裝 request body（唔傳嘅可選欄位唔加入 body）── */
  const requestBody: Record<string, unknown> = {
    name_zh:    input.nameZh,
    managed_by: input.managedBy,
  }
  if (input.gender       !== undefined && input.gender       !== null) requestBody.gender        = input.gender
  if (input.birthYear    !== undefined && input.birthYear    !== null) requestBody.birth_year    = input.birthYear
  if (input.deceasedDate !== undefined && input.deceasedDate !== null) requestBody.deceased_date = input.deceasedDate

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(
      `${API85_BASE}/api/family-tree/members`,
      {
        method:  'POST',
        headers: {
          // ⚠️ apiKey 只進入 Authorization header，永不寫入 log 或 response
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body:   JSON.stringify(requestBody),
        signal: controller.signal,
      },
    )
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    // log 只記事件類型，唔 log key 內容
    console.error(`[85ai/create-node] upstream fetch ${isTimeout ? 'timeout' : 'error'}`)
    return { ok: false, httpStatus: 502, body: { ok: false, error: '家族樹服務暫時不可用' } }
  } finally {
    clearTimeout(timer)
  }

  /* ── parse JSON（回應格式異常 → 502）── */
  let json: unknown
  try {
    json = await upstreamRes.json()
  } catch {
    return { ok: false, httpStatus: 502, body: { ok: false, error: '家族樹服務回應格式異常' } }
  }

  /* ── 201：成功建立 NODE_ONLY 節點 ── */
  if (upstreamRes.status === 201) {
    const raw = json as Record<string, unknown>
    return {
      ok:         true,
      memberNo:   String(raw.member_no   ?? ''),
      memberType: String(raw.member_type ?? 'NODE_ONLY'),
    }
  }

  /* ── 非 201（400/401/500）：原樣回傳 status + body，唔加料（同 _lookup85ai.ts 一致）── */
  return { ok: false, httpStatus: upstreamRes.status, body: json }
}
