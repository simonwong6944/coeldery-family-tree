/**
 * /api/members/:id
 *
 * DELETE — 真・刪除成員（限錯誤輸入）
 *   連帶清走所有 from_member / to_member 為該 id 的 relationships，再 DELETE member。
 *   Rule 19：此路由只用於清除錯誤輸入；離婚/離世不走此路由。
 *
 * PATCH — 只准改 deceased_date、is_self、gender（守紅線 4：禁改姓名/生日）
 *   body: { deceased_date?: string | null, is_self?: 0 | 1, gender?: 'male' | 'female' | null }
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'

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

  // 守紅線 4：只允許改 deceased_date、is_self、gender，禁改姓名/生日
  const allowedKeys = ['deceased_date', 'is_self', 'gender']
  const bodyKeys = Object.keys(body)
  const forbidden = bodyKeys.filter(k => !allowedKeys.includes(k))
  if (forbidden.length > 0)
    return Response.json({ ok: false, error: `不允許修改欄位：${forbidden.join(', ')}` }, { status: 400 })

  // 確認成員存在
  const member = await ctx.env.DB.prepare(
    'SELECT id, family_id FROM members WHERE id = ?'
  ).bind(memberId).first<{ id: string; family_id: string }>()
  if (!member) return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })

  // ── 處理 is_self ──
  if ('is_self' in body) {
    const isSelf = body.is_self
    if (isSelf !== 0 && isSelf !== 1)
      return Response.json({ ok: false, error: 'is_self 只接受 0 或 1' }, { status: 400 })
    if (isSelf === 1) {
      // 先將同 family 所有成員設回 0
      await ctx.env.DB.prepare(
        'UPDATE members SET is_self = 0 WHERE family_id = ?'
      ).bind(member.family_id).run()
    }
    await ctx.env.DB.prepare(
      'UPDATE members SET is_self = ? WHERE id = ?'
    ).bind(isSelf, memberId).run()
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
    return Response.json({ ok: false, error: '缺少可更新的欄位（deceased_date、is_self 或 gender）' }, { status: 400 })

  const deceasedDate = body.deceased_date as string | null
  if (deceasedDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(deceasedDate))
    return Response.json({ ok: false, error: 'deceased_date 格式須為 YYYY-MM-DD' }, { status: 400 })

  await ctx.env.DB.prepare(
    'UPDATE members SET deceased_date = ? WHERE id = ?'
  ).bind(deceasedDate, memberId).run()

  return Response.json({ ok: true, member_id: memberId, deceased_date: deceasedDate })
}
