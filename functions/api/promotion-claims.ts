/**
 * /api/promotion-claims
 *   POST → 領取節日推廣（雙動作第一步：平台記錄領取；名額有限、一人一次）
 *   GET  → 我領取過嘅推廣（連商戶聯絡資料）
 *
 * 規格：family_gather.md §6：①領取（Claim）平台記錄 ②一鍵 WhatsApp 確認預約（商戶記錄）
 *      全程不涉平台金流、不抽佣（承 Core Document 第四／八節）
 * 硬規則（rules §23）：忌辰等莊重場合唔會有推廣；此 API 只處理「已綁節日」嘅推廣。
 * 認證：必須登入（身份 = member_no）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { genId } from './_gatherings'
import { daysUntil } from './festivals'

interface PromoJoinRow {
  id: string
  title: string
  is_active: number
  quota_total: number | null
  claimed_count: number
  valid_to: string | null
  merchant_id: string
  merchant_name: string
  merchant_listed: number
  festival_id: string
  festival_name: string
  festival_date: string
}

function todayUTCms(): number {
  const n = new Date()
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
}

/** WhatsApp 預填訊息（第一步領取後的「第二步」）*/
function buildClaimMessage(p: PromoJoinRow, memberNo: string, nickname: string | null): string {
  const who = nickname ? `${nickname}（${memberNo}）` : memberNo
  return [
    `你好，我想預訂「${p.title}」（${p.festival_name} ${p.festival_date}）。`,
    `我係老有樹家庭聚會會員：${who}。`,
    '麻煩確認名額同詳情，謝謝！',
  ].join('\n')
}

/* ════════════════════════════════════════════════════════════
 * POST — 領取推廣
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const promotionId = (body as { promotion_id?: string }).promotion_id
  if (!promotionId)
    return Response.json({ ok: false, error: '缺少 promotion_id' }, { status: 400 })

  const p = await ctx.env.DB
    .prepare(
      `SELECT p.id, p.title, p.is_active, p.quota_total, p.claimed_count, p.valid_to,
              p.merchant_id, m.name AS merchant_name, m.is_listed AS merchant_listed,
              p.festival_id, f.name AS festival_name, f.date AS festival_date
       FROM promotion p
       JOIN merchant m ON m.id = p.merchant_id
       JOIN festival f ON f.id = p.festival_id
       WHERE p.id = ?`
    )
    .bind(promotionId)
    .first<PromoJoinRow>()

  if (!p) return Response.json({ ok: false, error: '找不到此優惠' }, { status: 404 })
  if (p.is_active !== 1) return Response.json({ ok: false, error: '此優惠已結束' }, { status: 400 })
  if (p.merchant_listed !== 1) return Response.json({ ok: false, error: '此優惠已下架' }, { status: 400 })
  if (p.valid_to && daysUntil(p.valid_to, todayUTCms()) < 0)
    return Response.json({ ok: false, error: '此優惠已過期' }, { status: 400 })

  /* 一人一次 */
  const existing = await ctx.env.DB
    .prepare('SELECT id FROM promotion_claim WHERE promotion_id = ? AND member_no = ?')
    .bind(promotionId, cur.memberNo)
    .first<{ id: string }>()
  if (existing) return Response.json({ ok: false, error: '你已領取過此優惠' }, { status: 409 })

  /* 名額控管：先遞增（帶條件），遞增唔到 = 名額已滿（原子操作，避免 race）*/
  const upd = await ctx.env.DB
    .prepare(
      `UPDATE promotion SET claimed_count = claimed_count + 1
       WHERE id = ? AND (quota_total IS NULL OR claimed_count < quota_total)`
    )
    .bind(promotionId)
    .run()
  if ((upd.meta?.changes ?? 0) === 0)
    return Response.json({ ok: false, error: '名額已滿' }, { status: 409 })

  const claimId = genId()
  try {
    await ctx.env.DB
      .prepare(
        `INSERT INTO promotion_claim (id, promotion_id, member_no, family_id, status)
         VALUES (?, ?, ?, ?, 'claimed')`
      )
      .bind(claimId, promotionId, cur.memberNo, cur.primaryFamilyId)
      .run()
  } catch {
    /* UNIQUE 衝突（同一時間重複領取）→ 回滾名額 */
    await ctx.env.DB
      .prepare('UPDATE promotion SET claimed_count = claimed_count - 1 WHERE id = ? AND claimed_count > 0')
      .bind(promotionId)
      .run()
    return Response.json({ ok: false, error: '你已領取過此優惠' }, { status: 409 })
  }

  const auth = await ctx.env.DB
    .prepare('SELECT nickname FROM member_auth WHERE member_no = ?')
    .bind(cur.memberNo)
    .first<{ nickname: string | null }>()

  return Response.json({
    ok: true,
    claim: {
      id: claimId, promotion_id: promotionId, status: 'claimed',
      festival_name: p.festival_name, festival_date: p.festival_date,
      merchant_id: p.merchant_id, merchant_name: p.merchant_name,
      my_claimed: true,
    },
    wa_text: buildClaimMessage(p, cur.memberNo, auth?.nickname ?? null),
  }, { status: 201 })
}

/* ════════════════════════════════════════════════════════════
 * GET — 我領取過嘅推廣
 * ════════════════════════════════════════════════════════════ */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const rows = await ctx.env.DB
    .prepare(
      `SELECT c.id, c.created_at, c.status,
              p.id AS promotion_id, p.title, p.description, p.terms,
              f.name AS festival_name, f.date AS festival_date,
              m.id AS merchant_id, m.name AS merchant_name, m.phone, m.whatsapp, m.map_url, m.address
       FROM promotion_claim c
       JOIN promotion p ON p.id = c.promotion_id
       JOIN merchant  m ON m.id = p.merchant_id
       JOIN festival  f ON f.id = p.festival_id
       WHERE c.member_no = ? AND c.status = 'claimed'
       ORDER BY c.created_at DESC`
    )
    .bind(cur.memberNo)
    .all<Record<string, unknown>>()

  return Response.json({ ok: true, claims: rows.results ?? [] })
}
