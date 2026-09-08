/**
 * _verify85ai — 共用 85AI 身份驗證 helper
 *
 * 抽出「帶 FAMILY_TREE_API_KEY 向 85AI POST /api/member/verify」的核心邏輯，
 * 供 verify.ts（純代理）及 session.ts（驗後種 cookie）共用，
 * 確保 FAMILY_TREE_API_KEY 只在一個地方讀取，唔會兩處各自帶 key。
 *
 * 回傳值：
 *   { ok: true, data: <85AI 成功 JSON> }  — upstream 200
 *   { ok: false, status: number, body: unknown }  — upstream 非 200 / 網絡錯誤
 *
 * ⚠️  安全鐵律：
 *     FAMILY_TREE_API_KEY 只在 server 側讀取，永不出現喺 response body / log / 前端。
 *
 * Cloudflare Pages Function edge runtime — 唔依賴任何第三方 package
 */

/* 85AI base URL 集中一處，方便將來更換 */
export const API85_BASE = 'https://www.coeldery85.com'

/* upstream fetch timeout（毫秒）*/
const UPSTREAM_TIMEOUT_MS = 10_000

/* 85AI /api/member/verify 成功回傳的資料結構 */
export interface Verify85AiOk {
  ok: true
  member_no:   string
  status:      string
  expires_at:  string
  member_type: string
  name_zh:     string
  tier:        string
  parent_no:   string
  relation:    string
}

export type Verify85AiResult =
  | { ok: true;  data: Verify85AiOk }
  | { ok: false; httpStatus: number; body: unknown }

/**
 * call85AiVerify
 *
 * @param apiKey   - FAMILY_TREE_API_KEY（由呼叫者從 ctx.env 讀取，唔在此處讀 env）
 * @param memberNo - 前端傳入嘅 member_no（已 trim）
 * @param phone    - 前端傳入嘅 phone（已 trim）
 */
export async function call85AiVerify(
  apiKey:   string,
  memberNo: string,
  phone:    string,
): Promise<Verify85AiResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(
      `${API85_BASE}/api/member/verify`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        body:   JSON.stringify({ member_no: memberNo, phone }),
        signal: controller.signal,
      }
    )
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    console.error(`[85ai/verify] upstream fetch ${isTimeout ? 'timeout' : 'error'}`)
    return { ok: false, httpStatus: 502, body: { ok: false, error: '家族樹服務暫時不可用' } }
  } finally {
    clearTimeout(timer)
  }

  let json: unknown
  try {
    json = await upstreamRes.json()
  } catch {
    return { ok: false, httpStatus: 502, body: { ok: false, error: '家族樹服務回應格式異常' } }
  }

  if (upstreamRes.status === 200) {
    return { ok: true, data: json as Verify85AiOk }
  }

  /* 非 200（包含 85AI 三態 401 防列舉）— 原樣回傳 status + body，唔加料 */
  return { ok: false, httpStatus: upstreamRes.status, body: json }
}
