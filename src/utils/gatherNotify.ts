/**
 * gatherNotify — 聚會通知（純邏輯，可獨立測試）
 *
 * v1 通知方式：
 *   ① App 內：家庭聚會首頁「即將舉行的聚會」（已確認 + 快將到期 + 倒數）
 *   ② 一鍵通知家人：navigator.share 或 WhatsApp 分享（用戶自己揀收訊人）
 *
 * ⚠️ 真正 server-side push（自動 WhatsApp 發送每位家人）需要兩個前置：
 *   (a) 家人**電話**（現時電話只喺 CoEldery85，冇 member_no → 電話 反查 API）
 *   (b) Meta 已審批嘅 WhatsApp template（現時 WHATSAPP_* secret 已接好但 template 未批）
 *   兩者備妥前，一律用分享方式（唔會誤導用戶以為已自動通知）。
 */

export interface NotifyOption {
  kind: string
  label: string
  status: string
  option_date: string | null
  option_time: string | null
  pickup_place: string | null
  merchant?: { id: string; name: string | null; address?: string | null } | null
}

/** 取某類別已確認嘅候選（唯一類別只會有一個） */
export function confirmedOf(options: NotifyOption[], kind: string): NotifyOption | undefined {
  return options.find(o => o.kind === kind && o.status === 'confirmed')
}

/** 聚會日期：已確認日期優先，否則目標日期 */
export function gatheringDate(g: { plan_date?: string | null; target_date?: string | null }): string | null {
  return g.plan_date ?? g.target_date ?? null
}

/** 今日（UTC）凌晨毫秒 */
export function todayUTCms(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
}

/** 距今（UTC）日數；今日 = 0，已過 = 負數；無日期 = null */
export function daysToGathering(date: string | null, todayMs = todayUTCms()): number | null {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return null
  return Math.round((Date.UTC(y, m - 1, d) - todayMs) / 86_400_000)
}

/** 只保留「今日或之後」嘅聚會，並按日期排序（無日期排最後） */
export function upcomingGatherings<T extends { plan_date?: string | null; target_date?: string | null }>(
  list: T[], todayMs = todayUTCms(),
): Array<T & { _days: number | null }> {
  return list
    .map(g => ({ ...g, _days: daysToGathering(gatheringDate(g), todayMs) }))
    .filter(g => g._days !== null && g._days >= 0)
    .sort((a, b) => (a._days ?? 9999) - (b._days ?? 9999))
}

/** 聚會通知文字（分享用；日期／地點／蛋糕／禮物取自已確認候選） */
export function buildShareText(args: {
  title: string
  date?: string | null
  note?: string | null
  options?: NotifyOption[]
  url?: string
}): string {
  const lines: string[] = [`🎉 ${args.title}`]
  const opts  = args.options ?? []
  const dateOpt = confirmedOf(opts, 'date')
  const place   = confirmedOf(opts, 'place')
  const cake    = confirmedOf(opts, 'cake')
  const gift    = confirmedOf(opts, 'gift')

  const when = [dateOpt?.option_date ?? args.date, dateOpt?.option_time].filter(Boolean).join(' ')
  if (when) lines.push(`📅 ${when}`)
  if (place) lines.push(`📍 ${place.label}${place.merchant?.address ? '（' + place.merchant.address + '）' : ''}`)
  if (cake) {
    const pickup = [cake.pickup_place, cake.option_date, cake.option_time].filter(Boolean).join(' ')
    lines.push(`🎂 ${cake.label}${pickup ? '（取貨：' + pickup + '）' : ''}`)
  }
  if (gift) lines.push(`🎁 ${gift.label}`)
  if (args.note) lines.push(`📝 ${args.note}`)
  if (args.url) lines.push(`詳情：${args.url}`)
  return lines.join('\n')
}

/** WhatsApp 分享鏈結（無指定收訊人 → 用戶自己揀） */
export function whatsappShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** 分享（Web Share）→ 失敗／不支援就複製到剪貼簿 */
export async function shareText(text: string, url?: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ text, url })
      return 'shared'
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url ? `${text}\n${url}` : text)
      return 'copied'
    }
    return 'failed'
  } catch {
    return 'failed'
  }
}
