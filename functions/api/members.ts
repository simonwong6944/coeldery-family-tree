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
 *   phone?:            string     // 電話，person 必填（server-side normalize）
 *   relation_key?:     string     // b3 locale key，如 'relation_spouse' / 'relation_child' 等
 *   target_member_id?: string     // 與哪位現有成員建立關係（選了 relation_key 才有效）
 *
 *   // pet only
 *   owner_member_ids?: string[]   // 主人的 member.id 陣列（從現有成員選擇）
 * }
 *
 * Response: { ok: true, member_id: string, relationship_ids: string[] }
 *
 * person 加人流程（額外步驟）：
 *   1. 讀 family_session cookie → SELECT family_sessions → 攞 actorMemberNo（加人者）
 *      攞唔到 → 401（確保操作者已登入）
 *   2. 85AI lookup → lk.isMember=true → linkedMemberNo = lk.memberNo；否則 null
 *   3. INSERT members 帶 coeldery85_member_id（會員 member_no 或 NULL）
 *
 * pet 加人：唔強制 cookie 認證，coeldery85_member_id 維持 NULL，其餘邏輯不變。
 *
 * ⚠️  安全鐵律：
 *     FAMILY_TREE_API_KEY 只作 Bearer header，絕不出現喺 body / log / 前端
 *
 * Cloudflare Pages Function — edge runtime
 * bindings: DB (D1)
 * secret:   FAMILY_TREE_API_KEY
 */

import type { Env } from './_types'
import { lookup85AiByPhone } from './family/_lookup85ai'

/* ════════════════════════════════════════════════════════════
 * 工具函式
 * ════════════════════════════════════════════════════════════ */

function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 從 Cookie header string parse 出指定 cookie 值
 * （複製 me.ts / invite.ts 同款 helper，避免 cross-import）
 */
function parseCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const prefix = `${name}=`
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length)
    }
  }
  return undefined
}

/* ════════════════════════════════════════════════════════════
 * relation_key → edge_type + 方向（以「新成員」為視角）
 * ════════════════════════════════════════════════════════════ */
const RELATION_TO_EDGE: Record<string, { edge: string; direction: 'from_target' | 'to_target' | 'marriage' }> = {
  relation_spouse:     { edge: 'marriage',     direction: 'marriage'     },
  relation_child:      { edge: 'parent_child', direction: 'to_target'   }, // target → 新成員（target 是父，新成員是子）
  relation_parent:     { edge: 'parent_child', direction: 'from_target'  }, // 新成員 → target（新成員是父，target 是子）
  // relation_sibling 有獨立處理路徑（共享父母），不在此表
  relation_grandchild: { edge: 'parent_child', direction: 'to_target'   },
  relation_other:      { edge: 'parent_child', direction: 'to_target'   },
}

/* ════════════════════════════════════════════════════════════
 * Main handler
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const { member_kind, display_name, birth_date, gender, relation_key, target_member_id, owner_member_ids, phone } = body as {
    family_id?: string; member_kind?: string; display_name?: string; birth_date?: string
    gender?: string; relation_key?: string; target_member_id?: string; owner_member_ids?: string[]
    phone?: string
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

  // ════════════════════════════════════════════════════════
  // person 專屬流程（pet 跳過此整個區塊）
  // ════════════════════════════════════════════════════════
  let phoneNorm: string | null = null
  let linkedMemberNo: string | null = null   // 85AI lookup 得到的 member_no（或 null）

  if (member_kind === 'person') {

    // ── ① cookie 認證：確保加人者已登入 ──
    const cookieHeader  = ctx.request.headers.get('cookie')
    const sessionToken  = parseCookieValue(cookieHeader, 'family_session')
    if (!sessionToken) {
      return Response.json({ ok: false, error: '請先登入' }, { status: 401 })
    }
    const sessionRow = await ctx.env.DB.prepare(
      "SELECT member_no FROM family_sessions WHERE token = ? AND expires_at > datetime('now')"
    ).bind(sessionToken).first<{ member_no: string }>()
    if (!sessionRow) {
      return Response.json({ ok: false, error: '請先登入' }, { status: 401 })
    }
    // actorMemberNo 記入（可供日後 audit log 使用）
    const _actorMemberNo = sessionRow.member_no   // eslint-disable-line @typescript-eslint/no-unused-vars

    // ── ② phone normalize ──
    const rawPhone = typeof phone === 'string' ? phone : ''
    let n = rawPhone.replace(/\D/g, '')
    if (n.startsWith('852')) n = n.slice(3)
    if (n.length > 8) n = n.slice(-8)
    if (!/^\d{8}$/.test(n))
      return Response.json({ ok: false, error: '電話格式錯誤' }, { status: 400 })
    phoneNorm = n

    // ── ③ 85AI lookup（查被加者電話）──
    const apiKey = ctx.env.FAMILY_TREE_API_KEY
    if (!apiKey) {
      return Response.json(
        { ok: false, error: '家族樹服務未設定，請聯絡管理員' },
        { status: 503 }
      )
    }
    const lk = await lookup85AiByPhone(apiKey, phoneNorm)
    if (!lk.ok) {
      // upstream 錯：原樣透傳 httpStatus + body，唔加料
      return new Response(JSON.stringify(lk.body), {
        status:  lk.httpStatus,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (lk.isMember === true) {
      // 被加者係 85AI 會員 → 記住其 member_no 以便寫入 coeldery85_member_id
      linkedMemberNo = lk.memberNo
    }
    // lk.isMember === false → linkedMemberNo 維持 null（非會員照建 node，唔綁 member_no）
  }

  // ── 建立成員節點 ──
  const memberId = genId()
  try {
    await ctx.env.DB.prepare(
      'INSERT INTO members (id, family_id, member_kind, display_name, birth_date, gender, phone, coeldery85_member_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      memberId,
      familyId,
      member_kind,
      display_name.trim(),
      birth_date ?? null,
      gender ?? null,
      phoneNorm,          // person → normalize 後電話；pet → null
      linkedMemberNo,     // person 85AI 會員 → member_no；person 非會員 / pet → null
    ).run()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.toLowerCase().includes('unique'))
      return Response.json({ ok: false, error: '此電話已登記，請改用登入' }, { status: 409 })
    throw e
  }

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
