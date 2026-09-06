/**
 * GET /api/reminders — 家庭提醒事件（30 天內）
 *
 * 階段一：生日（birthday）+ 忌辰（memorial）
 * 階段二：成員自訂重要日子（custom）← 本次新增
 * 階段三（待做）：家庭節日 + 農曆（festival）
 *
 * 回應 schema 已預留 type / source 欄位供後續階段擴充，
 * type ∈ { 'birthday', 'memorial', 'custom' }，source 固定 'member'。
 *
 * 邏輯：
 *   1. 用 _currentMember 攞當前 family（搵唔到 → 跟 helper 回 4xx）
 *   2. SELECT 全部 person 成員（birth_date / deceased_date / gender）
 *   3. 各自計「今年下一次」周年日 + days_until + age
 *      - 閏日（2/29）出世者：平年當 3/1 處理
 *      - 「已過就出年」：今年周年日 < 今日 UTC 凌晨 → 改用明年
 *   4. 攞 member_important_dates，JOIN members 確保 family 隔離
 *      - is_recurring=1（每年）：用 nextAnniversary，days <= 30 先出
 *      - is_recurring=0（只一次）：直接算距今 UTC days，0-30 先出，過期排除
 *   5. 共用一個 reminders 陣列，按 days_until 升序排
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'
import { getCurrentMember } from './_currentMember'

/* ── DB row 型別 ── */
interface MemberRow {
  id:             string
  display_name:   string
  birth_date:     string | null   // YYYY-MM-DD
  deceased_date:  string | null   // YYYY-MM-DD
  gender:         string | null
}

/* ── member_important_dates JOIN members row 型別 ── */
interface ImportantDateRow {
  id:           string
  member_id:    string
  label:        string
  date:         string           // YYYY-MM-DD
  is_recurring: number           // 1 = 每年, 0 = 只一次
  display_name: string
  gender:       string | null
}

/* ── 回應 item 型別（預留 type / source / age / label 供三階段擴充）── */
export interface ReminderItem {
  member_id:    string
  display_name: string
  type:         'birthday' | 'memorial' | 'custom' | 'festival'
  source:       'member' | 'family' | 'system'
  date:         string          // 今年那次周年日（或一次性日子），YYYY-MM-DD
  days_until:   number          // 0 = 今日，正整數 = 幾日後
  age:          number | null   // birthday: 屆時歲數；memorial: 忌年數；custom/festival: null
  gender:       string | null
  label?:       string          // 自訂日子名稱（生日/忌辰留 undefined）
}

/**
 * 計算「今年（或明年）下一次周年日」及 days_until。
 *
 * @param todayY  今年年份（UTC）
 * @param todayM  今日月份，1-based（UTC）
 * @param todayD  今日日期，1-based（UTC）
 * @param eventMD 事件月日字串，格式 "MM-DD"（從 birth_date / deceased_date / date 截取）
 * @returns { nextDate: Date（UTC 凌晨）, days: number, year: number }
 *
 * 閏日處理：
 *   - 事件為 2/29，今年是平年 → 改用 3/1
 *   - 「已過就出年」：若以上計算結果仍 < 今日 UTC 凌晨，year += 1 再算一次
 *     （明年若仍是平年同樣用 3/1）
 */
function nextAnniversary(
  todayY: number, todayM: number, todayD: number,
  eventMD: string,
): { nextDate: Date; days: number; year: number } {
  const [evMonthStr, evDayStr] = eventMD.split('-')
  const evMonth = parseInt(evMonthStr, 10)  // 1-based
  const evDay   = parseInt(evDayStr,   10)

  /* 今日 UTC 凌晨（比較基準）*/
  const todayUTC = Date.UTC(todayY, todayM - 1, todayD)

  function candidateDate(y: number): Date {
    // 閏日（2/29）平年改 3/1
    if (evMonth === 2 && evDay === 29) {
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0)
      if (!isLeap) return new Date(Date.UTC(y, 2, 1))   // 3/1
    }
    return new Date(Date.UTC(y, evMonth - 1, evDay))
  }

  let year = todayY
  let d    = candidateDate(year)

  // 已過（嚴格小於今日凌晨）→ 改用明年
  if (d.getTime() < todayUTC) {
    year += 1
    d     = candidateDate(year)
  }

  const days = Math.round((d.getTime() - todayUTC) / 86_400_000)
  return { nextDate: d, days, year }
}

