/**
 * /api/referrals
 *   GET  → 我嘅推薦紀錄（已成功加入／已邀請）+ 計數
 *   POST → 記錄一次邀請（body: phone, invitee_name?）
 *
 * 規格：family_gather.md §6 Type B／§8 推薦飛輪；product_decisions v1.12
 * 認證：必須登入（邀請人 = 登入者 member_no）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { genId } from './_gatherings'
import {
  normalizePhone8, maskPhone, joinedReferralCount, invitedReferralCount,
} from './_referrals'

interface ReferralRow {
  id: string
  invitee_phone: string
  invitee_name: string | null
  invitee_member_no: string | null
  status: string
  created_at: string
  joined_at: string | null
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const rows = await ctx.env.DB
    .prepare(
      `SELECT id, invitee_phone, invitee_name, invitee_member_no, status, created_at, joined_at
       FROM referral
       WHERE inviter_member_no = ?
       ORDER BY (status = 'joined') DESC, created_at DESC`
    )
    .bind(cur.memberNo)
    .all<ReferralRow>()

  const [joined, invited] = [
    await joinedReferralCount(ctx.env.DB, cur.memberNo),
    await invitedReferralCount(ctx.env.DB, cur.memberNo),
  ]

  return Response.json({
    ok: true,
    counts: { joined, invited },
    referrals: (rows.results ?? []).map(r => ({
      id: r.id,
      invitee_name: r.invitee_name,
      invitee_phone_masked: maskPhone(r.invitee_phone),
      status: r.status,
      created_at: r.created_at,
      joined_at: r.joined_at,
    })),
  })
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const { phone, invitee_name } = body as { phone?: unknown; invitee_name?: unknown }
  const phoneNorm = normalizePhone8(phone)
  if (!phoneNorm)
    return Response.json({ ok: false, error: '電話格式錯誤（須 8 位香港號碼）' }, { status: 400 })

  const existing = await ctx.env.DB
    .prepare('SELECT id, status FROM referral WHERE inviter_member_no = ? AND invitee_phone = ?')
    .bind(cur.memberNo, phoneNorm)
    .first<{ id: string; status: string }>()
  if (existing) {
    return Response.json({
      ok: false,
      error: existing.status === 'joined' ? '此家人已經加入' : '已邀請過此號碼',
    }, { status: 409 })
  }

  const id = genId()
  const name = typeof invitee_name === 'string' && invitee_name.trim() ? invitee_name.trim() : null

  await ctx.env.DB
    .prepare(
      `INSERT INTO referral (id, inviter_member_no, inviter_family_id, invitee_phone, invitee_name, status)
       VALUES (?, ?, ?, ?, ?, 'invited')`
    )
    .bind(id, cur.memberNo, cur.primaryFamilyId, phoneNorm, name)
    .run()

  return Response.json({
    ok: true,
    referral: { id, invitee_name: name, invitee_phone_masked: maskPhone(phoneNorm), status: 'invited' },
  }, { status: 201 })
}
