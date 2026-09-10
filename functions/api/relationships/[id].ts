/**
 * /api/relationships/:id
 *   PATCH  — 修改關係邊屬性：
 *              marriage     : status（current/divorced/separated/widowed）、start_date、end_date
 *              parent_child : relation_type（biological/adopted/step）
 *   DELETE — 刪除關係邊（限錯誤輸入；Rule 20：離婚只改 status，不刪記錄）
 *
 * 認證：必須登入 + 該邊屬登入者家族。
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'
import { getCurrentMember } from '../_currentMember'

const ALLOWED_STATUS        = ['current', 'divorced', 'separated', 'widowed'] as const
const ALLOWED_RELATION_TYPE = ['biological', 'adopted', 'step'] as const
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const relId = ctx.params['id'] as string
  if (!relId) return Response.json({ ok: false, error: '缺少 id' }, { status: 400 })

  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const rel = await ctx.env.DB.prepare(
    'SELECT id, family_id, edge_type FROM relationships WHERE id = ?'
  ).bind(relId).first<{ id: string; family_id: string; edge_type: string }>()
  if (!rel) return Response.json({ ok: false, error: '找不到此關係邊' }, { status: 404 })
  if (!cur.familyIds.includes(rel.family_id))
    return Response.json({ ok: false, error: '無權修改此家族樹的關係' }, { status: 403 })

  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  const sets: string[]  = []
  const binds: unknown[] = []

  if (has('status')) {
    if (rel.edge_type !== 'marriage')
      return Response.json({ ok: false, error: '只有婚姻邊可改 status' }, { status: 400 })
    const st = body.status
    if (!(ALLOWED_STATUS as readonly unknown[]).includes(st))
      return Response.json({ ok: false, error: `status 只允許：${ALLOWED_STATUS.join(' / ')}` }, { status: 400 })
    sets.push('status = ?'); binds.push(st)
  }

  if (has('relation_type')) {
    if (rel.edge_type !== 'parent_child')
      return Response.json({ ok: false, error: '只有親子邊可改 relation_type' }, { status: 400 })
    const rt = body.relation_type
    if (rt !== null && !(ALLOWED_RELATION_TYPE as readonly unknown[]).includes(rt))
      return Response.json(
        { ok: false, error: `relation_type 只允許：${ALLOWED_RELATION_TYPE.join(' / ')} 或 null` },
        { status: 400 },
      )
    sets.push('relation_type = ?'); binds.push(rt)
  }

  for (const k of ['start_date', 'end_date'] as const) {
    if (has(k)) {
      const v = body[k]
      if (v !== null && (typeof v !== 'string' || !DATE_RE.test(v)))
        return Response.json({ ok: false, error: `${k} 格式須為 YYYY-MM-DD 或 null` }, { status: 400 })
      sets.push(`${k} = ?`); binds.push(v)
    }
  }

  if (sets.length === 0)
    return Response.json({ ok: false, error: '請提供至少一個可修改欄位' }, { status: 400 })

  binds.push(relId)
  await ctx.env.DB.prepare(`UPDATE relationships SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds).run()

  return Response.json({ ok: true, relationship_id: relId })
}

/* ════════════════════════════════════════════════════════════
 * DELETE — 刪除關係邊（只作修正錯誤輸入；離婚／離世一律只改 status）
 * ════════════════════════════════════════════════════════════ */
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const relId = ctx.params['id'] as string
  if (!relId) return Response.json({ ok: false, error: '缺少 id' }, { status: 400 })

  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response

  const rel = await ctx.env.DB.prepare(
    'SELECT id, family_id FROM relationships WHERE id = ?'
  ).bind(relId).first<{ id: string; family_id: string }>()
  if (!rel) return Response.json({ ok: false, error: '找不到此關係邊' }, { status: 404 })
  if (!cur.familyIds.includes(rel.family_id))
    return Response.json({ ok: false, error: '無權刪除此家族樹的關係' }, { status: 403 })

  await ctx.env.DB.prepare('DELETE FROM relationships WHERE id = ?').bind(relId).run()

  return Response.json({ ok: true, deleted_relationship_id: relId })
}
