/**
 * GET /api/merchants-meta — 商戶篩選選項（地區／類型／標籤）
 *
 * 只回傳**至少有一個已上架（is_listed = 1）商戶**嘅選項，避免出現空篩選。
 * 供「家庭聚會 → 需要服務嗰刻」嘅商戶揀選器用（地區／類型／排序）。
 *
 * 規格：.coappery/family_gather.md §1（復用 merchant 平台，不新建商戶 schema）
 * 認證：必須登入（商戶資料只對已登入用戶開放，與 /api/merchants 一致）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const categories = await ctx.env.DB
    .prepare(
      `SELECT id, name, sort_order
       FROM merchant_category
       WHERE EXISTS (
         SELECT 1 FROM merchant m WHERE m.category_id = merchant_category.id AND m.is_listed = 1
       )
       ORDER BY sort_order ASC, name ASC`
    )
    .all<{ id: string; name: string; sort_order: number }>()

  const groups = await ctx.env.DB
    .prepare(
      `SELECT id, name FROM district_group ORDER BY created_at ASC, name ASC`
    )
    .all<{ id: string; name: string }>()

  const districts = await ctx.env.DB
    .prepare(
      `SELECT d.id, d.name, d.group_id
       FROM district d
       WHERE EXISTS (
         SELECT 1 FROM merchant m
         JOIN landmark lm ON lm.id = m.landmark_id
         WHERE lm.district_id = d.id AND m.is_listed = 1
       )
       ORDER BY d.name ASC`
    )
    .all<{ id: string; name: string; group_id: string }>()

  const tags = await ctx.env.DB
    .prepare(
      `SELECT t.id, t.name, t.category_id
       FROM merchant_tag t
       WHERE EXISTS (
         SELECT 1 FROM merchant_tag_map mm
         JOIN merchant m ON m.id = mm.merchant_id
         WHERE mm.tag_id = t.id AND m.is_listed = 1
       )
       ORDER BY t.name ASC`
    )
    .all<{ id: string; name: string; category_id: string | null }>()

  const dRows = districts.results ?? []

  return Response.json({
    ok: true,
    categories: categories.results ?? [],
    regions: (groups.results ?? []).map(g => ({
      id: g.id,
      name: g.name,
      districts: dRows.filter(d => d.group_id === g.id).map(d => ({ id: d.id, name: d.name })),
    })),
    tags: tags.results ?? [],
  })
}
