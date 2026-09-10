/**
 * UpcomingList — 「即將到來」（家庭聚會首頁第一區）
 *
 * 合併兩類通知並按日數排序：
 *   ① 節日（/api/festivals）→ 一撳「去安排」→ 節日聚會（帶 festival_id → 揀商戶時見該節日推廣）
 *   ② 家人提醒（/api/reminders：生日／自訂重要日子／忌辰）
 *      - 普通場合 → 「去安排」（帶場合／對象／日期）
 *      - **忌辰 → 只提供「獻上思念」**（莊重分支、零廣告，rules §23）
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listFestivals } from '../utils/promotionApi'
import type { Festival } from '../utils/promotions'
import { gsCard, gsMuted, gsRow, gsBtnPrimary, gsBtnGhost, gsSectionTitle } from './gatherStyles'

interface Reminder {
  member_id: string; display_name: string
  type: 'birthday' | 'memorial' | 'custom' | 'festival'
  date: string; days_until: number; age: number | null; label?: string
}

export interface ArrangeArgs {
  occasion: string
  subject?: string
  date?: string
  festivalId?: string
}

interface Props {
  onArrange: (args: ArrangeArgs) => void
  onSolemn: () => void
}

type Row =
  | { kind: 'festival'; days: number; f: Festival }
  | { kind: 'reminder'; days: number; r: Reminder }

export default function UpcomingList({ onArrange, onSolemn }: Props) {
  const { t } = useTranslation()
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listFestivals()
      .then(l => { setFestivals(l); setLoaded(true) })
      .catch(() => setLoaded(true))
    fetch('/api/reminders', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { reminders?: Reminder[] }) => setReminders(d.reminders ?? []))
      .catch(() => undefined)
  }, [])

  const rows: Row[] = [
    ...festivals.map(f => ({ kind: 'festival' as const, days: f.days_until, f })),
    ...reminders.map(r => ({ kind: 'reminder' as const, days: r.days_until, r })),
  ].sort((a, b) => a.days - b.days)

  const titleOf = (r: Reminder) =>
    r.type === 'birthday' ? t('gather.remind_birthday', { name: r.display_name })
    : r.type === 'memorial' ? t('gather.remind_memorial', { name: r.display_name })
    : r.label ? `${r.label}（${r.display_name}）`
    : r.display_name

  const countdown = (days: number) =>
    days === 0 ? t('gather.remind_today') : t('gather.remind_days', { n: days })

  return (
    <section>
      <h3 style={gsSectionTitle}>{t('gather.upcoming_title')}</h3>
      {loaded && rows.length === 0 && (
        <p style={{ ...gsMuted, margin: '0 16px 12px' }}>{t('gather.upcoming_empty')}</p>
      )}

      {rows.map(row => {
        if (row.kind === 'festival') {
          const f = row.f
          return (
            <article key={`festival-${f.id}`} style={gsCard}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span aria-hidden="true" style={{ fontSize: '26px' }}>🎊</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--color-text)' }}>{f.name}</div>
                  <div style={{ ...gsMuted, marginTop: '2px' }}>{f.date}・{countdown(f.days_until)}</div>
                </div>
              </div>
              <div style={gsRow}>
                <button style={gsBtnPrimary} onClick={() => onArrange({ occasion: 'festival', date: f.date, festivalId: f.id })}>
                  {t('gather.action_arrange')}
                </button>
              </div>
            </article>
          )
        }

        const r = row.r
        const solemn = r.type === 'memorial'
        return (
          <article key={`${r.member_id}-${r.type}-${r.date}`} style={gsCard}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span aria-hidden="true" style={{ fontSize: '26px' }}>{solemn ? '🕯️' : r.type === 'custom' ? '📅' : '🎂'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--color-text)' }}>{titleOf(r)}</div>
                <div style={{ ...gsMuted, marginTop: '2px' }}>
                  {r.date}
                  {r.age != null ? `・${t(r.type === 'memorial' ? 'gather.remind_years' : 'gather.remind_age', { n: r.age })}` : ''}
                  {'・'}{countdown(r.days_until)}
                </div>
              </div>
            </div>
            <div style={gsRow}>
              {solemn ? (
                <button style={gsBtnGhost} onClick={onSolemn}>💐 {t('gather.action_solemn')}</button>
              ) : (
                <button
                  style={gsBtnPrimary}
                  onClick={() => onArrange({
                    occasion: r.type === 'birthday' ? 'birthday' : 'other',
                    subject: r.member_id,
                    date: r.date,
                  })}
                >
                  {t('gather.action_arrange')}
                </button>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}
