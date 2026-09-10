/**
 * /api/members/:id
 *
 * DELETE — 真・刪除成員（限錯誤輸入）
 *   連帶清走所有 from_member / to_member 為該 id 的 relationships，再 DELETE member。
 *   Rule 19：此路由只用於清除錯誤輸入；離婚/離世不走此路由。
 *
 * PATCH — 只准改 deceased_date、is_self、gender、avatar_url（守紅線 4：禁改姓名/生日）
 *   body: { deceased_date?: string | null, is_self?: 0 | 1, gender?: 'male' | 'female' | null, avatar_url?: string | null }
 *   is_self=1 = 「設為本人」：將登入者 member_no 認領此節點（節點已屬他人 → 409）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'
import { getCurrentMember } from '../_currentMember'

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const memberId = ctx.params['id'] as string
  if (!memberId) return Response.json({ ok: false, error: '缺少 id' }, { status: 400 })

  // 確認成員存在
  const member = await ctx.env.DB.prepare(
    'SELECT id, family_id FROM members WHERE id = ?'
  ).bind(memberId).first<{ id: string; family_id: string }>()
  if (!member) return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })

  // 1. 刪除所有關係邊（from 或 to 係該成員）
  await ctx.env.DB.prepare(
    'DELETE FROM relationships WHERE from_member = ? OR to_member = ?'
  ).bind(memberId, memberId).run()

  // 2. 刪除成員節點
  await ctx.env.DB.prepare(
    'DELETE FROM members WHERE id = ?'
  ).bind(memberId).run()

  return Response.json({ ok: true, deleted_member_id: memberId })
}

export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const memberId = ctx.params['id'] as string
  if (!memberId) return Response.json({ ok: false, error: '缺少 id' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  // 可改欄位（放寬紅線 4：本人改名 + 家人可改出生日期，因首次輸入常有錯）
  //   display_name → 只准「本人」改自己個名（見下方 owner 檢查）
  const allowedKeys = ['deceased_date', 'is_self', 'gender', 'avatar_url', 'display_name', 'birth_date']
  const bodyKeys = Object.keys(body)
  const forbidden = bodyKeys.filter(k => !allowedKeys.includes(k))
  if (forbidden.length > 0)
    return Response.json({ ok: false, error: `不允許修改欄位：${forbidden.join(', ')}` }, { status: 400 })

  // 確認成員存在
  const member = await ctx.env.DB.prepare(
    'SELECT id, family_id, coeldery85_member_id FROM members WHERE id = ?'
  ).bind(memberId).first<{ id: string; family_id: string; coeldery85_member_id: string | null }>()
  if (!member) return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })

  /* 必須登入 + 成員屬同一家族（防越權）*/
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response
  if (!cur.familyIds.includes(member.family_id))
    return Response.json({ ok: false, error: '無權修改此成員' }, { status: 403 })

  // ── 處理 birth_date（家人可改；YYYY-MM-DD 或 null）──
  if ('birth_date' in body) {
    const bd = body.birth_date
    if (bd !== null && (typeof bd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bd)))
      return Response.json({ ok: false, error: 'birth_date 格式須為 YYYY-MM-DD 或 null' }, { status: 400 })
    await ctx.env.DB.prepare('UPDATE members SET birth_date = ? WHERE id = ?')
      .bind(bd, memberId).run()
    return Response.json({ ok: true, member_id: memberId, birth_date: bd })
  }

  // ── 處理 display_name（只准本人改自己顯示名）──
  if ('display_name' in body) {
    const nameVal = body.display_name
    if (typeof nameVal !== 'string' || !nameVal.trim())
      return Response.json({ ok: false, error: 'display_name 須為非空字串' }, { status: 400 })
    if (!member.coeldery85_member_id || member.coeldery85_member_id !== cur.memberNo)
      return Response.json({ ok: false, error: '只可修改本人嘅顯示名' }, { status: 403 })
    await ctx.env.DB.prepare('UPDATE members SET display_name = ? WHERE id = ?')
      .bind(nameVal.trim(), memberId).run()
    return Response.json({ ok: true, member_id: memberId, display_name: nameVal.trim() })
  }

  // ── 處理 avatar_url ──
  if ('avatar_url' in body) {
    const avatarUrl = body.avatar_url
    if (avatarUrl !== null) {
      if (typeof avatarUrl !== 'string' || !avatarUrl.trim())
        return Response.json({ ok: false, error: 'avatar_url 須為非空字串或 null' }, { status: 400 })
      if (!avatarUrl.startsWith('https://'))
        return Response.json({ ok: false, error: 'avatar_url 須以 https:// 開頭' }, { status: 400 })
    }
    await ctx.env.DB.prepare(
      'UPDATE members SET avatar_url = ? WHERE id = ?'
    ).bind(avatarUrl, memberId).run()
    return Response.json({ ok: true, member_id: memberId, avatar_url: avatarUrl })
  }

  // ── 處理 is_self（＝「設為本人」：將登入者 member_no 認領此節點）──
  if ('is_self' in body) {
    const isSelf = body.is_self
    if (isSelf !== 0 && isSelf !== 1)
      return Response.json({ ok: false, error: 'is_self 只接受 0 或 1' }, { status: 400 })

    if (isSelf === 1) {
      /* 認領：節點若已屬他人 → 409（登入／家族驗證已於上方完成）*/
      const owner = member.coeldery85_member_id
      if (owner && owner !== cur.memberNo) {
        return Response.json({ ok: false, error: '此節點已屬其他成員' }, { status: 409 })
      }
      /* 綁定 coeldery85_member_id = 我；唔再清全 family，避免蓋走其他人嘅「本人」 */
      await ctx.env.DB.prepare(
        'UPDATE members SET coeldery85_member_id = ?, is_self = 1 WHERE id = ?'
      ).bind(cur.memberNo, memberId).run()
    } else {
      await ctx.env.DB.prepare(
        'UPDATE members SET is_self = 0 WHERE id = ?'
      ).bind(memberId).run()
    }
    return Response.json({ ok: true, member_id: memberId, is_self: isSelf })
  }

  // ── 處理 gender ──
  if ('gender' in body) {
    const genderVal = body.gender
    if (genderVal !== null && genderVal !== 'male' && genderVal !== 'female')
      return Response.json({ ok: false, error: "gender 只接受 'male'、'female' 或 null" }, { status: 400 })
    await ctx.env.DB.prepare(
      'UPDATE members SET gender = ? WHERE id = ?'
    ).bind(genderVal, memberId).run()
    return Response.json({ ok: true, member_id: memberId, gender: genderVal })
  }

  // ── 處理 deceased_date ──
  if (!('deceased_date' in body))
    return Response.json({ ok: false, error: '缺少可更新的欄位（deceased_date、is_self、gender 或 avatar_url）' }, { status: 400 })

  const deceasedDate = body.deceased_date as string | null
  if (deceasedDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(deceasedDate))
    return Response.json({ ok: false, error: 'deceased_date 格式須為 YYYY-MM-DD' }, { status: 400 })

  await ctx.env.DB.prepare(
    'UPDATE members SET deceased_date = ? WHERE id = ?'
  ).bind(deceasedDate, memberId).run()

  return Response.json({ ok: true, member_id: memberId, deceased_date: deceasedDate })
}
