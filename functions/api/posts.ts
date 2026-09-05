/**
 * GET  /api/posts  — 當前 family 所有貼文（DESC created_at）
 *                    每篇含：作者名、留言列表（含作者名）、讚好數、isLikedByMe
 * POST /api/posts  — 新增貼文
 *                    body: { body_text?: string, photo_url?: string }
 *                    author_member_id 由 _currentMember helper 取得
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'

function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

/* ─── DB row 型別 ─── */
interface PostRow {
  id: string
  family_id: string
  author_member_id: string
  author_name: string
  body_text: string | null
  photo_url: string | null
  created_at: string
}

interface CommentRow {
  id: string
  post_id: string
  author_member_id: string
  author_name: string
  body: string
  created_at: string
}

interface LikeCountRow {
  post_id: string
  like_count: number
}

interface MyLikeRow {
  post_id: string
}

/* ─── GET /api/posts ─── */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { familyId, memberId: selfMemberId } = cur

  // 1. 所有貼文（JOIN 作者名）
  const postsRes = await ctx.env.DB.prepare(`
    SELECT
      p.id, p.family_id, p.author_member_id,
      m.display_name AS author_name,
      p.body_text, p.photo_url, p.created_at
    FROM posts p
    JOIN members m ON m.id = p.author_member_id
    WHERE p.family_id = ?
    ORDER BY p.created_at DESC
  `).bind(familyId).all<PostRow>()

  if (!postsRes.results.length) {
    return Response.json({ ok: true, posts: [] })
  }

  const postIds = postsRes.results.map(p => p.id)

  // 2. 全部留言（一次撈）
  const placeholders = postIds.map(() => '?').join(',')
  const commentsRes = await ctx.env.DB.prepare(`
    SELECT
      c.id, c.post_id, c.author_member_id,
      m.display_name AS author_name,
      c.body, c.created_at
    FROM post_comments c
    JOIN members m ON m.id = c.author_member_id
    WHERE c.post_id IN (${placeholders})
    ORDER BY c.created_at ASC
  `).bind(...postIds).all<CommentRow>()

  // 3. 全部讚好數（一次撈）
  const likesRes = await ctx.env.DB.prepare(`
    SELECT post_id, COUNT(*) AS like_count
    FROM post_likes
    WHERE post_id IN (${placeholders})
    GROUP BY post_id
  `).bind(...postIds).all<LikeCountRow>()

  // 4. 當前用戶讚過哪些
  const myLikesRes = await ctx.env.DB.prepare(`
    SELECT post_id
    FROM post_likes
    WHERE post_id IN (${placeholders}) AND member_id = ?
  `).bind(...postIds, selfMemberId).all<MyLikeRow>()

  // 5. 組裝 Map
  const commentsByPost = new Map<string, CommentRow[]>()
  for (const c of commentsRes.results) {
    const arr = commentsByPost.get(c.post_id) ?? []
    arr.push(c)
    commentsByPost.set(c.post_id, arr)
  }

  const likeCountByPost = new Map<string, number>()
  for (const l of likesRes.results) {
    likeCountByPost.set(l.post_id, l.like_count)
  }

  const myLikedSet = new Set(myLikesRes.results.map(r => r.post_id))

  // 6. 組裝回應
  const posts = postsRes.results.map(p => ({
    id:               p.id,
    family_id:        p.family_id,
    author_member_id: p.author_member_id,
    author_name:      p.author_name,
    body_text:        p.body_text,
    photo_url:        p.photo_url,
    created_at:       p.created_at,
    comments: (commentsByPost.get(p.id) ?? []).map(c => ({
      id:               c.id,
      author_member_id: c.author_member_id,
      author_name:      c.author_name,
      body:             c.body,
      created_at:       c.created_at,
    })),
    like_count:    likeCountByPost.get(p.id) ?? 0,
    isLikedByMe:   myLikedSet.has(p.id),
  }))

  return Response.json({ ok: true, posts })
}

/* ─── POST /api/posts ─── */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { familyId, memberId: authorId } = cur

  // 2. Parse body
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const bodyText = typeof body.body_text === 'string' ? body.body_text.trim() : null
  const photoUrl = typeof body.photo_url === 'string' ? body.photo_url.trim() : null

  // 3. 至少需要 body_text 或 photo_url 其一
  if (!bodyText && !photoUrl)
    return Response.json({ ok: false, error: '貼文須包含文字或相片其一' }, { status: 400 })

  // 4. 插入貼文
  const postId = genId()
  await ctx.env.DB.prepare(
    'INSERT INTO posts (id, family_id, author_member_id, body_text, photo_url) VALUES (?, ?, ?, ?, ?)'
  ).bind(postId, familyId, authorId, bodyText || null, photoUrl || null).run()

  // 5. 取作者名
  const author = await ctx.env.DB.prepare(
    'SELECT display_name FROM members WHERE id = ?'
  ).bind(authorId).first<{ display_name: string }>()

  return Response.json({
    ok: true,
    post: {
      id:               postId,
      family_id:        familyId,
      author_member_id: authorId,
      author_name:      author?.display_name ?? '',
      body_text:        bodyText || null,
      photo_url:        photoUrl || null,
      created_at:       new Date().toISOString().replace('T', ' ').slice(0, 19),
      comments:         [],
      like_count:       0,
      isLikedByMe:      false,
    },
  }, { status: 201 })
}
