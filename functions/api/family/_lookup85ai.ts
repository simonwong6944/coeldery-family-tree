/**
 * _lookup85ai — 共用「靠電話向 85AI 查會員」helper
 *
 * 呼叫 85AI POST /api/family-tree/lookup-by-phone，
 * 供 setup.ts（開山攞自己 member_no）及 members.ts（加人查會員）共用。
 *
 * 回傳型別（discriminated union，與 _verify85ai.ts 同款做法）：
 *   { ok:true,  isMember:true,  memberNo, nameZh, status, memberType }  — 200 is_member:true
 *   { ok:true,  isMember:false }                                         — 200 is_member:false
 *   { ok:false, httpStatus, body }                                       — 非 200 / 網絡錯誤
 *
 * ⚠️  安全鐵律：
 *     FAMILY_TREE_API_KEY 只在 server 側用作 Bearer header，
 *     絕不可出現喺回應 body、log 正文、或任何前端可見位置。
 *
 * Cloudflare Pages Function edge runtime — 唔依賴任何第三方 package
 */

import { API85_BASE } from './_verify85ai'

/* upstream fetch timeout（毫秒，與 _verify85ai.ts 一致）*/
const UPSTREAM_TIMEOUT_MS = 10_000

/* ════════════════════════════════════════════════════════════
 * 回傳型別
 * ════════════════════════════════════════════════════════════ */
export type Lookup85AiResult =
  | { ok: true;  isMember: true;  memberNo: string; nameZh: string; status: string; memberType: string }
  | { ok: true;  isMember: false }
  | { ok: false; httpStatus: number; body: unknown }

/* upstream lookup-by-phone 成功回傳的原始資料結構（snake_case，與 API 一致）*/
interface Lookup85AiRaw {
  ok:          boolean
  is_member:   boolean
  member_no?:  string
  name_zh?:    string
  status?:     string
  member_type?: string
}

/* ════════════════════════════════════════════════════════════
 * lookup85AiByPhone
 *
 * @param apiKey - FAMILY_TREE_API_KEY（由呼叫者從 ctx.env 讀取，唔在此處讀 env）
 * @param phone  - 電話號碼（由呼叫者傳入，已 trim）
 * ════════════════════════════════════════════════════════════ */
export async function lookup85AiByPhone(
  apiKey: string,
  phone:  string,
): Promise<Lookup85AiResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(
      `${API85_BASE}/api/family-tree/lookup-by-phone`,
      {
        method:  'POST',
        headers: {
          // ⚠️ apiKey 只進入 Authorization header，永不寫入 log 或 response
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body:   JSON.stringify({ phone }),
        signal: controller.signal,
      },
    )
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    // log 只記事件類型，唔 log key 內容
    console.error(`[85ai/lookup-by-phone] upstream fetch ${isTimeout ? 'timeout' : 'error'}`)
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

  /* ── 非 200：原樣回傳 status + body，唔加料（同 _verify85ai.ts 一致）── */
  if (upstreamRes.status !== 200) {
    return { ok: false, httpStatus: upstreamRes.status, body: json }
  }

  /* ── 200：按 is_member 分路 ── */
  const raw = json as Lookup85AiRaw

  if (raw.is_member === true) {
    return {
      ok:         true,
      isMember:   true,
      // snake_case → camelCase mapping
      memberNo:   raw.member_no   ?? '',
      nameZh:     raw.name_zh     ?? '',
      status:     raw.status      ?? '',
      memberType: raw.member_type ?? '',
    }
  }

  // is_member === false（或其他 falsy 值）
  return { ok: true, isMember: false }
}
