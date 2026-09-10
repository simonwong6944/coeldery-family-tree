/**
 * promotionApi — 節日推廣 API client
 * 對應 functions/api/festivals.ts、promotions.ts、promotion-claims.ts
 */
import type { Festival, Promotion } from './promotions'

export interface ApiResult<T> { ok: boolean; error?: string; data?: T }

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    })
    const d = await res.json() as T & { ok?: boolean; error?: string }
    if (!res.ok || d.ok === false) return { ok: false, error: d.error ?? '操作失敗' }
    return { ok: true, data: d }
  } catch {
    return { ok: false, error: '網絡錯誤，請稍後再試' }
  }
}

/** 節日曆（預設未來 120 日） */
export async function listFestivals(all = false): Promise<Festival[]> {
  const r = await call<{ festivals: Festival[] }>(`/api/festivals${all ? '?all=1' : ''}`)
  return r.ok && r.data ? r.data.festivals : []
}

/** 節日推廣（可只取某節日／某商戶） */
export async function listPromotions(opts: { festivalId?: string; merchantId?: string } = {}): Promise<Promotion[]> {
  const q = new URLSearchParams()
  if (opts.festivalId) q.set('festival_id', opts.festivalId)
  if (opts.merchantId) q.set('merchant_id', opts.merchantId)
  const suffix = q.toString() ? `?${q.toString()}` : ''
  const r = await call<{ promotions: Promotion[] }>(`/api/promotions${suffix}`)
  return r.ok && r.data ? r.data.promotions : []
}

/** 領取（雙動作第一步）；回傳平台紀錄 + WhatsApp 預填訊息 */
export function claimPromotion(promotionId: string) {
  return call<{
    claim: { id: string; promotion_id: string; festival_name: string; festival_date: string; merchant_name: string }
    wa_text: string
  }>('/api/promotion-claims', { method: 'POST', body: JSON.stringify({ promotion_id: promotionId }) })
}

export interface MyClaim {
  id: string
  created_at: string
  status: string
  promotion_id: string
  title: string
  description: string | null
  terms: string | null
  festival_name: string
  festival_date: string
  merchant_id: string
  merchant_name: string
  phone: string | null
  whatsapp: string | null
  map_url: string | null
  address: string | null
}

/** 我領取過嘅推廣 */
export async function listMyClaims(): Promise<MyClaim[]> {
  const r = await call<{ claims: MyClaim[] }>('/api/promotion-claims')
  return r.ok && r.data ? r.data.claims : []
}
