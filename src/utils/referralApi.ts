/**
 * referralApi — 推薦獎勵券（Type B）API client
 * 對應 functions/api/referrals.ts、rewards.ts、reward-claims.ts
 */
import type { ReferralCounts, ReferralItem, Reward } from './referrals'

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

export interface ReferralsPayload {
  counts: ReferralCounts
  referrals: ReferralItem[]
}

export async function listReferrals(): Promise<ReferralsPayload> {
  const r = await call<ReferralsPayload>('/api/referrals')
  return r.ok && r.data ? r.data : { counts: { joined: 0, invited: 0 }, referrals: [] }
}

/** 記錄一次邀請（家人未加入前 status = invited） */
export function createReferral(input: { phone: string; invitee_name?: string }) {
  return call<{ referral: ReferralItem }>('/api/referrals', { method: 'POST', body: JSON.stringify(input) })
}

export interface RewardsPayload {
  progress: ReferralCounts
  rewards: Reward[]
}

export async function listRewards(): Promise<RewardsPayload> {
  const r = await call<RewardsPayload>('/api/rewards')
  return r.ok && r.data ? r.data : { progress: { joined: 0, invited: 0 }, rewards: [] }
}

/** 領取獎勵券（必須已解鎖）；回傳 WhatsApp 預填訊息 */
export function claimReward(rewardId: string) {
  return call<{
    claim: { id: string; reward_id: string; merchant_name: string }
    wa_text: string
  }>('/api/reward-claims', { method: 'POST', body: JSON.stringify({ reward_id: rewardId }) })
}

export interface MyRewardClaim {
  id: string
  created_at: string
  reward_id: string
  title: string
  description: string | null
  terms: string | null
  merchant_id: string
  merchant_name: string
  phone: string | null
  whatsapp: string | null
  map_url: string | null
  address: string | null
}

export async function listMyRewardClaims(): Promise<MyRewardClaim[]> {
  const r = await call<{ claims: MyRewardClaim[] }>('/api/reward-claims')
  return r.ok && r.data ? r.data.claims : []
}
