/**
 * promotions — 節日推廣券純邏輯（無 React／無 fetch，可獨立測試）
 *
 * 定位（product_decisions v1.11／family_gather.md §6）：
 *   - 推廣**必須綁節日**（例：中秋節訂枱），唔會綁個人生日 → 商戶喺「節日需求」度買曝光。
 *   - 雙動作：①平台記錄領取（一人一次、名額有限）②一鍵 WhatsApp 向商戶確認（商戶記錄）。
 *   - 忌辰等莊重場合零廣告（rules §23）→ 推廣一律唔會出現。
 */

export interface Festival {
  id: string
  name: string
  date: string        // YYYY-MM-DD
  is_lunar: number
  days_until: number
}

export interface PromoMerchantRef {
  id: string
  name: string | null
  phone?: string | null
  whatsapp?: string | null
  map_url?: string | null
  address?: string | null
  photo_url?: string | null
  ad_tier?: number
  category_name?: string | null
  district_name?: string | null
}

export interface Promotion {
  id: string
  merchant_id: string
  festival_id: string
  festival_name: string
  festival_date: string
  festival_days_until: number
  title: string
  description: string | null
  terms: string | null
  quota_total: number | null
  claimed_count: number
  quota_left: number | null
  valid_from: string | null
  valid_to: string | null
  my_claimed: boolean
  merchant: PromoMerchantRef
}

export type ClaimState = 'claimable' | 'claimed' | 'full' | 'expired'

/** 剩餘名額（不限 = null） */
export function quotaLeft(p: Pick<Promotion, 'quota_total' | 'claimed_count'>): number | null {
  if (p.quota_total === null) return null
  return Math.max(p.quota_total - p.claimed_count, 0)
}

/** 今日（UTC）凌晨毫秒 */
export function todayUTCms(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/** 距今日（UTC）日數；今日 = 0，已過 = 負數 */
export function daysUntil(dateStr: string, todayMs = todayUTCms()): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return Number.NaN
  return Math.round((Date.UTC(y, m - 1, d) - todayMs) / 86_400_000)
}

/** 可否領取（單一狀態機；UI 與測試共用）*/
export function claimState(
  p: Pick<Promotion, 'my_claimed' | 'quota_total' | 'claimed_count' | 'valid_to'>,
  todayMs = todayUTCms(),
): ClaimState {
  if (p.valid_to && daysUntil(p.valid_to, todayMs) < 0) return 'expired'
  const left = quotaLeft(p)
  if (left !== null && left <= 0) return 'full'
  if (p.my_claimed) return 'claimed'
  return 'claimable'
}

/** 排序：付費商戶（ad_tier）優先 → 節日已近 → 建立次序；不改變原陣列 */
export function sortPromotions(list: Promotion[]): Promotion[] {
  return [...list].sort((a, b) =>
    (b.merchant.ad_tier ?? 0) - (a.merchant.ad_tier ?? 0)
    || a.festival_days_until - b.festival_days_until
    || a.title.localeCompare(b.title, 'zh-Hant'),
  )
}

/** 由推廣清單取出「某商戶」嘅推廣（一個商戶同一節日可能有多張，取第一張） */
export function promoForMerchant(list: Promotion[], merchantId: string): Promotion | undefined {
  return list.find(p => p.merchant_id === merchantId)
}

/** 名額顯示文字用嘅資料（UI 用；避免在元件內計算） */
export function quotaLabel(p: Promotion): { left: number | null; total: number | null } {
  return { left: quotaLeft(p), total: p.quota_total }
}

/** WhatsApp 深鏈（用後端回傳嘅 wa_text；有商戶 whatsapp 就直接對號，否則用分享） */
export function waHref(promotion: Promotion, text: string): string {
  const num = (promotion.merchant.whatsapp ?? '').replace(/\D/g, '')
  const q = encodeURIComponent(text)
  return num ? `https://wa.me/${num}?text=${q}` : `https://wa.me/?text=${q}`
}

/** 節日倒數文字資料（今日／N 日後／已過） */
export function festivalWhen(days: number): { key: 'today' | 'days' | 'past'; n: number } {
  if (days <= 0) return { key: days === 0 ? 'today' : 'past', n: days }
  return { key: 'days', n: days }
}

/** 客戶端預設 WhatsApp 訊息（未經後端 claim 時用；claim 後優先用後端回傳嘅 wa_text） */
export function defaultClaimText(p: Promotion): string {
  return [
    `你好，我想預訂「${p.title}」（${p.festival_name} ${p.festival_date}）。`,
    '我係老有樹家庭聚會會員。',
    '麻煩確認名額同詳情，謝謝！',
  ].join('\n')
}
