/**
 * PATCH /api/relationships/:id
 * 只允許修改婚姻邊的 status（current / divorced / separated / widowed）。
 * Rule 19：離婚/分居只改 status，不 DELETE 記錄。
 *
 * Request body: { status: 'current' | 'divorced' | 'separated' | 'widowed' }
 * Response: { ok: true, relationship_id: string, status: string }
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'

const ALLOWED_STATUS = ['current', 'divorced', 'separated', 'widowed'] as const
type MarriageStatus = typeof ALLOWED_STATUS[number]

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const relId = ctx.params['id'] as string
  if (!relId) return Response.json({ ok: false, error: '缺少 id' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const newStatus = body.status as string | undefined
  if (!newStatus) return Response.json({ ok: false, error: '缺少 status 欄位' }, { status: 400 })
  if (!(ALLOWED_STATUS as readonly string[]).includes(newStatus))
    return Response.json({ ok: false, error: `status 只允許：${ALLOWED_STATUS.join(' / ')}` }, { status: 400 })

  // 確認 relationship 存在且是 marriage 邊
  const rel = await ctx.env.DB.prepare(
    'SELECT id, edge_type FROM relationships WHERE id = ?'
  ).bind(relId).first<{ id: string; edge_type: string }>()
  if (!rel) return Response.json({ ok: false, error: '找不到此關係邊' }, { status: 404 })
  if (rel.edge_type !== 'marriage')
    return Response.json({ ok: false, error: '只有婚姻邊（marriage）可修改 status' }, { status: 400 })

  await ctx.env.DB.prepare(
    'UPDATE relationships SET status = ? WHERE id = ?'
  ).bind(newStatus as MarriageStatus, relId).run()

  return Response.json({ ok: true, relationship_id: relId, status: newStatus })
}
