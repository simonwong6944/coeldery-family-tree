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
