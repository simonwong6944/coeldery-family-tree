/**
 * merchantQuery — 「需要服務嗰刻」嘅商戶篩選純邏輯（無 React／無 fetch，可獨立測試）
 *
 * 定位（product_decisions v1.8/v1.9、family_gather.md §1–3）：
 *   - 商戶**唔會**喺家庭聚會首頁列出；只有用戶要「訂餐廳／蛋糕／禮物／送花」嗰刻才出現。
 *   - 出現時要有**正常篩選**：類型、地區、搜尋、排序；付費排序須標示「贊助」。
 *   - 忌辰（莊重場合）：先剔除所有付費／贊助（ad_tier > 0）—— 零廣告硬攔截（rules §23）。
 */

export type MerchantKind = 'date' | 'place' | 'cake' | 'gift'

export interface QueryMerchant {
  id: string
  name: string
  ad_tier: number
  category_id: string | null
  category_name: string | null
  district_name: string | null
  district_group_name: string | null
  landmark_name?: string | null
  address?: string | null
  /** 聯絡／展示欄位（merchant 平台原有，App 內不涉交易）*/
  phone?: string | null
  whatsapp?: string | null
  map_url?: string | null
  photo_url?: string | null
  tags?: { id: string; name: string }[]
}

/* 各「需要」對應嘅商戶主分類（family_gather.md §3.2）——只作**後備**：商戶完全冇標籤時用 */
export const KIND_CATS: Record<MerchantKind, string[]> = {
  date:  [],
  place: ['cat-food'],
  cake:  ['cat-food', 'cat-gift'],
  gift:  ['cat-gift'],
}

/* 主要匹配：標籤（平台策展，粒度較細）*/
export const KIND_TAGS: Record<MerchantKind, string[]> = {
  date:  [],
  place: ['餐廳', '茶餐廳', '酒樓', '到會', '自助餐', '宴會', '酒家'],
  cake:  ['蛋糕', '糕點', '西餅', '甜品'],
  gift:  ['禮品', '禮盒', '鮮花', '花店', '花籃'],
}

/** 該「需要」預設揀邊個分類（UI 預選；用戶可改） */
export function defaultCategoryFor(kind: MerchantKind | null): string | null {
  if (!kind) return null
  return KIND_CATS[kind][0] ?? null
}

/**
 * 商戶是否符合該「需要」：
 *   1. 標籤命中 → 是（精準）
 *   2. 商戶冇任何標籤 → 用主分類後備（避免舊資料漏出）
 *   3. 有標籤但唔命中 → 否（例：茶餐廳唔會出現喺「訂蛋糕」）
 *   date = 不限類型
 */
export function matchKind(m: QueryMerchant, kind: MerchantKind): boolean {
  if (kind === 'date') return true
  const kw = KIND_TAGS[kind]
  const tags = m.tags ?? []
  if (tags.some(t => kw.some(k => t.name.includes(k)))) return true
  if (tags.length > 0) return false
  return m.category_id !== null && KIND_CATS[kind].includes(m.category_id)
}

/** 關鍵字搜尋（名稱／地址／地標／分類／標籤） */
export function searchMerchants<T extends QueryMerchant>(list: T[], q: string): T[] {
  const kw = q.trim()
  if (kw === '') return list
  return list.filter(m =>
    m.name.includes(kw)
    || (m.address ?? '').includes(kw)
    || (m.landmark_name ?? '').includes(kw)
    || (m.category_name ?? '').includes(kw)
    || (m.tags ?? []).some(t => t.name.includes(kw)),
  )
}

export type MerchantSort = 'recommended' | 'name' | 'district'

/** 排序：recommended = 沿用平台排序（贊助優先，已在 API 排好）；name／district = 用戶自選 */
export function sortMerchants<T extends QueryMerchant>(list: T[], mode: MerchantSort): T[] {
  const copy = [...list]
  if (mode === 'name') copy.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
  else if (mode === 'district') {
    copy.sort((a, b) =>
      (a.district_group_name ?? '').localeCompare(b.district_group_name ?? '', 'zh-Hant')
      || (a.district_name ?? '').localeCompare(b.district_name ?? '', 'zh-Hant')
      || a.name.localeCompare(b.name, 'zh-Hant'),
    )
  }
  return copy
}

/** 忌辰等莊重場合：剔除一切付費／贊助商戶（零廣告） */
export function hidePaid<T extends QueryMerchant>(list: T[]): T[] {
  return list.filter(m => m.ad_tier === 0)
}

export interface MerchantQueryInput {
  kind?:        MerchantKind | null
  q?:           string
  region?:      string | null   // district_group_name（例：港島）
  district?:    string | null   // district_name（例：灣仔）
  categoryId?:  string | null
  tagName?:     string | null
  sort?:        MerchantSort
  solemn?:      boolean
}

/** 一次過套用：需要類型 → 地區 → 分類／標籤 → 搜尋 → 忌辰過濾 → 排序 */
export function applyMerchantQuery<T extends QueryMerchant>(list: T[], input: MerchantQueryInput): T[] {
  let out: T[] = list

  if (input.solemn) out = hidePaid(out)
  if (input.kind) out = out.filter(m => matchKind(m, input.kind as MerchantKind))
  if (input.region) out = out.filter(m => (m.district_group_name ?? '') === input.region)
  if (input.district) out = out.filter(m => (m.district_name ?? '') === input.district)
  if (input.categoryId) out = out.filter(m => m.category_id === input.categoryId)
  if (input.tagName) out = out.filter(m => (m.tags ?? []).some(t => t.name === input.tagName))
  if (input.q) out = searchMerchants(out, input.q)

  return sortMerchants(out, input.sort ?? 'recommended')
}

/** 該場合係咪「唔可以發起聚會／唔可以出廣告」嘅莊重場合 */
export function isSolemnKindContext(occasion: string): boolean {
  return occasion === 'memorial'
}
