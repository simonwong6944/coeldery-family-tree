/**
 * GET /api/rewards — 推薦獎勵券（Type B）清單
 *
 * 回傳：我嘅推薦進度（已成功加入人數）＋ 每張券嘅解鎖狀態／名額／我領取咗未。
 * 解鎖條件：`joinedReferrals >= reward.required_referrals`（例如 5 位）。
 *
 * 規格：family_gather.md §6 Type B／§8 推薦飛輪；product_decisions v1.12
 * 認證：必須登入
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { joinedReferralCount, invitedReferralCount } from './_referrals'
import { daysUntil } from './festivals'

interface RewardRow {
  id: string
  merchant_id: string
  title: string
  description: string | null
  terms: string | null
  required_referrals: number
  quota_total: number | null
  claimed_count: number
  valid_to: string | null
  m_name: string
  m_phone: string | null
  m_whatsapp: string | null
  m_map_url: string | null
  m_address: string | null
  m_photo_url: string | null
  m_ad_tier: number
  m_category_name: string | null
  m_district_name: string | null
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const rows = await ctx.env.DB
    .prepare(
      `SELECT r.id, r.merchant_id, r.title, r.description, r.terms,
              r.required_referrals, r.quota_total, r.claimed_count, r.valid_to,
              m.name AS m_name, m.phone AS m_phone, m.whatsapp AS m_whatsapp,
              m.map_url AS m_map_url, m.address AS m_address, m.photo_url AS m_photo_url,
              m.ad_tier AS m_ad_tier, mc.name AS m_category_name, dt.name AS m_district_name
       FROM reward r
       JOIN merchant m ON m.id = r.merchant_id
       LEFT JOIN merchant_category mc ON mc.id = m.category_id
       LEFT JOIN landmark lm ON lm.id = m.landmark_id
       LEFT JOIN district dt ON dt.id = lm.district_id
       WHERE r.is_active = 1 AND m.is_listed = 1
       ORDER BY r.required_referrals ASC, m.ad_tier DESC, r.created_at ASC`
    )
    .all<RewardRow>()

  const mine = await ctx.env.DB
    .prepare(`SELECT reward_id FROM reward_claim WHERE member_no = ? AND status = 'claimed'`)
    .bind(cur.memberNo)
    .all<{ reward_id: string }>()
  const claimed = new Set((mine.results ?? []).map(r => r.reward_id))

  const joined  = await joinedReferralCount(ctx.env.DB, cur.memberNo)
  const invited = await invitedReferralCount(ctx.env.DB, cur.memberNo)

  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  const rewards = (rows.results ?? [])
    .filter(r => !r.valid_to || daysUntil(r.valid_to, today) >= 0)
    .map(r => ({
      id: r.id,
      merchant_id: r.merchant_id,
      title: r.title,
      description: r.description,
      terms: r.terms,
      required_referrals: r.required_referrals,
      quota_total: r.quota_total,
      claimed_count: r.claimed_count,
      quota_left: r.quota_total === null ? null : Math.max(r.quota_total - r.claimed_count, 0),
      valid_to: r.valid_to,
      unlocked: joined >= r.required_referrals,
      my_claimed: claimed.has(r.id),
      merchant: {
        id: r.merchant_id, name: r.m_name, phone: r.m_phone, whatsapp: r.m_whatsapp,
        map_url: r.m_map_url, address: r.m_address, photo_url: r.m_photo_url,
        ad_tier: r.m_ad_tier, category_name: r.m_category_name, district_name: r.m_district_name,
      },
    }))

  return Response.json({
    ok: true,
    progress: { joined, invited },
    rewards,
  })
}
