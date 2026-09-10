/**
 * GET /api/festivals — 節日曆（推廣嘅對象場合）
 *
 * 用途：家庭聚會首頁「即將到來」顯示節日 → 一撳可安排節日聚會（例：中秋訂枱），
 *       而節日聚會嘅商戶揀選器會顯示該節日嘅商戶推廣（見 /api/promotions）。
 *
 * Query：
 *   ?all=1      包含已過節日（預設只回未過）
 *   ?days=120   只看未來 N 日內（預設 120；all=1 時忽略）
 *
 * 規格：family_gather.md §6（節日推廣）、rules §23（忌辰零廣告不受此影響）
 * 認證：必須登入
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'

export interface FestivalRow {
  id: string
  name: string
  date: string
  is_lunar: number
  sort_order: number
}

/** 今日（UTC）凌晨毫秒 */
function todayUTCms(): number {
  const n = new Date()
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
}

/** 某日 YYYY-MM-DD 距今日（UTC）嘅日數（今日 = 0） */
export function daysUntil(dateStr: string, todayMs: number): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return Number.NaN
  return Math.round((Date.UTC(y, m - 1, d) - todayMs) / 86_400_000)
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const cur = await getCurrentMember(ctx.env.DB, ctx.request)
  if (!cur.ok) return cur.response   // 401

  const params = new URL(ctx.request.url).searchParams
  const all  = params.get('all') === '1'
  const days = Math.min(Math.max(Number(params.get('days') ?? 120) || 120, 1), 400)

  const rows = await ctx.env.DB
    .prepare(
      `SELECT id, name, date, is_lunar, sort_order
       FROM festival
       WHERE is_active = 1
       ORDER BY date ASC`
    )
    .all<FestivalRow>()

  const today = todayUTCms()
  const festivals = (rows.results ?? [])
    .map(f => ({ ...f, days_until: daysUntil(f.date, today) }))
    .filter(f => all || (f.days_until >= 0 && f.days_until <= days))
    .sort((a, b) => a.days_until - b.days_until)

  return Response.json({ ok: true, festivals })
}
