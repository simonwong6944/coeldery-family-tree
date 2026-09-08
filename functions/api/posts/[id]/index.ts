/**
 * DELETE /api/posts/:id — 刪除貼文（限作者本人）
 * PATCH  /api/posts/:id — 修改貼文 body_text / photo_url（限作者本人）
 *
 * 權限規則（兩個方法一致）：
 *   1. getCurrentMember 取得當前 is_self 成員 → 失敗回 4xx
 *   2. 查 posts WHERE id=?，取 family_id + author_member_id
 *      - 不存在 / 非同一 family → 404
 *      - author_member_id ≠ 當前 memberId → 403
 *   3. 通過後執行 DELETE / UPDATE
 *
 * DELETE 連帶清走：
 *   - post_comments WHERE post_id=?
 *   - post_likes    WHERE post_id=?
 *
 * PATCH 允許欄位：body_text、photo_url（皆 optional，但至少一個）
 *   其他 key → 400
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from '../../_types'
import { getCurrentMember } from '../../_currentMember'

/* ─── DB row 型別 ─── */
interface PostMeta {
  id:               string
  family_id:        string
  author_member_id: string
  body_text:        string | null
  photo_url:        string | null
  created_at:       string
}

/* ─── 共用：取貼文 meta，同時帶 family_id + author_member_id 供比對 ─── */
async function fetchPostMeta(db: D1Database, postId: string): Promise<PostMeta | null> {
  return db
    .prepare('SELECT id, family_id, author_member_id, body_text, photo_url, created_at FROM posts WHERE id = ?')
    .bind(postId)
    .first<PostMeta>()
}

/* ─── 共用：權限檢查 helper，回 null 代表通過 ─── */
async function checkAuth(
  db:       D1Database,
  postId:   string,
  familyId: string,
  memberId: string,
): Promise<{ error: Response } | null> {
  const post = await fetchPostMeta(db, postId)

  // 不存在 or 非同一 family → 404
  if (!post || post.family_id !== familyId)
    return { error: Response.json({ ok: false, error: '找不到此貼文' }, { status: 404 }) }

  // 非作者 → 403
  if (post.author_member_id !== memberId)
    return { error: Response.json({ ok: false, error: '只可修改或刪除本人建立的內容' }, { status: 403 }) }

  return null   // 通過
}

/* ─── DELETE /api/posts/:id ─── */
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const postId = ctx.params['id'] as string
  if (!postId)
    return Response.json({ ok: false, error: '缺少 post id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response

  const { familyId, memberId } = cur

  // 2. 權限檢查（存在 + 同 family + 作者本人）
  const authErr = await checkAuth(ctx.env.DB, postId, familyId, memberId)
  if (authErr) return authErr.error

  // 3. 連帶清走留言與讚好，再刪貼文本身（order 防外鍵違規）
  await ctx.env.DB.prepare('DELETE FROM post_comments WHERE post_id = ?').bind(postId).run()
  await ctx.env.DB.prepare('DELETE FROM post_likes    WHERE post_id = ?').bind(postId).run()
  await ctx.env.DB.prepare('DELETE FROM posts         WHERE id = ?'     ).bind(postId).run()

  return Response.json({ ok: true, deleted_post_id: postId })
}

/* ─── PATCH /api/posts/:id ─── */
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const postId = ctx.params['id'] as string
  if (!postId)
    return Response.json({ ok: false, error: '缺少 post id' }, { status: 400 })

  // 1. 取得當前用戶
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response

  const { familyId, memberId } = cur

  // 2. 權限檢查（存在 + 同 family + 作者本人）
  const authErr = await checkAuth(ctx.env.DB, postId, familyId, memberId)
  if (authErr) return authErr.error

  // 3. Parse body
  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  // 4. 白名單驗證：只接受 body_text / photo_url，其他 key → 400
  const ALLOWED = new Set(['body_text', 'photo_url'])
  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key))
      return Response.json({ ok: false, error: `不接受欄位：${key}，只可修改 body_text 或 photo_url` }, { status: 400 })
  }

  // 5. 提取可改欄位（undefined 代表未提供，不更新）
  const hasBodyText  = Object.prototype.hasOwnProperty.call(body, 'body_text')
  const hasPhotoUrl  = Object.prototype.hasOwnProperty.call(body, 'photo_url')

  if (!hasBodyText && !hasPhotoUrl)
    return Response.json({ ok: false, error: '請提供至少一個可修改欄位（body_text 或 photo_url）' }, { status: 400 })

  const newBodyText = hasBodyText
    ? (typeof body.body_text === 'string' ? body.body_text.trim() || null : null)
    : undefined

  const newPhotoUrl = hasPhotoUrl
    ? (typeof body.photo_url === 'string' ? body.photo_url.trim() || null : null)
    : undefined

  // 6. 動態組 SET clause（只更新有提供的欄）
  const setClauses: string[] = []
  const bindings:  unknown[] = []

  if (hasBodyText)  { setClauses.push('body_text = ?'); bindings.push(newBodyText ?? null) }
  if (hasPhotoUrl)  { setClauses.push('photo_url = ?'); bindings.push(newPhotoUrl ?? null) }

  bindings.push(postId)
  await ctx.env.DB
    .prepare(`UPDATE posts SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...bindings)
    .run()

  // 7. 取更新後的記錄回傳
  const updated = await fetchPostMeta(ctx.env.DB, postId)

  return Response.json({
    ok:   true,
    post: {
      id:               updated?.id               ?? postId,
      family_id:        updated?.family_id        ?? familyId,
      author_member_id: updated?.author_member_id ?? memberId,
      body_text:        updated?.body_text        ?? null,
      photo_url:        updated?.photo_url        ?? null,
      created_at:       updated?.created_at       ?? '',
    },
  })
}
