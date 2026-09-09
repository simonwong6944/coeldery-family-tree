/**
 * GET /api/me — 回當前用戶的 memberId 及 familyId
 *
 * 以 _currentMember helper 取得已登入用戶的主樹節點。
 * ok: false 時直接回傳 helper 的 Response（401）。
 * ok: true  時回 { ok: true, member_id, family_id }。
 *
 * 前端用途：家庭圈計算 canDelete（author_member_id === currentMemberId）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)

  if (!cur.ok) {
    return cur.response
  }

  return Response.json({
    ok:        true,
    member_id: cur.primaryMemberId,
    family_id: cur.primaryFamilyId,
  })
}
