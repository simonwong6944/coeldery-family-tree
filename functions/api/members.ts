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
 *                                 //   ⚠️ 只用作 85AI lookup 攞 member_no，唔再寫入 node
 *   relation_key?:     string     // b3 locale key，如 'relation_spouse' / 'relation_child' 等
 *   target_member_id?: string     // 與哪位現有成員建立關係（選了 relation_key 才有效）
 *
 *   // pet only
 *   owner_member_ids?: string[]   // 主人的 member.id 陣列（從現有成員選擇）
 * }
 *
 * Response: { ok: true, member_id: string, relationship_ids: string[], merged: boolean }
 *
 * person 去重（v1「一個家庭一棵樹」）：
 *   若該 member_no 已有節點 →
 *     同樹 → 重用該節點，唔開重複
 *     跨樹 → 合併：來源樹整個搬入目標樹（members / relationships / posts 改 family_id，
 *            並刪除空嘅來源 family），再重用該節點
 *
 * person 加人流程（額外步驟）：
 *   1. 讀 family_session cookie → SELECT family_sessions → 攞 actorMemberNo（加人者）
 *      攞唔到 → 401（確保操作者已登入）
 *   2. 85AI lookup → lk.isMember=true → linkedMemberNo = lk.memberNo
 *                   lk.isMember=false → call createNode85ai 建 NODE_ONLY
 *                     成功 → linkedMemberNo = cn.memberNo
 *                     失敗 → 硬淨 return 502（唔 INSERT 家庭樹 node）
 *   3. INSERT members 帶 coeldery85_member_id（必有值，除非提早 return）
 *      ⚠️ node 表冇 phone 欄；電話身分靠 coeldery85_member_id 追溯
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
import { getCurrentMember } from './_currentMember'
import { lookup85AiByPhone } from './family/_lookup85ai'
import { markReferralJoined } from './_referrals'
import { createNode85ai } from './family/_createNode85ai'

/* ════════════════════════════════════════════════════════════
 * 工具函式
 * ════════════════════════════════════════════════════════════ */

