/**
 * GET /api/family/tree/:no — 85AI 家族樹結構代理
 *
 * ⚠️  安全鐵律：
 *     FAMILY_TREE_API_KEY 只在 server 側讀取，只用作向 85AI 發出 Bearer header。
 *     此 key 絕對唔可出現喺回應 body、log 輸出、或任何前端可見位置。
 *
 * Path param：
 *   :no   — 成員編號（CE85- 開頭格式，否則 400）
 *           動態 segment 讀法：ctx.params['no']（與 members/[id].ts 慣例一致）
 *
 * Query string：
 *   ?mode=self|root  — 樹模式（預設 root；其他值 → 400）
 *
 * 職責：
 *   1. 代理轉發至 GET https://www.coeldery85.com/api/family-tree/members/:no/children?mode=<mode>
 *      帶 Authorization: Bearer <FAMILY_TREE_API_KEY>
 *   2. 原樣透傳 upstream status + JSON body
 *      { ok, mode, root, nodes, truncated }
 *   3. 剝走所有 upstream response header，只轉 status + JSON body
 *
 * 本地代理層防護（慳 round-trip）：
 *   - :no 不符 CE85- 格式 → 400（upstream 收錯值亦只會回 404，此層優化）
 *   - mode 不係 self / root → 400（嚴格攔截）
 *
 * 錯誤：
 *   503  FAMILY_TREE_API_KEY 未設定（跟 cloudinary-sign 慣例）
 *   400  :no 格式不符 / mode 不合法
 *   502  upstream fetch 拋出異常 / 10s timeout
 *
 * Cloudflare Pages Function — edge runtime
 * secret: FAMILY_TREE_API_KEY
 */

import type { Env } from '../../_types'

/* 85AI base URL 集中一處，方便將來更換（與 family/verify.ts 保持同一常數定義） */
const API85_BASE = 'https://www.coeldery85.com'

/* upstream fetch timeout（毫秒） */
const UPSTREAM_TIMEOUT_MS = 10_000

/* :no 格式：CE85- 開頭，後接至少一個字元（英數字 / 連字號）*/
const MEMBER_NO_RE = /^CE85-[A-Za-z0-9-]+$/

/* 合法 mode 值 */
const VALID_MODES = new Set<string>(['self', 'root'])

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  /* ── 1. 讀 key（讀唔到 → 503，跟 cloudinary-sign 慣例）── */
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) {
    console.error('[family/tree] FAMILY_TREE_API_KEY 未設定')  // 只 log 事件，不 log key 內容
    return Response.json(
      { ok: false, error: '家族樹服務未設定，請聯絡管理員' },
      { status: 503 }
    )
  }

  /* ── 2. 讀 path param :no（dynamic segment，Cloudflare Pages 以 ctx.params['no'] 注入）── */
  const no = ctx.params['no'] as string | undefined
  if (!no || !MEMBER_NO_RE.test(no)) {
    return Response.json(
      { ok: false, error: 'member_no 格式不正確（應為 CE85- 開頭）' },
      { status: 400 }
    )
  }

  /* ── 3. 讀 query mode（預設 root；非 self/root → 400）── */
  const reqUrl = new URL(ctx.request.url)
  const modeParam = reqUrl.searchParams.get('mode') ?? 'root'
  if (!VALID_MODES.has(modeParam)) {
    return Response.json(
      { ok: false, error: "mode 只接受 'self' 或 'root'" },
      { status: 400 }
    )
  }

  /* ── 4. 向 85AI 代理請求（10s timeout）── */
  const upstreamUrl =
    `${API85_BASE}/api/family-tree/members/${encodeURIComponent(no)}/children?mode=${modeParam}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  let upstreamRes: Response
  try {
    upstreamRes = await fetch(
      upstreamUrl,
      {
        method:  'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      }
    )
  } catch (err) {
    /* fetch 拋異常（包括 AbortError timeout）→ 502 */
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    console.error(`[family/tree] upstream fetch ${isTimeout ? 'timeout' : 'error'}`)
    return Response.json(
      { ok: false, error: '家族樹服務暫時不可用' },
      { status: 502 }
    )
  } finally {
    clearTimeout(timer)
  }

  /* ── 5. 原樣透傳 upstream status + JSON body，剝走所有 upstream header ── */
  /*
   * ⚠️  刻意不透傳任何 upstream header（同 verify.ts 理由相同）：
   *     - 避免洩漏 85AI 內部 header
   *     - 前端只需 status + JSON
   */
  let upstreamJson: unknown
  try {
    upstreamJson = await upstreamRes.json()
  } catch {
    /* upstream 回嘅唔係 JSON（罕見，但防禦）*/
    return Response.json(
      { ok: false, error: '家族樹服務回應格式異常' },
      { status: 502 }
    )
  }

  return Response.json(upstreamJson, { status: upstreamRes.status })
}
