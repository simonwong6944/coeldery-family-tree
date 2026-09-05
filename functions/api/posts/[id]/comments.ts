/**
 * POST /api/posts/:id/comments — 新增留言
 *
 * Request body: { body: string }
 *   body 空 → 400
 * author_member_id 由 _currentMember helper 取得（is_self 成員）
 * 貼文唔存在 → 404
 *
 * Response 201: { ok: true, comment: { id, post_id, author_member_id, author_name, body, created_at } }
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

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const postId = ctx.params['id'] as string
  if (!postId) return Response.json({ ok: false, error: '缺少 post id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { memberId: authorId } = cur

  // 2. Parse body
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const commentBody = typeof body.body === 'string' ? body.body.trim() : ''
  if (!commentBody)
    return Response.json({ ok: false, error: '留言內容不可為空' }, { status: 400 })

  // 3. 確認貼文存在
  const post = await ctx.env.DB.prepare(
    'SELECT id FROM posts WHERE id = ?'
  ).bind(postId).first<{ id: string }>()
  if (!post) return Response.json({ ok: false, error: '找不到此貼文' }, { status: 404 })

  // 4. 插入留言
  const commentId = genId()
  await ctx.env.DB.prepare(
    'INSERT INTO post_comments (id, post_id, author_member_id, body) VALUES (?, ?, ?, ?)'
  ).bind(commentId, postId, authorId, commentBody).run()

  // 5. 取作者名
  const author = await ctx.env.DB.prepare(
    'SELECT display_name FROM members WHERE id = ?'
  ).bind(authorId).first<{ display_name: string }>()

  return Response.json({
    ok: true,
    comment: {
      id:               commentId,
      post_id:          postId,
      author_member_id: authorId,
      author_name:      author?.display_name ?? '',
      body:             commentBody,
      created_at:       new Date().toISOString().replace('T', ' ').slice(0, 19),
    },
  }, { status: 201 })
}
