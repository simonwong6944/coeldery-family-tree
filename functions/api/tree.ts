/**
 * GET /api/tree?family_id=xxx
 * 讀取一棵家族樹的所有成員 + 關係邊，供 B1HomePage 畫樹用。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url)
  const familyId = url.searchParams.get('family_id')

  // 暫時：若未傳 family_id，自動使用第一筆 family（mockup 階段只有一棵樹）
  let resolvedFamilyId = familyId
  if (!resolvedFamilyId) {
    const first = await ctx.env.DB.prepare(
      'SELECT id FROM families ORDER BY created_at ASC LIMIT 1'
    ).first<{ id: string }>()
    resolvedFamilyId = first?.id ?? null
  }

  if (!resolvedFamilyId) {
    return Response.json({ members: [], relationships: [], family: null })
  }

  const [family, members, relationships] = await Promise.all([
    ctx.env.DB.prepare(
      'SELECT id, name, created_at FROM families WHERE id = ?'
    ).bind(resolvedFamilyId).first<{ id: string; name: string; created_at: string }>(),

    ctx.env.DB.prepare(
      `SELECT id, family_id, member_kind, display_name, birth_date, avatar_url, created_at
       FROM members WHERE family_id = ? ORDER BY created_at ASC`
    ).bind(resolvedFamilyId).all<{
      id: string; family_id: string; member_kind: string
      display_name: string; birth_date: string | null
      avatar_url: string | null; created_at: string
    }>(),

    ctx.env.DB.prepare(
      `SELECT id, from_member, to_member, edge_type, relation_type, status, start_date, end_date
       FROM relationships WHERE family_id = ? ORDER BY created_at ASC`
    ).bind(resolvedFamilyId).all<{
      id: string; from_member: string; to_member: string
      edge_type: string; relation_type: string | null
      status: string | null; start_date: string | null; end_date: string | null
    }>(),
  ])

  return Response.json({
    family,
    members: members.results,
    relationships: relationships.results,
  })
}
