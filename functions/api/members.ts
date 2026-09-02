/**
 * POST /api/members
 * 建立新成員節點 + 關係邊。
 * 接收 B3AddMember.tsx 提交的資料。
 *
 * Request body (JSON):
 * {
 *   family_id?:    string     // 可選；空則自動找或建立第一棵樹
 *   member_kind:   'person' | 'pet'
 *   display_name:  string
 *   birth_date?:   string     // ISO 8601 date，可選
 *
 *   // person only
 *   relation_key?: string     // b3 locale key，如 'relation_spouse' / 'relation_child' 等
 *
 *   // pet only
 *   owner_member_ids?: string[]  // 主人的 member.id 陣列（階段一：前端傳 mock id，暫存）
 * }
 *
 * Response: { ok: true, member_id: string, relationship_ids: string[] }
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'

// 輕量 nanoid 替代（純 edge runtime，無 Node.js crypto）
function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// relation_key → edge_type 對應表
// 以「我」（family owner）為視角：relation_key 是新成員與「我」的關係
const RELATION_TO_EDGE: Record<string, { edge: string; direction: 'from_me' | 'to_me' | 'marriage' }> = {
  relation_spouse:      { edge: 'marriage',      direction: 'marriage'  },
  relation_child:       { edge: 'parent_child',  direction: 'from_me'  }, // 我 → 子女
  relation_parent:      { edge: 'parent_child',  direction: 'to_me'    }, // 父母 → 我
  relation_sibling:     { edge: 'parent_child',  direction: 'from_me'  }, // 簡化：階段一不做 sibling 邊
  relation_grandchild:  { edge: 'parent_child',  direction: 'from_me'  },
  relation_other:       { edge: 'parent_child',  direction: 'from_me'  }, // 階段一 fallback
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 })
  }

  const { member_kind, display_name, birth_date, relation_key, owner_member_ids } = body as {
    family_id?: string
    member_kind?: string
    display_name?: string
    birth_date?: string
    relation_key?: string
    owner_member_ids?: string[]
  }

  // ── 驗證必填欄位 ──
  if (!member_kind || !['person', 'pet'].includes(member_kind)) {
    return Response.json({ ok: false, error: 'member_kind 必須為 person 或 pet' }, { status: 400 })
  }
  if (!display_name || display_name.trim().length === 0) {
    return Response.json({ ok: false, error: 'display_name 不可為空' }, { status: 400 })
  }

  // ── 取得 / 建立 family ──
  let familyId = (body.family_id as string | undefined)?.trim()
  if (!familyId) {
    const first = await ctx.env.DB.prepare(
      'SELECT id FROM families ORDER BY created_at ASC LIMIT 1'
    ).first<{ id: string }>()

    if (first) {
      familyId = first.id
    } else {
      // 首次使用：自動建立「陳家」預設家族樹
      familyId = genId()
      await ctx.env.DB.prepare(
        'INSERT INTO families (id, name) VALUES (?, ?)'
      ).bind(familyId, '陳家').run()
    }
  }

  // ── 建立成員節點 ──
  const memberId = genId()
  await ctx.env.DB.prepare(
    `INSERT INTO members (id, family_id, member_kind, display_name, birth_date)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(memberId, familyId, member_kind, display_name.trim(), birth_date ?? null).run()

  // ── 建立關係邊 ──
  const relationshipIds: string[] = []

  if (member_kind === 'person' && relation_key) {
    const mapping = RELATION_TO_EDGE[relation_key]
    if (mapping && mapping.edge !== 'parent_child' || mapping?.direction !== undefined) {
      // 取得「我」的 member_id（family 中最早建立的 person 成員，即 owner）
      const owner = await ctx.env.DB.prepare(
        `SELECT id FROM members WHERE family_id = ? AND member_kind = 'person'
         AND id != ? ORDER BY created_at ASC LIMIT 1`
      ).bind(familyId, memberId).first<{ id: string }>()

      if (owner && mapping) {
        const relId = genId()
        let fromId: string
        let toId: string

        if (mapping.direction === 'marriage') {
          // marriage 邊：從 id 較小者 → 較大者（保唯一性）
          ;[fromId, toId] = owner.id < memberId
            ? [owner.id, memberId]
            : [memberId, owner.id]
        } else if (mapping.direction === 'from_me') {
          fromId = owner.id
          toId = memberId
        } else {
          fromId = memberId
          toId = owner.id
        }

        await ctx.env.DB.prepare(
          `INSERT INTO relationships (id, family_id, from_member, to_member, edge_type, status)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          relId, familyId, fromId, toId,
          mapping.edge,
          mapping.edge === 'marriage' ? 'current' : null
        ).run()

        relationshipIds.push(relId)
      }
    }
  }

  if (member_kind === 'pet' && owner_member_ids && owner_member_ids.length > 0) {
    // pet_owner 邊：每位主人建立一條
    for (const ownerId of owner_member_ids) {
      // 驗證主人存在於此 family
      const ownerExists = await ctx.env.DB.prepare(
        'SELECT id FROM members WHERE id = ? AND family_id = ?'
      ).bind(ownerId, familyId).first<{ id: string }>()

      if (ownerExists) {
        const relId = genId()
        await ctx.env.DB.prepare(
          `INSERT INTO relationships (id, family_id, from_member, to_member, edge_type)
           VALUES (?, ?, ?, ?, 'pet_owner')`
        ).bind(relId, familyId, ownerId, memberId).run()
        relationshipIds.push(relId)
      }
    }
  }

  return Response.json({ ok: true, member_id: memberId, relationship_ids: relationshipIds })
}
