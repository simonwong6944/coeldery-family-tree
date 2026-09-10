/**
 * /api/gathering-votes
 *   POST → 逐人投票（每人對每候選項一票）：choice = yes | no | maybe | none（=收回）
 *
 * 規格：.coappery/family_gather.md §5（每人投票／RSVP）
 * 身份：登入者 primaryMemberId（per-member 登入已解鎖逐人投票）
 * 認證：必須登入，且候選屬登入者家族嘅聚會。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { loadGathering, loadOption, genId, VOTE_CHOICES } from './_gatherings'

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const { option_id, choice } = body as { option_id?: string; choice?: string }
  if (!option_id)
    return Response.json({ ok: false, error: '缺少 option_id' }, { status: 400 })

  const opt = await loadOption(ctx.env.DB, option_id)
  if (!opt) return Response.json({ ok: false, error: '找不到此候選項' }, { status: 404 })
  const g = await loadGathering(ctx.env.DB, opt.gathering_id)
  if (!g) return Response.json({ ok: false, error: '找不到此聚會' }, { status: 404 })
  if (!cur.familyIds.includes(g.family_id))
    return Response.json({ ok: false, error: '無權對此聚會投票' }, { status: 403 })
  if (g.status === 'cancelled')
    return Response.json({ ok: false, error: '已取消嘅聚會不可投票' }, { status: 400 })

  const c = String(choice ?? '')
  if (c !== 'none' && !(VOTE_CHOICES as readonly string[]).includes(c))
    return Response.json({ ok: false, error: 'choice 必須為 yes／no／maybe／none' }, { status: 400 })

  if (c === 'none') {
    await ctx.env.DB
      .prepare('DELETE FROM gathering_vote WHERE option_id = ? AND voter_member_id = ?')
      .bind(option_id, cur.primaryMemberId)
      .run()
  } else {
    await ctx.env.DB
      .prepare(
        `INSERT INTO gathering_vote (id, gathering_id, option_id, voter_member_id, choice)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (option_id, voter_member_id) DO UPDATE SET choice = excluded.choice`
      )
      .bind(genId(), opt.gathering_id, option_id, cur.primaryMemberId, c)
      .run()
  }

  const rows = await ctx.env.DB
    .prepare('SELECT choice FROM gathering_vote WHERE option_id = ?')
    .bind(option_id)
    .all<{ choice: string }>()

  const tally = { yes: 0, no: 0, maybe: 0 }
  for (const r of rows.results ?? []) {
    if (r.choice === 'yes') tally.yes++
    else if (r.choice === 'no') tally.no++
    else tally.maybe++
  }

  return Response.json({ ok: true, option_id, my_choice: c === 'none' ? null : c, tally })
}
