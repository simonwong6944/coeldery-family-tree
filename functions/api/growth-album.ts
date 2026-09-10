/**
 * /api/growth-album
 *   GET  ?subject_member_id=<id>  → 取某成員（人或寵物）嘅成長相簿（按月分組，舊→新）
 *   POST                          → 新增一張相／片（檢查每月配額）
 *
 * 成長相簿：每位成員（含寵物）一個（product_decisions §二 / v1.6）
 * 認證：必須登入；subject 必須屬登入者家族（同 tree.ts / members.ts 一致）
 * 配額：QUOTA（_params.ts；rules §5 數字不可 hardcode）
 * 上傳：url 必須已成功上傳（rules §9；前端先上載攞 URL 再呼叫此 API）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'
import { QUOTA } from './_params'

function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

interface ItemRow {
  id: string
  media_kind: string
  url: string
  poster_url: string | null
  year: number
  month: number
  duration_seconds: number | null
  caption: string | null
  created_at: string
}

/* ════════════════════════════════════════════════════════════
 * GET — 讀取某成員嘅成長相簿
 * ════════════════════════════════════════════════════════════ */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const subjectId = new URL(ctx.request.url).searchParams.get('subject_member_id')
  if (!subjectId)
    return Response.json({ ok: false, error: '缺少 subject_member_id' }, { status: 400 })

  const subject = await ctx.env.DB
    .prepare('SELECT id, family_id FROM members WHERE id = ?')
    .bind(subjectId)
    .first<{ id: string; family_id: string }>()
  if (!subject)
    return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })
  if (!cur.familyIds.includes(subject.family_id))
    return Response.json({ ok: false, error: '無權查看此成員相簿' }, { status: 403 })

  const rows = await ctx.env.DB
    .prepare(
      `SELECT id, media_kind, url, poster_url, year, month, duration_seconds, caption, created_at
       FROM growth_album_items
       WHERE family_id = ? AND subject_member_id = ?
       ORDER BY year ASC, month ASC, created_at ASC`
    )
    .bind(subject.family_id, subjectId)
    .all<ItemRow>()

  /* 按月分組（舊→新）；已按 year/month/created_at 排序，順序 push 即得 */
  const months: Array<{ year: number; month: number; items: ItemRow[] }> = []
  for (const it of rows.results ?? []) {
    const last = months[months.length - 1]
    if (last && last.year === it.year && last.month === it.month) last.items.push(it)
    else months.push({ year: it.year, month: it.month, items: [it] })
  }

  return Response.json({
    ok: true,
    subject_member_id: subjectId,
    limits: { photo: QUOTA.photoPerMonth, video: QUOTA.videoPerMonth },
    months,
  })
}

/* ════════════════════════════════════════════════════════════
 * POST — 新增一張相／片（掛對應年月）
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  let body: Record<string, unknown>
  try { body = await ctx.request.json() as Record<string, unknown> }
  catch { return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 }) }

  const { subject_member_id, media_kind, url: mediaUrl, poster_url, year, month, caption, duration_seconds } = body as {
    subject_member_id?: string; media_kind?: string; url?: string; poster_url?: string
    year?: number; month?: number; caption?: string; duration_seconds?: number
  }

  if (!subject_member_id)
    return Response.json({ ok: false, error: '缺少 subject_member_id' }, { status: 400 })
  if (media_kind !== 'photo' && media_kind !== 'video')
    return Response.json({ ok: false, error: 'media_kind 必須為 photo 或 video' }, { status: 400 })
  if (!mediaUrl || typeof mediaUrl !== 'string' || !mediaUrl.startsWith('https://'))
    return Response.json({ ok: false, error: 'url 必須為已上傳之 https URL' }, { status: 400 })
  if (!Number.isInteger(year) || (year as number) < 1900 || (year as number) > 2100)
    return Response.json({ ok: false, error: 'year 無效' }, { status: 400 })
  if (!Number.isInteger(month) || (month as number) < 1 || (month as number) > 12)
    return Response.json({ ok: false, error: 'month 無效（1-12）' }, { status: 400 })

  let dur: number | null = null
  if (media_kind === 'video') {
    if (!Number.isInteger(duration_seconds) || (duration_seconds as number) <= 0)
      return Response.json({ ok: false, error: '短片必須提供有效 duration_seconds' }, { status: 400 })
    if ((duration_seconds as number) > QUOTA.maxVideoSeconds)
      return Response.json({ ok: false, error: `短片長度上限 ${QUOTA.maxVideoSeconds} 秒` }, { status: 400 })
    dur = duration_seconds as number
  }

  /* subject 存在 + 屬登入者家族 */
  const subject = await ctx.env.DB
    .prepare('SELECT id, family_id FROM members WHERE id = ?')
    .bind(subject_member_id)
    .first<{ id: string; family_id: string }>()
  if (!subject)
    return Response.json({ ok: false, error: '找不到此成員' }, { status: 404 })
  if (!cur.familyIds.includes(subject.family_id))
    return Response.json({ ok: false, error: '無權在此家族樹加入相片' }, { status: 403 })

  /* 每月配額（每人每樹每月 5 相 + 2 片）*/
  const limit = media_kind === 'photo' ? QUOTA.photoPerMonth : QUOTA.videoPerMonth
  const used = await ctx.env.DB
    .prepare(
      `SELECT COUNT(*) AS n FROM growth_album_items
       WHERE family_id = ? AND subject_member_id = ? AND year = ? AND month = ? AND media_kind = ?`
    )
    .bind(subject.family_id, subject_member_id, year, month, media_kind)
    .first<{ n: number }>()
  if ((used?.n ?? 0) >= limit)
    return Response.json({ ok: false, error: '本月此類內容已達配額上限' }, { status: 409 })

  const id = genId()
  await ctx.env.DB
    .prepare(
      `INSERT INTO growth_album_items
         (id, family_id, subject_member_id, media_kind, url, poster_url, year, month, duration_seconds, caption, created_by_member_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, subject.family_id, subject_member_id, media_kind, mediaUrl,
      poster_url ?? null, year, month, dur, caption ?? null, cur.memberNo,
    )
    .run()

  /* ── 單向同步家庭圈（product_decisions §二）：加入相簿 → 自動出一篇動態 ──
   *    只同步相片（短片待支援）；貼文作者 = 上傳者；刪除相簿項目會一併刪文 */
  if (media_kind === 'photo') {
    const postId = genId()
    await ctx.env.DB
      .prepare(
        `INSERT INTO posts (id, family_id, author_member_id, body_text, photo_url)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(postId, subject.family_id, cur.primaryMemberId, caption ?? null, mediaUrl)
      .run()
    await ctx.env.DB
      .prepare('UPDATE growth_album_items SET synced_post_id = ? WHERE id = ?')
      .bind(postId, id)
      .run()
  }

  return Response.json({ ok: true, item_id: id })
}

