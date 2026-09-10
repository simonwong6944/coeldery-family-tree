/**
 * /api/growth-album/:id
 *   DELETE — 刪除一張成長相簿項目（限登入者家族）
 *
 * 認證：必須登入；項目必須屬登入者家族
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../_types'
import { getCurrentMember } from '../_currentMember'

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const id = ctx.params['id'] as string
  if (!id) return Response.json({ ok: false, error: '缺少 id' }, { status: 400 })

  const item = await ctx.env.DB
    .prepare('SELECT id, family_id, synced_post_id FROM growth_album_items WHERE id = ?')
    .bind(id)
    .first<{ id: string; family_id: string; synced_post_id: string | null }>()
  if (!item) return Response.json({ ok: false, error: '找不到此項目' }, { status: 404 })
  if (!cur.familyIds.includes(item.family_id))
    return Response.json({ ok: false, error: '無權刪除此項目' }, { status: 403 })

  await ctx.env.DB.prepare('DELETE FROM growth_album_items WHERE id = ?').bind(id).run()

  /* 一併刪除同步出嘅家庭圈貼文（連留言／讚好由 FK cascade）*/
  if (item.synced_post_id) {
    await ctx.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(item.synced_post_id).run()
  }

  return Response.json({ ok: true, deleted_item_id: id })
}

/* ════════════════════════════════════════════════════════════
 * PATCH — 編輯成長相簿項目（caption / year / month）
 *   同時更新已同步嘅家庭圈貼文內容（body_text = caption）
 * ════════════════════════════════════════════════════════════ */
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const id = ctx.params['id'] as string
  if (!id) return Response.json({ ok: false, error: '缺少 id' }, { status: 400 })

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const item = await ctx.env.DB
    .prepare('SELECT id, family_id, synced_post_id FROM growth_album_items WHERE id = ?')
    .bind(id)
    .first<{ id: string; family_id: string; synced_post_id: string | null }>()
  if (!item) return Response.json({ ok: false, error: '找不到此項目' }, { status: 404 })
  if (!cur.familyIds.includes(item.family_id))
    return Response.json({ ok: false, error: '無權修改此項目' }, { status: 403 })

  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k)
  if (!has('caption') && !has('year') && !has('month'))
    return Response.json({ ok: false, error: '請提供至少一個可修改欄位（caption、year 或 month）' }, { status: 400 })

  const sets: string[] = []
  const binds: unknown[] = []

  if (has('caption')) {
    const c = body.caption
    if (c !== null && typeof c !== 'string')
      return Response.json({ ok: false, error: 'caption 須為字串或 null' }, { status: 400 })
    const cap = typeof c === 'string' ? c.trim() : ''
    sets.push('caption = ?'); binds.push(cap === '' ? null : cap)
  }
  if (has('year')) {
    const y = body.year
    if (!Number.isInteger(y) || (y as number) < 1900 || (y as number) > 2100)
      return Response.json({ ok: false, error: 'year 無效' }, { status: 400 })
    sets.push('year = ?'); binds.push(y)
  }
  if (has('month')) {
    const m = body.month
    if (!Number.isInteger(m) || (m as number) < 1 || (m as number) > 12)
      return Response.json({ ok: false, error: 'month 無效（1-12）' }, { status: 400 })
    sets.push('month = ?'); binds.push(m)
  }

  binds.push(id)
  await ctx.env.DB
    .prepare(`UPDATE growth_album_items SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run()

  /* 若有同步出家庭圈貼文，更新其內文（caption）*/
  if (has('caption') && item.synced_post_id) {
    const cap = typeof body.caption === 'string' ? (body.caption as string).trim() : ''
    await ctx.env.DB
      .prepare('UPDATE posts SET body_text = ? WHERE id = ?')
      .bind(cap === '' ? null : cap, item.synced_post_id)
      .run()
  }

  return Response.json({ ok: true, item_id: id })
}
