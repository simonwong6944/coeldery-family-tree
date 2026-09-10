/**
 * gatherApi — 家庭聚會 API client（薄封裝，集中處理 credentials / JSON / 錯誤）
 * 對應 functions/api/gatherings*、gathering-options*、gathering-votes
 */
import type { Gathering, GatheringOption, OptionKind, VoteChoice } from './gatherPlan'
import type { QueryMerchant } from './merchantQuery'

export interface GatheringListItem extends Gathering {
  subject_name: string | null
  option_count: number
  confirmed_count: number
  voter_count: number
  /** 已確認嘅聚會日期（否則用 target_date） */
  plan_date: string | null
}

export interface GatheringDetail {
  gathering: Gathering
  subject_name: string | null
  initiator_name: string | null
  me: string
  members: { id: string; display_name: string }[]
  options: GatheringOption[]
}

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

export async function listGatherings(): Promise<GatheringListItem[]> {
  const r = await call<{ gatherings: GatheringListItem[] }>('/api/gatherings')
  return r.ok && r.data ? r.data.gatherings : []
}

export function createGathering(input: {
  title: string; occasion_type: string
  subject_member_id?: string | null; target_date?: string | null
  festival_id?: string | null; note?: string | null
}) {
  return call<{ gathering: Gathering }>('/api/gatherings', { method: 'POST', body: JSON.stringify(input) })
}

export function getGathering(id: string) {
  return call<GatheringDetail>(`/api/gatherings/${id}`)
}

export function patchGathering(id: string, patch: Partial<Pick<Gathering,
  'title' | 'occasion_type' | 'subject_member_id' | 'target_date' | 'status' | 'note' | 'festival_id'>>) {
  return call<{ gathering: Gathering }>(`/api/gatherings/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteGathering(id: string) {
  return call<{ deleted_gathering_id: string }>(`/api/gatherings/${id}`, { method: 'DELETE' })
}

export function addOption(input: {
  gathering_id: string; kind: OptionKind; label: string
  merchant_id?: string | null; option_date?: string | null; option_time?: string | null
  pickup_place?: string | null; assignee_member_id?: string | null; note?: string | null
}) {
  return call<{ option: GatheringOption }>('/api/gathering-options', { method: 'POST', body: JSON.stringify(input) })
}

export function patchOption(id: string, patch: Record<string, unknown>) {
  return call<{ option: GatheringOption }>(`/api/gathering-options/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteOption(id: string) {
  return call<{ deleted_option_id: string }>(`/api/gathering-options/${id}`, { method: 'DELETE' })
}

export function voteOption(optionId: string, choice: VoteChoice | 'none') {
  return call<{ option_id: string; my_choice: VoteChoice | null; tally: { yes: number; no: number; maybe: number } }>(
    '/api/gathering-votes',
    { method: 'POST', body: JSON.stringify({ option_id: optionId, choice }) },
  )
}

/** 讀商戶清單（全部已上架；實際篩選喺前端 merchantQuery 做，避免多次請求） */
export async function listMerchants(): Promise<QueryMerchant[]> {
  const r = await call<{ merchants: QueryMerchant[] }>('/api/merchants')
  return r.ok && r.data ? r.data.merchants : []
}

export interface MerchantMeta {
  categories: { id: string; name: string; sort_order: number }[]
  regions: { id: string; name: string; districts: { id: string; name: string }[] }[]
  tags: { id: string; name: string; category_id: string | null }[]
}

/** 讀篩選選項（地區／類型／標籤；只含真正有上架商戶嘅選項） */
export async function listMerchantMeta(): Promise<MerchantMeta> {
  const r = await call<MerchantMeta>('/api/merchants-meta')
  return r.ok && r.data ? r.data : { categories: [], regions: [], tags: [] }
}
