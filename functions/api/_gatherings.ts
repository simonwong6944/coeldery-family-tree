/**
 * _gatherings — 家庭聚會共用 helper（型別、常數、驗證）
 * 規格：.coappery/family_gather.md §5（聚會協作）、§7（忌辰硬攔截）、rules §23
 *
 * ⚠️ 忌辰（memorial）**不可發起聚會**：任何建立聚會之入口（API）一律擋，
 *    唔可以靠前端唔顯示按鈕就算（§7 要求「判斷須早於一切商業邏輯」）。
 */

export const OCCASIONS = [
  'birthday',      // 生日（人）
  'pet_birthday',  // 生日（寵物）
  'anniversary',   // 結婚週年
  'milestone',     // 里程碑（入學／畢業等）
  'festival',      // 公眾節日
  'other',
] as const
export type Occasion = typeof OCCASIONS[number]

/** 忌辰：莊重場合，禁止發起聚會（family_gather.md §7 / rules §23） */
export const MEMORIAL_OCCASION = 'memorial'

export const OPTION_KINDS = ['date', 'place', 'cake', 'gift'] as const
export type OptionKind = typeof OPTION_KINDS[number]

/** 同一 kind 只可確認一項（聚餐只有一個地點、一個日子）；蛋糕／禮物可多項 */
export const EXCLUSIVE_KINDS: OptionKind[] = ['date', 'place']

export const VOTE_CHOICES = ['yes', 'no', 'maybe'] as const
export type VoteChoice = typeof VOTE_CHOICES[number]

export const GATHERING_STATUS = ['draft', 'voting', 'confirmed', 'cancelled'] as const

/** 場合是否可用於聚會（忌辰一律 false —— 硬攔截） */
export function occasionAllowed(occasion: string): boolean {
  return occasion !== MEMORIAL_OCCASION && (OCCASIONS as readonly string[]).includes(occasion)
}

export function genId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export interface GatheringRow {
  id: string
  family_id: string
  initiator_member_id: string
  title: string
  occasion_type: string
  subject_member_id: string | null
  target_date: string | null
  status: string
  note: string | null
  invite_post_id: string | null
  created_at: string
  updated_at: string
}

export interface OptionRow {
  id: string
  gathering_id: string
  kind: string
  label: string
  merchant_id: string | null
  option_date: string | null
  option_time: string | null
  pickup_place: string | null
  assignee_member_id: string | null
  status: string
  note: string | null
  sort_order: number
  created_by_member_id: string
  created_at: string
}

/** 讀聚會；唔存在回 null */
export async function loadGathering(db: D1Database, id: string): Promise<GatheringRow | null> {
  return await db
    .prepare(
      `SELECT id, family_id, initiator_member_id, title, occasion_type, subject_member_id,
              target_date, status, note, invite_post_id, created_at, updated_at
       FROM gathering WHERE id = ?`
    )
    .bind(id)
    .first<GatheringRow>()
}

/** 讀候選項；唔存在回 null */
export async function loadOption(db: D1Database, id: string): Promise<OptionRow | null> {
  return await db
    .prepare(
      `SELECT id, gathering_id, kind, label, merchant_id, option_date, option_time,
              pickup_place, assignee_member_id, status, note, sort_order,
              created_by_member_id, created_at
       FROM gathering_option WHERE id = ?`
    )
    .bind(id)
    .first<OptionRow>()
}

/** 驗證日期字串（YYYY-MM-DD）；合法回 true */
export function isDateStr(v: unknown): boolean {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

/** 驗證時間字串（HH:MM）；合法回 true */
export function isTimeStr(v: unknown): boolean {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)
}
