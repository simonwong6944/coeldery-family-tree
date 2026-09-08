/**
 * GET /api/merchants — 商戶列表（上架准入 + 廣告分層排序）
 *
 * 商業邏輯（見 .coappery/merchant_platform.md 第三節）：
 *   - is_listed = 0 → 完全不出現，如同不存在
 *   - ad_tier 2 → 置頂贊助位（須前端標示「贊助/Sponsored」）
 *   - ad_tier 1 → 廣告基礎（同地區靠前，須前端標示「贊助」）
 *   - ad_tier 0 → 自然排位（按 created_at 升序）
 *   排序：ad_tier DESC, created_at ASC（tier 高優先；同 tier 早入庫靠前）
 *
 * Query String 篩選（全部可選，AND 疊加）：
 *   ?district_group_id=  按區篩選
 *   ?district_id=        按地區篩選
 *   ?landmark_id=        按地標篩選（v1 = 精確匹配，不計 GPS 距離）
 *   ?category_id=        按主分類篩選
 *
 * 回應結構：
 *   { ok, merchants, sponsored, promoted, natural }
 *   merchants  = 已排序扁平陣列
 *   sponsored  = ad_tier === 2（前端做置頂贊助區）
 *   promoted   = ad_tier === 1（前端做廣告名單）
 *   natural    = ad_tier === 0（前端做自然名單）
 *
 * 每個商戶帶：tags 陣列 [{id, name}]；媒體/聯絡欄位 whatsapp / map_url / banner_url /
 *   video_url / poster_url（migration 0008 新增，nullable）；不回 paid_note（內部營運資料）。
 *
 * 登入 Gate 決策：
 *   商戶列表係全平台公開瀏覽型功能，不綁 family，不需要 getCurrentMember。
 *   原因：merchant 表不含 family_id；用戶在 app 內只瀏覽商戶資訊（spec §0）；
 *   不應因 is_self 設定問題阻擋用戶搜尋附近商戶。→ 不加登入 gate，直接 public。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'

/* ── DB row 型別 ── */
interface MerchantRow {
  id:                 string
  name:               string
  ad_tier:            number
  is_listed:          number
  phone:              string | null
  address:            string | null
  description:        string | null
  photo_url:          string | null
  whatsapp:           string | null
  map_url:            string | null
  banner_url:         string | null
  video_url:          string | null
  poster_url:         string | null
  landmark_id:        string | null
  landmark_name:      string | null
  district_name:      string | null
  district_group_name: string | null
  category_id:        string | null
  category_name:      string | null
  created_at:         string
}

interface TagRow {
  merchant_id: string
  tag_id:      string
  tag_name:    string
}

/* ── 回應型別（不含 paid_note）── */
interface MerchantItem {
  id:                  string
  name:                string
  ad_tier:             number
  is_listed:           number
  phone:               string | null
  address:             string | null
  description:         string | null
  photo_url:           string | null
  whatsapp:            string | null
  map_url:             string | null
  banner_url:          string | null
  video_url:           string | null
  poster_url:          string | null
  landmark_id:         string | null
  landmark_name:       string | null
  district_name:       string | null
  district_group_name: string | null
  category_id:         string | null
  category_name:       string | null
  tags:                { id: string; name: string }[]
}

