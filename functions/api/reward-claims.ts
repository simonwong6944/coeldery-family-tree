/**
 * /api/reward-claims
 *   POST → 領取推薦獎勵券（Type B；**必須已解鎖**：成功推薦人數 >= required_referrals）
 *   GET  → 我領取過嘅獎勵券（連商戶聯絡）
 *
 * 規格：family_gather.md §6 Type B：雙動作（平台記錄領取 ＋ 一鍵 WhatsApp 向商戶確認），零金流。
 * 認證：必須登入（身份 = member_no）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { genId } from './_gatherings'
import { joinedReferralCount } from './_referrals'
import { daysUntil } from './festivals'

interface RewardJoinRow {
  id: string
  title: string
  is_active: number
  required_referrals: number
  quota_total: number | null
  claimed_count: number
  valid_to: string | null
  merchant_id: string
  merchant_name: string
  merchant_listed: number
}

function buildClaimMessage(r: RewardJoinRow, memberNo: string, nickname: string | null): string {
  const who = nickname ? `${nickname}（${memberNo}）` : memberNo
  return [
    `你好，我想使用推薦獎勵券「${r.title}」。`,
    `我係老有樹家庭聚會會員：${who}。`,
    '麻煩確認名額同詳情，謝謝！',
  ].join('\n')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const rewardId = (body as { reward_id?: string }).reward_id
  if (!rewardId)
    return Response.json({ ok: false, error: '缺少 reward_id' }, { status: 400 })

  const r = await ctx.env.DB
    .prepare(
      `SELECT r.id, r.title, r.is_active, r.required_referrals, r.quota_total, r.claimed_count, r.valid_to,
              r.merchant_id, m.name AS merchant_name, m.is_listed AS merchant_listed
       FROM reward r JOIN merchant m ON m.id = r.merchant_id
       WHERE r.id = ?`
    )
    .bind(rewardId)
    .first<RewardJoinRow>()

  if (!r) return Response.json({ ok: false, error: '找不到此獎勵券' }, { status: 404 })
  if (r.is_active !== 1) return Response.json({ ok: false, error: '此獎勵券已結束' }, { status: 400 })
  if (r.merchant_listed !== 1) return Response.json({ ok: false, error: '此獎勵券已下架' }, { status: 400 })

  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  if (r.valid_to && daysUntil(r.valid_to, today) < 0)
    return Response.json({ ok: false, error: '此獎勵券已過期' }, { status: 400 })

  /* ── 解鎖檢查（推薦飛輪核心）── */
  const joined = await joinedReferralCount(ctx.env.DB, cur.memberNo)
  if (joined < r.required_referrals) {
    return Response.json({
      ok: false,
      error: `仲未解鎖：需成功推薦 ${r.required_referrals} 位家人（現時 ${joined} 位）`,
      need: r.required_referrals,
      joined,
    }, { status: 403 })
  }

  /* 一人一張一次 */
  const existing = await ctx.env.DB
    .prepare('SELECT id FROM reward_claim WHERE reward_id = ? AND member_no = ?')
    .bind(rewardId, cur.memberNo)
    .first<{ id: string }>()
  if (existing) return Response.json({ ok: false, error: '你已領取過此獎勵券' }, { status: 409 })

  /* 名額（條件式 UPDATE，原子）*/
  const upd = await ctx.env.DB
    .prepare(
      `UPDATE reward SET claimed_count = claimed_count + 1
       WHERE id = ? AND (quota_total IS NULL OR claimed_count < quota_total)`
    )
    .bind(rewardId)
    .run()
  if ((upd.meta?.changes ?? 0) === 0)
    return Response.json({ ok: false, error: '名額已滿' }, { status: 409 })

  const claimId = genId()
  try {
    await ctx.env.DB
      .prepare(
        `INSERT INTO reward_claim (id, reward_id, member_no, family_id, status)
         VALUES (?, ?, ?, ?, 'claimed')`
      )
      .bind(claimId, rewardId, cur.memberNo, cur.primaryFamilyId)
      .run()
  } catch {
    await ctx.env.DB
      .prepare('UPDATE reward SET claimed_count = claimed_count - 1 WHERE id = ? AND claimed_count > 0')
      .bind(rewardId)
      .run()
    return Response.json({ ok: false, error: '你已領取過此獎勵券' }, { status: 409 })
  }

  const auth = await ctx.env.DB
    .prepare('SELECT nickname FROM member_auth WHERE member_no = ?')
    .bind(cur.memberNo)
    .first<{ nickname: string | null }>()

  return Response.json({
    ok: true,
    claim: {
      id: claimId, reward_id: rewardId, status: 'claimed',
      merchant_id: r.merchant_id, merchant_name: r.merchant_name, my_claimed: true,
    },
    wa_text: buildClaimMessage(r, cur.memberNo, auth?.nickname ?? null),
  }, { status: 201 })
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const rows = await ctx.env.DB
    .prepare(
      `SELECT c.id, c.created_at, c.status,
              r.id AS reward_id, r.title, r.description, r.terms,
              m.id AS merchant_id, m.name AS merchant_name,
              m.phone, m.whatsapp, m.map_url, m.address
       FROM reward_claim c
       JOIN reward   r ON r.id = c.reward_id
       JOIN merchant m ON m.id = r.merchant_id
       WHERE c.member_no = ? AND c.status = 'claimed'
       ORDER BY c.created_at DESC`
    )
    .bind(cur.memberNo)
    .all<Record<string, unknown>>()

  return Response.json({ ok: true, claims: rows.results ?? [] })
}