/* ── GET /api/reminders ── */
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  // 1. 攞當前 family（搵唔到 → helper 已含清晰 4xx）
  const cur = await getCurrentMember(ctx.env.DB)
  if (!cur.ok) return cur.response

  const { familyId } = cur

  // 2. 攞全部 person 成員（只撈需要的欄，全部 .bind() 綁參數）
  const membersRes = await ctx.env.DB
    .prepare(
      `SELECT id, display_name, birth_date, deceased_date, gender
       FROM members
       WHERE family_id = ? AND member_kind = 'person'`
    )
    .bind(familyId)
    .all<MemberRow>()

  // 3. 計今日 UTC 年月日（統一基準，避免邊界問題）
  const now      = new Date()
  const todayY   = now.getUTCFullYear()
  const todayM   = now.getUTCMonth() + 1   // 1-based
  const todayD   = now.getUTCDate()
  const todayUTC = Date.UTC(todayY, todayM - 1, todayD)

  const reminders: ReminderItem[] = []

  for (const m of membersRes.results) {
    // ── 生日 ──
    if (m.birth_date) {
      const birthMD = m.birth_date.slice(5)   // "MM-DD"
      const birthY  = parseInt(m.birth_date.slice(0, 4), 10)

      const { nextDate, days, year } = nextAnniversary(todayY, todayM, todayD, birthMD)

      if (days <= 30) {
        const age = year - birthY   // 屆時歲數
        // 格式化成 YYYY-MM-DD（UTC）
        const dateStr = nextDate.toISOString().slice(0, 10)
        reminders.push({
          member_id:    m.id,
          display_name: m.display_name,
          type:         'birthday',
          source:       'member',
          date:         dateStr,
          days_until:   days,
          age,
          gender:       m.gender,
        })
      }
    }

    // ── 忌辰 ──
    if (m.deceased_date) {
      const memMD = m.deceased_date.slice(5)   // "MM-DD"
      const memY  = parseInt(m.deceased_date.slice(0, 4), 10)

      const { nextDate, days, year } = nextAnniversary(todayY, todayM, todayD, memMD)

      if (days <= 30) {
        const age  = year - memY    // 忌年數（第 N 年）
        const dateStr = nextDate.toISOString().slice(0, 10)
        reminders.push({
          member_id:    m.id,
          display_name: m.display_name,
          type:         'memorial',
          source:       'member',
          date:         dateStr,
          days_until:   days,
          age,
          gender:       m.gender,
        })
      }
    }
  }

  // ── 自訂重要日子（member_important_dates）──
  // JOIN members 確保 family_id 隔離，勿信 member_id 就照出
  const importantRes = await ctx.env.DB
    .prepare(
      `SELECT d.id, d.member_id, d.label, d.date, d.is_recurring,
              m.display_name, m.gender
       FROM member_important_dates d
       JOIN members m ON m.id = d.member_id
       WHERE m.family_id = ? AND m.member_kind = 'person'`
    )
    .bind(familyId)
    .all<ImportantDateRow>()

  for (const d of importantRes.results) {
    if (d.is_recurring === 1) {
      // ── 每年重複：用 nextAnniversary（同生日/忌辰邏輯）──
      const eventMD = d.date.slice(5)   // "MM-DD"
      const { nextDate, days } = nextAnniversary(todayY, todayM, todayD, eventMD)

      if (days <= 30) {
        reminders.push({
          member_id:    d.member_id,
          display_name: d.display_name,
          type:         'custom',
          source:       'member',
          date:         nextDate.toISOString().slice(0, 10),
          days_until:   days,
          age:          null,   // 自訂日子 v1 不顯示年數
          gender:       d.gender,
          label:        d.label,
        })
      }
    } else {
      // ── 只一次：直接計距今 UTC 日數，過期排除 ──
      const parts  = d.date.split('-')
      const dYear  = parseInt(parts[0] ?? '0', 10)
      const dMonth = parseInt(parts[1] ?? '0', 10)   // 1-based
      const dDay   = parseInt(parts[2] ?? '0', 10)

      const target = Date.UTC(dYear, dMonth - 1, dDay)
      const days   = Math.round((target - todayUTC) / 86_400_000)

      // days < 0 → 已過期，永不再現；days > 30 → 超出窗口
      if (days >= 0 && days <= 30) {
        reminders.push({
          member_id:    d.member_id,
          display_name: d.display_name,
          type:         'custom',
          source:       'member',
          date:         d.date,   // 一次性日子直接用原始日期
          days_until:   days,
          age:          null,
          gender:       d.gender,
          label:        d.label,
        })
      }
    }
  }

  // 4. 按 days_until 升序排（生日/忌辰/自訂日子共用）
  reminders.sort((a, b) => a.days_until - b.days_until)

  return Response.json({ ok: true, reminders })
}
