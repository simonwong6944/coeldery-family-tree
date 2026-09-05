/**
 * POST   /api/posts/:id/like — 讚好（冪等，已讚視為成功）
 * DELETE /api/posts/:id/like — 取消讚好
 *
 * member_id 由 _currentMember helper 取得（is_self 成員）
 * 貼文唔存在 → 404
 * UNIQUE(post_id, member_id) 由 schema 防止重複 like，INSERT OR IGNORE 靜默處理
 *
 * Response: {
 *   ok: true,
 *   like_count:  number,   // 最新讚好總數
 *   isLikedByMe: boolean   // 操作後狀態
 * }
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../../_types'
import { getCurrentMember } from '../../_currentMember'

function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/** 取貼文最新讚好數 */
async function getLikeCount(db: D1Database, postId: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS cnt FROM post_likes WHERE post_id = ?')
    .bind(postId)
    .first<{ cnt: number }>()
  return row?.cnt ?? 0
}

/* ─── 共用：確認貼文存在 ─── */
async function assertPostExists(db: D1Database, postId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT id FROM posts WHERE id = ?')
    .bind(postId)
    .first<{ id: string }>()
  return !!row
}

/* ─── POST /api/posts/:id/like ─── */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const postId = ctx.params['id'] as string
  if (!postId) return Response.json({ ok: false, error: '缺少 post id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { memberId } = cur

  // 2. 確認貼文存在
  if (!(await assertPostExists(ctx.env.DB, postId)))
    return Response.json({ ok: false, error: '找不到此貼文' }, { status: 404 })

  // 3. INSERT OR IGNORE — 利用 UNIQUE(post_id, member_id) 防重，冪等
  const likeId = genId()
  await ctx.env.DB.prepare(
    'INSERT OR IGNORE INTO post_likes (id, post_id, member_id) VALUES (?, ?, ?)'
  ).bind(likeId, postId, memberId).run()

  // 4. 回傳最新狀態
  const like_count = await getLikeCount(ctx.env.DB, postId)
  return Response.json({ ok: true, like_count, isLikedByMe: true })
}

/* ─── DELETE /api/posts/:id/like ─── */
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const postId = ctx.params['id'] as string
  if (!postId) return Response.json({ ok: false, error: '缺少 post id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { memberId } = cur

  // 2. 確認貼文存在
  if (!(await assertPostExists(ctx.env.DB, postId)))
    return Response.json({ ok: false, error: '找不到此貼文' }, { status: 404 })

  // 3. 刪除讚好 row（若不存在亦不報錯，靜默 no-op）
  await ctx.env.DB.prepare(
    'DELETE FROM post_likes WHERE post_id = ? AND member_id = ?'
  ).bind(postId, memberId).run()

  // 4. 回傳最新狀態
  const like_count = await getLikeCount(ctx.env.DB, postId)
  return Response.json({ ok: true, like_count, isLikedByMe: false })
}
