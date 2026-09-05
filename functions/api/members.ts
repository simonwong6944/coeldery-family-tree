/**
 * POST /api/members
 * 建立新成員節點 + 關係邊。
 * 接收 B3AddMember.tsx 提交的資料。
 *
 * Request body (JSON):
 * {
 *   family_id?:        string     // 可選；空則自動找或建立第一棵樹
 *   member_kind:       'person' | 'pet'
 *   display_name:      string
 *   birth_date?:       string     // ISO 8601 date，可選
 *   gender?:           'male' | 'female'  // 可選；不傳或 undefined → NULL
 *
 *   // person only
 *   relation_key?:     string     // b3 locale key，如 'relation_spouse' / 'relation_child' 等
 *   target_member_id?: string     // 與哪位現有成員建立關係（選了 relation_key 才有效）
 *
 *   // pet only
 *   owner_member_ids?: string[]   // 主人的 member.id 陣列（從現有成員選擇）
 * }
 *
 * Response: { ok: true, member_id: string, relationship_ids: string[] }
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'

function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// relation_key → edge_type + 方向（以「新成員」為視角）
const RELATION_TO_EDGE: Record<string, { edge: string; direction: 'from_target' | 'to_target' | 'marriage' }> = {
  relation_spouse:     { edge: 'marriage',     direction: 'marriage'     },
  relation_child:      { edge: 'parent_child', direction: 'to_target'   }, // target → 新成員（target 是父，新成員是子）
  relation_parent:     { edge: 'parent_child', direction: 'from_target'  }, // 新成員 → target（新成員是父，target 是子）
  // relation_sibling 有獨立處理路徑（共享父母），不在此表
  relation_grandchild: { edge: 'parent_child', direction: 'to_target'   },
  relation_other:      { edge: 'parent_child', direction: 'to_target'   },
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const { member_kind, display_name, birth_date, gender, relation_key, target_member_id, owner_member_ids } = body as {
    family_id?: string; member_kind?: string; display_name?: string; birth_date?: string
    gender?: string; relation_key?: string; target_member_id?: string; owner_member_ids?: string[]
  }

  // ── 驗證 gender（只接受 'male'、'female' 或 undefined）──
  if (gender !== undefined && gender !== 'male' && gender !== 'female')
    return Response.json({ ok: false, error: "gender 只接受 'male' 或 'female'" }, { status: 400 })

  if (!member_kind || !['person', 'pet'].includes(member_kind))
    return Response.json({ ok: false, error: 'member_kind 必須為 person 或 pet' }, { status: 400 })
  if (!display_name || display_name.trim().length === 0)
    return Response.json({ ok: false, error: 'display_name 不可為空' }, { status: 400 })

  // ── 取得 / 建立 family ──
  let familyId = (body.family_id as string | undefined)?.trim()
  if (!familyId) {
    const first = await ctx.env.DB.prepare('SELECT id FROM families ORDER BY created_at ASC LIMIT 1').first<{ id: string }>()
    if (first) {
      familyId = first.id
    } else {
      familyId = genId()
      await ctx.env.DB.prepare('INSERT INTO families (id, name) VALUES (?, ?)').bind(familyId, '陳家').run()
    }
  }

  // ── 建立成員節點 ──
  const memberId = genId()
  await ctx.env.DB.prepare(
    'INSERT INTO members (id, family_id, member_kind, display_name, birth_date, gender) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(memberId, familyId, member_kind, display_name.trim(), birth_date ?? null, gender ?? null).run()

  // ── 建立關係邊 ──
  const relationshipIds: string[] = []

  if (member_kind === 'person' && relation_key && target_member_id) {
    // ── 兄弟姊妹：共享父母邏輯（獨立路徑）──
    if (relation_key === 'relation_sibling') {
      const target = await ctx.env.DB.prepare(
        'SELECT id FROM members WHERE id = ? AND family_id = ?'
      ).bind(target_member_id, familyId).first<{ id: string }>()

      if (target) {
        // 查出 target 的所有父母（target 是 to_member 的 parent_child 邊之 from_member）
        const parentRows = await ctx.env.DB.prepare(
          "SELECT from_member FROM relationships WHERE family_id = ? AND edge_type = 'parent_child' AND to_member = ?"
        ).bind(familyId, target.id).all<{ from_member: string }>()

        if (parentRows.results.length > 0) {
          // 為每個父母建立 parent_child 邊（parent → 新成員）
          for (const row of parentRows.results) {
            const relId = genId()
            await ctx.env.DB.prepare(
              "INSERT INTO relationships (id, family_id, from_member, to_member, edge_type) VALUES (?, ?, ?, ?, 'parent_child')"
            ).bind(relId, familyId, row.from_member, memberId).run()
            relationshipIds.push(relId)
          }
        }
        // 若 target 尚無父母：不建邊，孤立同代（build_log 已記錄此限制）
      }
    } else {
      // ── 一般關係處理 ──
      const mapping = RELATION_TO_EDGE[relation_key]
      if (mapping) {
        const target = await ctx.env.DB.prepare(
          'SELECT id FROM members WHERE id = ? AND family_id = ?'
        ).bind(target_member_id, familyId).first<{ id: string }>()

        if (target) {
          const relId = genId()
          let fromId: string, toId: string
          if (mapping.direction === 'marriage') {
            ;[fromId, toId] = target.id < memberId ? [target.id, memberId] : [memberId, target.id]
          } else if (mapping.direction === 'to_target') {
            fromId = target.id; toId = memberId
          } else {
            fromId = memberId; toId = target.id
          }
          await ctx.env.DB.prepare(
            'INSERT INTO relationships (id, family_id, from_member, to_member, edge_type, status) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(relId, familyId, fromId, toId, mapping.edge, mapping.edge === 'marriage' ? 'current' : null).run()
          relationshipIds.push(relId)
        }
      }
    }
  }

  if (member_kind === 'pet' && owner_member_ids && owner_member_ids.length > 0) {
    for (const ownerId of owner_member_ids) {
      const ownerExists = await ctx.env.DB.prepare(
        'SELECT id FROM members WHERE id = ? AND family_id = ?'
      ).bind(ownerId, familyId).first<{ id: string }>()
      if (ownerExists) {
        const relId = genId()
        await ctx.env.DB.prepare(
          "INSERT INTO relationships (id, family_id, from_member, to_member, edge_type) VALUES (?, ?, ?, ?, 'pet_owner')"
        ).bind(relId, familyId, ownerId, memberId).run()
        relationshipIds.push(relId)
      }
    }
  }

  return Response.json({ ok: true, member_id: memberId, relationship_ids: relationshipIds })
}
