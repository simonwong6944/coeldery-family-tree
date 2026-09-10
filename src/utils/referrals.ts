/**
 * referrals — 推薦獎勵券（Type B）純邏輯（無 React／無 fetch，可獨立測試）
 *
 * 定位（family_gather.md §6 Type B／§8 推薦飛輪；product_decisions v1.12）：
 *   推薦家人加入 → 家人**成功加入**才計 1 位 → 達 required_referrals（例：5）解鎖 →
 *   自選一張商戶提供嘅獎勵券 → 同一套雙動作領取（平台記錄 ＋ 一鍵 WhatsApp，零金流）。
 */

export interface ReferralCounts { joined: number; invited: number }

export interface ReferralItem {
  id: string
  invitee_name: string | null
  invitee_phone_masked: string
  status: 'invited' | 'joined'
  created_at: string
  joined_at: string | null
}

export interface RewardMerchantRef {
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

export interface Reward {
  id: string
  merchant_id: string
  title: string
  description: string | null
  terms: string | null
  required_referrals: number
  quota_total: number | null
  claimed_count: number
  quota_left: number | null
  valid_to: string | null
  unlocked: boolean
  my_claimed: boolean
  merchant: RewardMerchantRef
}

export type RewardState = 'locked' | 'claimable' | 'claimed' | 'full' | 'expired'

/** 電話 normalize：8 位香港號碼（去 852） */
export function normalizePhone8(raw: string): string | null {
  let n = raw.replace(/\D/g, '')
  if (n.startsWith('852')) n = n.slice(3)
  if (n.length > 8) n = n.slice(-8)
  return /^\d{8}$/.test(n) ? n : null
}

/** 邀請進度（joined / required） */
export function referralProgress(counts: ReferralCounts, required: number): {
  joined: number; required: number; remaining: number; unlocked: boolean; percent: number
} {
  const joined = counts.joined
  const remaining = Math.max(required - joined, 0)
  return {
    joined,
    required,
    remaining,
    unlocked: joined >= required,
    percent: required <= 0 ? 100 : Math.min(Math.round((joined / required) * 100), 100),
  }
}

/** 今日（UTC）凌晨毫秒 */
export function todayUTCms(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/** 券狀態機（鎖住 / 可領 / 已領 / 滿 / 過期）—— 過期優先，其次名額，再其次已領 */
export function rewardState(
  r: Pick<Reward, 'unlocked' | 'my_claimed' | 'quota_total' | 'claimed_count' | 'valid_to'>,
  todayMs = todayUTCms(),
): RewardState {
  if (r.valid_to) {
    const [y, m, d] = r.valid_to.split('-').map(Number)
    if (y && m && d && Date.UTC(y, m - 1, d) < todayMs) return 'expired'
  }
  if (!r.unlocked) return 'locked'
  const left = r.quota_total === null ? null : Math.max(r.quota_total - r.claimed_count, 0)
  if (left !== null && left <= 0) return 'full'
  if (r.my_claimed) return 'claimed'
  return 'claimable'
}

/** 顯示用解鎖門檻：取清單中最低要求（無券時預設 5） */
export function unlockThreshold(rewards: Array<Pick<Reward, 'required_referrals'>>): number {
  const reqs = rewards.map(r => r.required_referrals).filter(n => Number.isFinite(n) && n > 0)
  return reqs.length ? Math.min(...reqs) : 5
}

/** 邀請訊息（書面語；含邀請人 member_no 同登入連結） */
export function inviteText(inviteeName: string | null, memberNo: string, link: string): string {
  const who = inviteeName && inviteeName.trim() ? `${inviteeName.trim()}您好` : '您好'
  return `${who}，${memberNo} 誠邀您加入老有樹家族樹。請按以下連結完成首次登入及設定：${link}`
}

/** WhatsApp 邀請鏈結（有電話就直接對號，否則用分享） */
export function inviteHref(phone: string | null, text: string): string {
  const num = phone ? phone.replace(/\D/g, '') : ''
  const q = encodeURIComponent(text)
  if (!num) return `https://wa.me/?text=${q}`
  const full = num.length === 8 ? `852${num}` : num
  return `https://wa.me/${full}?text=${q}`
}

/** 領取留言（claim 後優先用後端回傳；此為客戶端後備） */
export function defaultRewardClaimText(title: string): string {
  return [`你好，我想使用推薦獎勵券「${title}」。`, '我係老有樹家庭聚會會員。', '麻煩確認名額同詳情，謝謝！'].join('\n')
}