/* ── GET /api/merchants ── */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url    = new URL(ctx.request.url)
  const params = url.searchParams

  /* ── 讀取可選篩選參數 ── */
  const districtGroupId = params.get('district_group_id')?.trim() || null
  const districtId      = params.get('district_id')?.trim()      || null
  const landmarkId      = params.get('landmark_id')?.trim()      || null
  const categoryId      = params.get('category_id')?.trim()      || null

  /* ── 動態組裝 WHERE 條件（全部用 .bind() 防 SQL injection）── */
  const whereClauses: string[] = [
    'm.is_listed = 1',   // 核心准入規則：未上架商戶完全不出現
  ]
  const bindValues: (string | number)[] = []

  if (landmarkId) {
    // landmark_id 最精確，傳咗就直接篩（包含於 district、district_group 範圍）
    whereClauses.push('m.landmark_id = ?')
    bindValues.push(landmarkId)
  } else if (districtId) {
    // 按地區篩選：JOIN 到 landmark.district_id
    whereClauses.push('lm.district_id = ?')
    bindValues.push(districtId)
  } else if (districtGroupId) {
    // 按區篩選：JOIN 到 district.group_id
    whereClauses.push('dt.group_id = ?')
    bindValues.push(districtGroupId)
  }

  if (categoryId) {
    whereClauses.push('m.category_id = ?')
    bindValues.push(categoryId)
  }

  const whereSQL = whereClauses.join(' AND ')

  /* ── 主查詢：merchant JOIN landmark → district → district_group + category ──
     排序：ad_tier DESC（tier 高優先）, m.created_at ASC（同 tier 早入庫靠前）
     不回 paid_note（內部營運資料）
  ── */
  const sql = `
    SELECT
      m.id,
      m.name,
      m.ad_tier,
      m.is_listed,
      m.phone,
      m.address,
      m.description,
      m.photo_url,
      m.whatsapp,
      m.map_url,
      m.banner_url,
      m.video_url,
      m.poster_url,
      m.landmark_id,
      m.category_id,
      m.created_at,
      lm.name       AS landmark_name,
      dt.name       AS district_name,
      dg.name       AS district_group_name,
      mc.name       AS category_name
    FROM merchant m
    LEFT JOIN landmark       lm ON lm.id = m.landmark_id
    LEFT JOIN district       dt ON dt.id = lm.district_id
    LEFT JOIN district_group dg ON dg.id = dt.group_id
    LEFT JOIN merchant_category mc ON mc.id = m.category_id
    WHERE ${whereSQL}
    ORDER BY m.ad_tier DESC, m.created_at ASC
  `

  let merchantsRes: D1Result<MerchantRow>
  try {
    merchantsRes = await ctx.env.DB
      .prepare(sql)
      .bind(...bindValues)
      .all<MerchantRow>()
  } catch {
    return Response.json(
      { ok: false, error: '商戶查詢失敗，請稍後再試' },
      { status: 500 }
    )
  }

  const rows = merchantsRes.results

  /* ── 攞所有回傳商戶嘅標籤（一次 IN 查詢，避免 N+1）── */
  let tagMap: Map<string, { id: string; name: string }[]> = new Map()

  if (rows.length > 0) {
    const merchantIds = rows.map(r => r.id)
    // SQLite IN (?,?,?) — 動態展開
    const placeholders = merchantIds.map(() => '?').join(', ')
    const tagSQL = `
      SELECT
        mm.merchant_id,
        mt.id   AS tag_id,
        mt.name AS tag_name
      FROM merchant_tag_map mm
      JOIN merchant_tag mt ON mt.id = mm.tag_id
      WHERE mm.merchant_id IN (${placeholders})
      ORDER BY mm.merchant_id, mt.name
    `

    try {
      const tagRes = await ctx.env.DB
        .prepare(tagSQL)
        .bind(...merchantIds)
        .all<TagRow>()

      for (const t of tagRes.results) {
        const arr = tagMap.get(t.merchant_id) ?? []
        arr.push({ id: t.tag_id, name: t.tag_name })
        tagMap.set(t.merchant_id, arr)
      }
    } catch {
      // 標籤查詢失敗不應阻塞主結果，靜默降級（tags = []）
      tagMap = new Map()
    }
  }

  /* ── 組裝回應（不含 paid_note）── */
  const merchants: MerchantItem[] = rows.map(r => ({
    id:                  r.id,
    name:                r.name,
    ad_tier:             r.ad_tier,
    is_listed:           r.is_listed,
    phone:               r.phone,
    address:             r.address,
    description:         r.description,
    photo_url:           r.photo_url,
    whatsapp:            r.whatsapp,
    map_url:             r.map_url,
    banner_url:          r.banner_url,
    video_url:           r.video_url,
    poster_url:          r.poster_url,
    landmark_id:         r.landmark_id,
    landmark_name:       r.landmark_name,
    district_name:       r.district_name,
    district_group_name: r.district_group_name,
    category_id:         r.category_id,
    category_name:       r.category_name,
    tags:                tagMap.get(r.id) ?? [],
  }))

  /* ── 分層陣列（方便前端做贊助區 / 廣告名單 / 自然名單）── */
  const sponsored = merchants.filter(m => m.ad_tier === 2)
  const promoted  = merchants.filter(m => m.ad_tier === 1)
  const natural   = merchants.filter(m => m.ad_tier === 0)

  return Response.json({
    ok: true,
    merchants,
    sponsored,
    promoted,
    natural,
  })
}
