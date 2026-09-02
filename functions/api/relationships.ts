/**
 * POST /api/relationships
 * 在兩個現有成員之間建立新關係邊。
 * 沿用 members.ts 的 RELATION_TO_EDGE 方向規則。
 *
 * Request body:
 * {
 *   from_member_id:  string   // 「關係主體」，方向由 relation_key 定義
 *   to_member_id:    string   // 「關係對象」（target）
 *   relation_key:    string   // 'relation_spouse' | 'relation_child' | 'relation_parent'
 *   // marriage 預設 status = 'current'
 * }
 *
 * 方向規則（以 from_member_id 為新成員視角）：
 *   relation_spouse  → marriage，id 小者為 from，大者為 to
 *   relation_child   → parent_child，to_member_id 為父（from），from_member_id 為子（to）
 *   relation_parent  → parent_child，from_member_id 為父（from），to_member_id 為子（to）
 *
 * 重複防止：同 (from,to,edge_type) 組合已存在則拒絕（409）。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'

function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

const RELATION_TO_EDGE: Record<string, { edge: string; direction: 'from_target' | 'to_target' | 'marriage' }> = {
  relation_spouse:  { edge: 'marriage',     direction: 'marriage'    },
  relation_child:   { edge: 'parent_child', direction: 'to_target'  }, // to_member_id 是父，from_member_id 是子
  relation_parent:  { edge: 'parent_child', direction: 'from_target' }, // from_member_id 是父，to_member_id 是子
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const { from_member_id, to_member_id, relation_key } = body as {
    from_member_id?: string; to_member_id?: string; relation_key?: string
  }

  if (!from_member_id) return Response.json({ ok: false, error: '缺少 from_member_id' }, { status: 400 })
  if (!to_member_id)   return Response.json({ ok: false, error: '缺少 to_member_id' }, { status: 400 })
  if (!relation_key)   return Response.json({ ok: false, error: '缺少 relation_key' }, { status: 400 })
  if (from_member_id === to_member_id)
    return Response.json({ ok: false, error: '不可對同一成員建立關係' }, { status: 400 })

  const mapping = RELATION_TO_EDGE[relation_key]
  if (!mapping)
    return Response.json({ ok: false, error: `不支援的 relation_key：${relation_key}` }, { status: 400 })

  // 確認兩個成員都存在且屬同一 family
  const fromMember = await ctx.env.DB.prepare(
    'SELECT id, family_id FROM members WHERE id = ?'
  ).bind(from_member_id).first<{ id: string; family_id: string }>()
  if (!fromMember) return Response.json({ ok: false, error: '找不到 from_member_id 成員' }, { status: 404 })

  const toMember = await ctx.env.DB.prepare(
    'SELECT id, family_id FROM members WHERE id = ?'
  ).bind(to_member_id).first<{ id: string; family_id: string }>()
  if (!toMember) return Response.json({ ok: false, error: '找不到 to_member_id 成員' }, { status: 404 })

  if (fromMember.family_id !== toMember.family_id)
    return Response.json({ ok: false, error: '兩位成員不屬於同一家族' }, { status: 400 })

  // 計算實際 from/to
  let actualFrom: string, actualTo: string
  if (mapping.direction === 'marriage') {
    ;[actualFrom, actualTo] = from_member_id < to_member_id
      ? [from_member_id, to_member_id]
      : [to_member_id, from_member_id]
  } else if (mapping.direction === 'to_target') {
    // to_member_id 是父（from），from_member_id 是子（to）
    actualFrom = to_member_id; actualTo = from_member_id
  } else {
    // from_target: from_member_id 是父（from），to_member_id 是子（to）
    actualFrom = from_member_id; actualTo = to_member_id
  }

  // 重複防止：同 (from, to, edge_type) 已存在則拒絕
  const existing = await ctx.env.DB.prepare(
    'SELECT id FROM relationships WHERE from_member = ? AND to_member = ? AND edge_type = ?'
  ).bind(actualFrom, actualTo, mapping.edge).first<{ id: string }>()
  if (existing)
    return Response.json({ ok: false, error: '此關係邊已存在，不可重複建立' }, { status: 409 })

  const relId = genId()
  const status = mapping.edge === 'marriage' ? 'current' : null
  await ctx.env.DB.prepare(
    'INSERT INTO relationships (id, family_id, from_member, to_member, edge_type, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(relId, fromMember.family_id, actualFrom, actualTo, mapping.edge, status).run()

  return Response.json({ ok: true, relationship_id: relId, edge_type: mapping.edge, from_member: actualFrom, to_member: actualTo })
}