function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
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

  // ════════════════════════════════════════════════════════
  // 認證 + 決定 family（以登入者主樹為準）
  //   舊版：ORDER BY created_at LIMIT 1（全庫最早樹）+ 硬編碼「陳家」
  //         → 任何用戶加人都塞入同一棵樹（掛錯樹 bug）
  //   新版：getCurrentMember → primaryFamilyId；傳入 family_id 須屬登入者
  // ════════════════════════════════════════════════════════
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401「請先登入」

  let familyId = (body.family_id as string | undefined)?.trim()
  if (familyId) {
    /* 傳咗 family_id：必須屬於登入者，否則 403 */
    if (!cur.familyIds.includes(familyId)) {
      return Response.json({ ok: false, error: '無權在此家族樹加入成員' }, { status: 403 })
    }
  } else {
    /* 冇傳 → 用登入者主樹 */
    familyId = cur.primaryFamilyId
  }

  // ════════════════════════════════════════════════════════
  // 加人必須連結（person）：樹入面已有 person 時，必須提供關係對象
  //   → 避免產生沒有任何關係邊嘅漂浮節點
  //   樹入面第一位 person（開山）唔需關係
  // ════════════════════════════════════════════════════════
  if (member_kind === 'person') {
    const cnt = await ctx.env.DB
      .prepare("SELECT COUNT(*) AS n FROM members WHERE family_id = ? AND member_kind = 'person'")
      .bind(familyId)
      .first<{ n: number }>()
    if ((cnt?.n ?? 0) > 0) {
      if (!relation_key)
        return Response.json({ ok: false, error: '請選擇新成員與家人的關係' }, { status: 400 })
      if (!target_member_id)
        return Response.json({ ok: false, error: '請選擇關係對象' }, { status: 400 })
    }
  }

  // ════════════════════════════════════════════════════════
  // person 專屬流程（pet 跳過此整個區塊）
  // ════════════════════════════════════════════════════════
  let phoneNorm: string | null = null
  let linkedMemberNo: string | null = null   // 85AI lookup / createNode85ai 得到的 member_no

  if (member_kind === 'person') {

    // ── ① 加人者身份：已由上方 getCurrentMember 驗證 ──
    // actorMemberNo：加人者 member_no，用作 NODE_ONLY 建立時的 managed_by
    const actorMemberNo = cur.memberNo

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
    } else {
      // ── ④ 被加者非會員 → 向 85AI 建立 NODE_ONLY 純節點 ──
      // 抽 birthYear：birth_date 有值且符合 YYYY-MM-DD 格式才傳
      const birthYearNum: number | undefined = (() => {
        if (typeof birth_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
          return parseInt(birth_date.slice(0, 4), 10)
        }
        return undefined
      })()

      const cn = await createNode85ai(apiKey, {
        nameZh:    display_name.trim(),
        managedBy: actorMemberNo,
        ...(gender     !== undefined ? { gender }              : {}),
        ...(birthYearNum !== undefined ? { birthYear: birthYearNum } : {}),
        // deceasedDate 呢個加人流程冇收，唔傳
      })

      if (!cn.ok) {
        // 硬淨失敗：唔好 INSERT 家庭樹 node，確保本地 node 一定有 85AI 對應
        // 只記事件 log，唔記 upstream body 敏感內容
        console.error(`[members/createNode] NODE_ONLY build failed, httpStatus=${cn.httpStatus}`)
        return Response.json(
          { ok: false, error: '無法在會員系統建立成員記錄，請稍後再試' },
          { status: 502 }
        )
      }

      // NODE_ONLY 建立成功 → 綁新 member_no
      linkedMemberNo = cn.memberNo
    }
  }

  // ════════════════════════════════════════════════════════
  // 建立 / 重用成員節點（person 去重）
  //   person 若該 member_no 已有節點：
  //     - 同樹 → 重用（唔開重複節點）
  //     - 跨樹 → 合併：來源樹整個搬入目標樹，再重用該節點
  //   其餘（pet / 全新 person）→ INSERT 新節點
  // ════════════════════════════════════════════════════════
  let memberId: string
  let merged = false

  const existingNode = (member_kind === 'person' && linkedMemberNo)
    ? await ctx.env.DB
        .prepare(
          "SELECT id, family_id FROM members WHERE coeldery85_member_id = ? AND member_kind = 'person' LIMIT 1"
        )
        .bind(linkedMemberNo)
        .first<{ id: string; family_id: string }>()
    : null

  if (existingNode) {
    memberId = existingNode.id

    if (existingNode.family_id !== familyId) {
      /* ── 合併：來源樹 → 目標樹（members / relationships / posts 搬 family_id）── */
      const src = existingNode.family_id
      // is_self 保持「每棵樹最多一個」：搬入者一律清 0，目標樹原有 is_self 保留
      await ctx.env.DB.prepare('UPDATE members SET family_id = ?, is_self = 0 WHERE family_id = ?')
        .bind(familyId, src).run()
      await ctx.env.DB.prepare('UPDATE relationships SET family_id = ? WHERE family_id = ?')
        .bind(familyId, src).run()
      await ctx.env.DB.prepare('UPDATE posts SET family_id = ? WHERE family_id = ?')
        .bind(familyId, src).run()
      await ctx.env.DB.prepare('DELETE FROM families WHERE id = ?')
        .bind(src).run()
      merged = true
      console.log(`[members] 合併 family ${src} → ${familyId}（member ${memberId}）`)
    }
  } else {
    memberId = genId()
    try {
      await ctx.env.DB.prepare(
        'INSERT INTO members (id, family_id, member_kind, display_name, birth_date, gender, coeldery85_member_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        memberId,
        familyId,
        member_kind,
        display_name.trim(),
        birth_date ?? null,
        gender ?? null,
        linkedMemberNo,     // person 會員 → lookup member_no；非會員 → NODE_ONLY member_no；pet → null
      ).run()
    } catch (e: unknown) {
      // 保留 try/catch 骨架：id 撞 / 將來加約束都用得着
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('unique'))
        return Response.json({ ok: false, error: '建立成員失敗，請稍後再試' }, { status: 409 })
      throw e
    }
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

  /* ── 推薦獎勵：邀請人加咗被邀請家人 → 標記「成功加入」（Type B 解鎖條件）── */
  if (phoneNorm) {
    try {
      await markReferralJoined(ctx.env.DB, phoneNorm, linkedMemberNo ?? null, actorMemberNo)
    } catch (e) {
      console.error('[members] markReferralJoined failed:', e)
    }
  }

  return Response.json({ ok: true, member_id: memberId, relationship_ids: relationshipIds, merged })
}
