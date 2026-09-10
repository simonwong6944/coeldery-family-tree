/**
 * gatherPlan — 家庭聚會「安排」純邏輯（無 React／無 fetch，可獨立測試）
 * 規格：.coappery/family_gather.md §5（聚會協作）、§7（忌辰硬攔截）、rules §23
 */

export type OptionKind = 'date' | 'place' | 'cake' | 'gift'

export const OPTION_KINDS: OptionKind[] = ['date', 'place', 'cake', 'gift']

/** 同一 kind 只可確認一項（一個日子、一個地點）；蛋糕／禮物可多項 */
export const EXCLUSIVE_KINDS: OptionKind[] = ['date', 'place']

export type VoteChoice = 'yes' | 'no' | 'maybe'
export type GatheringStatus = 'draft' | 'voting' | 'confirmed' | 'cancelled'

export const MEMORIAL_OCCASION = 'memorial'

/** 可供聚會使用嘅場合（忌辰一律禁止 —— hard guard，rules §23） */
export const PLAN_OCCASIONS = [
  'birthday', 'pet_birthday', 'anniversary', 'milestone', 'festival', 'other',
] as const
export type PlanOccasion = typeof PLAN_OCCASIONS[number]

export function isMemorialOccasion(occasion: string): boolean {
  return occasion === MEMORIAL_OCCASION
}

/** 場合是否可用於聚會（忌辰 → false） */
export function occasionAllowed(occasion: string): boolean {
  return !isMemorialOccasion(occasion) && (PLAN_OCCASIONS as readonly string[]).includes(occasion)
}

/** 家庭聚會 tab 嘅「場景」→ 聚會「場合」（忌辰回 null：唔可以發起聚會） */
export function occasionFromScene(scene: string): PlanOccasion | null {
  if (isMemorialOccasion(scene)) return null
  if (scene === 'birthday' || scene === 'anniversary' || scene === 'festival') return scene
  if (scene === 'all') return null
  return 'other'
}

export function isExclusiveKind(kind: string): boolean {
  return (EXCLUSIVE_KINDS as readonly string[]).includes(kind)
}

export interface GatherMerchantRef {
  id: string
  name: string | null
  phone: string | null
  whatsapp: string | null
  map_url: string | null
  address: string | null
  photo_url: string | null
  category_name: string | null
}

export interface GatheringOption {
  id: string
  gathering_id: string
  kind: OptionKind
  label: string
  merchant_id: string | null
  option_date: string | null
  option_time: string | null
  pickup_place: string | null
  assignee_member_id: string | null
  status: 'candidate' | 'confirmed' | 'dropped'
  note: string | null
  sort_order: number
  merchant: GatherMerchantRef | null
  assignee_name?: string | null
  tally: { yes: number; no: number; maybe: number }
  my_choice: VoteChoice | null
}

export interface Gathering {
  id: string
  title: string
  occasion_type: string
  subject_member_id: string | null
  target_date: string | null
  status: GatheringStatus
  note: string | null
  invite_post_id: string | null
  created_at: string
}

/** 按 kind 分組（維持 OPTION_KINDS 次序）；dropped 亦保留，由 UI 決定摺疊 */
export function groupByKind<T extends { kind: string }>(options: T[]): Record<OptionKind, T[]> {
  const out = { date: [], place: [], cake: [], gift: [] } as Record<OptionKind, T[]>
  for (const o of options) {
    const k = (OPTION_KINDS as readonly string[]).includes(o.kind) ? (o.kind as OptionKind) : null
    if (k) out[k].push(o)
  }
  return out
}

/** 取某 kind 已確認嘅選項（唯一類別只有一個） */
export function confirmedOption<T extends { kind: string; status: string }>(
  options: T[],
  kind: OptionKind,
): T | undefined {
  return options.find(o => o.kind === kind && o.status === 'confirmed')
}

/** 有無任何已確認候選（＝可以出最終安排／邀請卡） */
export function hasConfirmed(options: Array<{ status: string }>): boolean {
  return options.some(o => o.status === 'confirmed')
}

/** 選項副標題：日期時間／取貨地點（純顯示） */
export function optionDetail(o: Pick<GatheringOption, 'option_date' | 'option_time' | 'pickup_place' | 'merchant'>): string {
  const parts: string[] = []
  if (o.option_date) parts.push(o.option_date)
  if (o.option_time) parts.push(o.option_time)
  if (o.pickup_place) parts.push(o.pickup_place)
  if (o.merchant?.address && !o.pickup_place) parts.push(o.merchant.address)
  return parts.join(' ・ ')
}

/** 未投票家人數（用於提示「仲有 N 位家人未表態」） */
export function pendingVoterCount(memberIds: string[], votedIds: string[]): number {
  const voted = new Set(votedIds)
  return memberIds.filter(id => !voted.has(id)).length
}

export interface PlanEntry {
  plan: boolean
  occasion: string
  subject: string
  date: string
}

/** 解析 #/family-gather?plan=1&occasion=birthday&subject=<id>&date=YYYY-MM-DD */
export function planEntryFromHash(hash: string): PlanEntry {
  const q = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
  const p = new URLSearchParams(q)
  const occasion = p.get('occasion') ?? ''
  return {
    plan: p.get('plan') === '1',
    occasion: occasionAllowed(occasion) ? occasion : '',
    subject: p.get('subject') ?? '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(p.get('date') ?? '') ? (p.get('date') as string) : '',
  }
}

/** 預設聚會標題（'{{name}} 生日'／'家庭節日聚會' 等） */
export function defaultTitle(occasion: string, subjectName: string | null, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (subjectName && (occasion === 'birthday' || occasion === 'pet_birthday')) {
    return t('gather.default_title_birthday', { name: subjectName })
  }
  if (subjectName && occasion === 'anniversary') {
    return t('gather.default_title_anniversary', { name: subjectName })
  }
  return t('gather.default_title_generic', { name: subjectName ?? '' }).trim()
}
