/**
 * POST   /api/posts/:id/comments — 新增留言
 * DELETE /api/posts/:id/comments — 刪除留言（限作者本人）
 * PATCH  /api/posts/:id/comments — 修改留言內文（限作者本人）
 *
 * POST body:   { body: string }
 *   body 空 → 400
 * DELETE body or query: { comment_id: string }
 *   缺 comment_id → 400
 *   comment 不屬此 post → 404
 *   非作者 → 403
 * PATCH body or query comment_id + body JSON: { comment_id: string, body: string }
 *   缺 comment_id → 400
 *   body 空 → 400
 *   comment 不屬此 post → 404
 *   非作者 → 403
 *   成功 → { ok: true, comment: { id, post_id, author_member_id, body, created_at } }
 *
 * author_member_id 由 _currentMember helper 取得（is_self 成員）
 * 貼文唔存在 → 404（POST）
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
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response

  const { primaryMemberId: authorId } = cur

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

/* ─── DELETE /api/posts/:id/comments ─── */
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const postId = ctx.params['id'] as string
  if (!postId)
    return Response.json({ ok: false, error: '缺少 post id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response

  const { primaryMemberId: memberId } = cur

  // 2. 取得 comment_id（支援 body 或 query string）
  let commentId: string | null = null

  const url  = new URL(ctx.request.url)
  const qCid = url.searchParams.get('comment_id')
  if (qCid) {
    commentId = qCid
  } else {
    try {
      const body = await ctx.request.json() as Record<string, unknown>
      if (typeof body.comment_id === 'string') commentId = body.comment_id
    } catch { /* body 可能為空，無視 */ }
  }

  if (!commentId)
    return Response.json({ ok: false, error: '缺少 comment_id' }, { status: 400 })

  // 3. 查該留言（確認存在 + 屬於此 post）
  interface CommentMeta { id: string; post_id: string; author_member_id: string }
  const comment = await ctx.env.DB
    .prepare('SELECT id, post_id, author_member_id FROM post_comments WHERE id = ? AND post_id = ?')
    .bind(commentId, postId)
    .first<CommentMeta>()

  if (!comment)
    return Response.json({ ok: false, error: '找不到此留言' }, { status: 404 })

  // 4. 確認係作者本人（非作者 → 403）
  if (comment.author_member_id !== memberId)
    return Response.json({ ok: false, error: '只可修改或刪除本人建立的內容' }, { status: 403 })

  // 5. 刪除留言
  await ctx.env.DB
    .prepare('DELETE FROM post_comments WHERE id = ? AND post_id = ?')
    .bind(commentId, postId)
    .run()

  return Response.json({ ok: true, deleted_comment_id: commentId })
}

/* ─── PATCH /api/posts/:id/comments ─── */
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const postId = ctx.params['id'] as string
  if (!postId)
    return Response.json({ ok: false, error: '缺少 post id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response

  const { primaryMemberId: memberId } = cur

  // 2. 一次過 parse body（同時取 comment_id 與新 body 文字）
  //    query string 優先取 comment_id（與 DELETE 一致）；body 文字只從 JSON body 取
  const url  = new URL(ctx.request.url)
  const qCid = url.searchParams.get('comment_id')

  let commentId: string | null = qCid ?? null
  let newBody = ''

  if (!qCid) {
    // 無 query string → 從 body 同時取兩個欄位
    let parsed: Record<string, unknown>
    try { parsed = await ctx.request.json() as Record<string, unknown> }
    catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

    if (typeof parsed.comment_id === 'string') commentId = parsed.comment_id
    newBody = typeof parsed.body === 'string' ? parsed.body.trim() : ''
  } else {
    // 有 query string comment_id → body 文字仍從 JSON body 取
    let parsed: Record<string, unknown>
    try { parsed = await ctx.request.json() as Record<string, unknown> }
    catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

    newBody = typeof parsed.body === 'string' ? parsed.body.trim() : ''
  }

  if (!commentId)
    return Response.json({ ok: false, error: '缺少 comment_id' }, { status: 400 })

  if (!newBody)
    return Response.json({ ok: false, error: '留言內容不可為空' }, { status: 400 })

  // 3. 查該留言（確認存在 + 屬於此 post，並取 created_at 供回傳）
  interface CommentFull {
    id: string
    post_id: string
    author_member_id: string
    created_at: string
  }
  const comment = await ctx.env.DB
    .prepare('SELECT id, post_id, author_member_id, created_at FROM post_comments WHERE id = ? AND post_id = ?')
    .bind(commentId, postId)
    .first<CommentFull>()

  if (!comment)
    return Response.json({ ok: false, error: '找不到此留言' }, { status: 404 })

  // 4. 確認係作者本人（非作者 → 403）
  if (comment.author_member_id !== memberId)
    return Response.json({ ok: false, error: '只可修改或刪除本人建立的內容' }, { status: 403 })

  // 5. 更新留言文字
  await ctx.env.DB
    .prepare('UPDATE post_comments SET body = ? WHERE id = ? AND post_id = ?')
    .bind(newBody, commentId, postId)
    .run()

  return Response.json({
    ok: true,
    comment: {
      id:               comment.id,
      post_id:          comment.post_id,
      author_member_id: comment.author_member_id,
      body:             newBody,
      created_at:       comment.created_at,
    },
  })
}
