/**
 * GET /api/promotions — 商戶節日推廣清單（含商戶資料、剩餘名額、我領取咗未）
 *   ?festival_id=<id>   只看某節日（家庭聚會節日流程必用）
 *   ?merchant_id=<id>   只看某商戶
 *
 * 規格：family_gather.md §6（推廣券雙動作）；product_decisions v1.11（**推廣必須綁節日**）
 * 硬規則：
 *   - 只回 `is_active = 1`、未過期（valid_to 未過）、商戶 `is_listed = 1` 嘅推廣（承商戶准入）
 *   - 推廣一律綁節日（festival_id NOT NULL）——唔會出現「個人生日」類推廣
 * 認證：必須登入
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { daysUntil } from './festivals'

interface PromoRow {
  id: string
  merchant_id: string
  festival_id: string
  title: string
  description: string | null
  terms: string | null
  quota_total: number | null
  claimed_count: number
  valid_from: string | null
  valid_to: string | null
  created_at: string
  festival_name: string
  festival_date: string
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

  const params = new URL(ctx.request.url).searchParams
  const festivalId = params.get('festival_id')?.trim() || null
  const merchantId = params.get('merchant_id')?.trim() || null

  const where: string[] = ['p.is_active = 1', 'm.is_listed = 1']
  const binds: string[] = []
  if (festivalId) { where.push('p.festival_id = ?'); binds.push(festivalId) }
  if (merchantId) { where.push('p.merchant_id = ?'); binds.push(merchantId) }

  const rows = await ctx.env.DB
    .prepare(
      `SELECT p.id, p.merchant_id, p.festival_id, p.title, p.description, p.terms,
              p.quota_total, p.claimed_count, p.valid_from, p.valid_to, p.created_at,
              f.name AS festival_name, f.date AS festival_date,
              m.name AS m_name, m.phone AS m_phone, m.whatsapp AS m_whatsapp,
              m.map_url AS m_map_url, m.address AS m_address, m.photo_url AS m_photo_url,
              m.ad_tier AS m_ad_tier,
              mc.name AS m_category_name, dt.name AS m_district_name
       FROM promotion p
       JOIN merchant m ON m.id = p.merchant_id
       JOIN festival f ON f.id = p.festival_id
       LEFT JOIN merchant_category mc ON mc.id = m.category_id
       LEFT JOIN landmark lm ON lm.id = m.landmark_id
       LEFT JOIN district dt ON dt.id = lm.district_id
       WHERE ${where.join(' AND ')}
       ORDER BY m.ad_tier DESC, p.created_at DESC`
    )
    .bind(...binds)
    .all<PromoRow>()

  /* 我（登入者 member_no）領取過邊幾張 */
  const mine = await ctx.env.DB
    .prepare(
      `SELECT promotion_id FROM promotion_claim
       WHERE member_no = ? AND status = 'claimed'`
    )
    .bind(cur.memberNo)
    .all<{ promotion_id: string }>()
  const claimed = new Set((mine.results ?? []).map(r => r.promotion_id))

  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  const promotions = (rows.results ?? [])
    .filter(p => !p.valid_to || daysUntil(p.valid_to, today) >= 0)
    .map(p => ({
      id: p.id,
      merchant_id: p.merchant_id,
      festival_id: p.festival_id,
      festival_name: p.festival_name,
      festival_date: p.festival_date,
      festival_days_until: daysUntil(p.festival_date, today),
      title: p.title,
      description: p.description,
      terms: p.terms,
      quota_total: p.quota_total,
      claimed_count: p.claimed_count,
      quota_left: p.quota_total === null ? null : Math.max(p.quota_total - p.claimed_count, 0),
      valid_from: p.valid_from,
      valid_to: p.valid_to,
      my_claimed: claimed.has(p.id),
      merchant: {
        id: p.merchant_id, name: p.m_name, phone: p.m_phone, whatsapp: p.m_whatsapp,
        map_url: p.m_map_url, address: p.m_address, photo_url: p.m_photo_url,
        ad_tier: p.m_ad_tier, category_name: p.m_category_name, district_name: p.m_district_name,
      },
    }))

  return Response.json({ ok: true, promotions })
}
