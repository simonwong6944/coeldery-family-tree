/**
 * FamilyGather — 家庭聚會（#/family-gather）＝**行動中心**
 *
 * 定位（product_decisions v1.8/v1.9）：
 *   家庭圈＝畀祝福（情感）；家庭聚會＝採取行動（有目的 → 商戶才有推廣機會）。
 *   故此頁**唔會列出商戶目錄**：只有用戶撳「訂餐廳／訂蛋糕／買禮物／送花」嗰刻，
 *   商戶才以可篩選清單（類型／地區／排序）出現（見 MerchantPicker）。
 *
 * 版面：① 即將到來（生日／節日／重要日子提醒 → 一鍵去安排）
 *       ② 需要安排什麼？（快速安排 tiles）
 *       ③ 我的聚會
 * 忌辰：唔可以發起聚會；「去安排」只走莊重分支（獻上思念／送上鮮花，零廣告）—— rules §23 / spec §7
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import GatherList from './GatherList'
import GatherPlanForm from './GatherPlanForm'
import GatherQuickStart from './GatherQuickStart'
import type { OptionKind } from '../utils/gatherPlan'
import { gsPage, gsMain, gsCard, gsMuted, gsSectionTitle, gsRow, gsBtnPrimary, gsBtnGhost } from './gatherStyles'

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
}

interface Reminder {
  member_id: string; display_name: string
  type: 'birthday' | 'memorial' | 'custom' | 'festival'
  date: string; days_until: number; age: number | null; label?: string
}

const TILES: { kind: OptionKind; icon: string; labelKey: string }[] = [
  { kind: 'place', icon: '🍽', labelKey: 'gather.need_place' },
  { kind: 'cake',  icon: '🎂', labelKey: 'gather.need_cake' },
  { kind: 'gift',  icon: '🎁', labelKey: 'gather.need_gift' },
  { kind: 'date',  icon: '📅', labelKey: 'gather.need_date' },
]

const tileStyle: React.CSSProperties = {
  flex: '1 1 44%', minHeight: '88px', borderRadius: '16px', cursor: 'pointer',
  border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-card)',
  color: 'var(--color-primary)', fontFamily: 'inherit', fontSize: '17px', fontWeight: 'bold',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px',
}

export default function FamilyGather() {
  const { t } = useTranslation()

  /* 入口參數（mount 時讀一次）：#/family-gather?plan=1&occasion=&subject=&date= ／ ?scene=memorial */
  const entry = useMemo(() => {
    const p = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
    return {
      solemn:  p.get('scene') === 'memorial',
      plan:    p.get('plan') === '1',
      occasion: p.get('occasion') ?? undefined,
      subject:  p.get('subject') ?? undefined,
      date:     p.get('date') ?? undefined,
    }
  }, [])

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loaded, setLoaded] = useState(false)
  const [quick, setQuick] = useState<{ kind: OptionKind; solemn: boolean } | null>(
    entry.solemn ? { kind: 'gift', solemn: true } : null,
  )
  const [planOpen, setPlanOpen] = useState(entry.plan)
  const [planInitial, setPlanInitial] = useState<{ occasion?: string; subject?: string; date?: string } | undefined>(
    entry.plan ? { occasion: entry.occasion, subject: entry.subject, date: entry.date } : undefined,
  )

  useEffect(() => {
    fetch('/api/reminders', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { reminders?: Reminder[] }) => { setReminders(d.reminders ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const titleOf = (r: Reminder) =>
    r.type === 'birthday' ? t('gather.remind_birthday', { name: r.display_name })
    : r.type === 'memorial' ? t('gather.remind_memorial', { name: r.display_name })
    : r.label ? `${r.label}（${r.display_name}）`
    : r.display_name

  const iconOf = (r: Reminder) => (r.type === 'memorial' ? '🕯️' : r.type === 'custom' ? '📅' : '🎂')

  const occasionOf = (r: Reminder) =>
    r.type === 'birthday' ? 'birthday' : r.type === 'festival' ? 'festival' : 'other'

  return (
    <div style={gsPage}>
      <TopBar titleKey="gather.page_title" onBack={() => { window.location.hash = '#/' }} />
      <main style={gsMain}>
        <p style={{ margin: '16px 16px 4px', fontSize: '16px', color: 'var(--color-text-secondary)' }}>{t('gather.intro')}</p>

        {/* ① 即將到來：提醒 → 一鍵去安排 */}
        <h3 style={gsSectionTitle}>{t('gather.upcoming_title')}</h3>
        {loaded && reminders.length === 0 && (
          <p style={{ ...gsMuted, margin: '0 16px 12px' }}>{t('gather.upcoming_empty')}</p>
        )}
        {reminders.map(r => {
          const solemn = r.type === 'memorial'
          return (
            <article key={`${r.member_id}-${r.type}-${r.date}`} style={gsCard}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span aria-hidden="true" style={{ fontSize: '26px' }}>{iconOf(r)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--color-text)' }}>{titleOf(r)}</div>
                  <div style={{ ...gsMuted, marginTop: '2px' }}>
                    {r.date}
                    {r.age != null ? `・${t(r.type === 'memorial' ? 'gather.remind_years' : 'gather.remind_age', { n: r.age })}` : ''}
                    {'・'}
                    {r.days_until === 0 ? t('gather.remind_today') : t('gather.remind_days', { n: r.days_until })}
                  </div>
                </div>
              </div>
              <div style={gsRow}>
                {solemn ? (
                  <button style={gsBtnGhost} onClick={() => setQuick({ kind: 'gift', solemn: true })}>
                    💐 {t('gather.action_solemn')}
                  </button>
                ) : (
                  <button
                    style={gsBtnPrimary}
                    onClick={() => {
                      setPlanInitial({ occasion: occasionOf(r), subject: r.member_id, date: r.date })
                      setPlanOpen(true)
                    }}
                  >
                    {t('gather.action_arrange')}
                  </button>
                )}
              </div>
            </article>
          )
        })}

        {/* ② 快速安排：需要服務嗰刻才出商戶 */}
        <h3 style={gsSectionTitle}>{t('gather.tiles_title')}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '0 16px 12px' }}>
          <button style={tileStyle} onClick={() => { setPlanInitial(undefined); setPlanOpen(true) }}>
            <span aria-hidden="true" style={{ fontSize: '26px' }}>🗓</span>{t('gather.plan_title')}
          </button>
          {TILES.map(x => (
            <button key={x.kind} style={tileStyle} onClick={() => setQuick({ kind: x.kind, solemn: false })}>
              <span aria-hidden="true" style={{ fontSize: '26px' }}>{x.icon}</span>{t(x.labelKey)}
            </button>
          ))}
        </div>

        {/* ③ 我的聚會 */}
        <GatherList />
      </main>

      <BottomTabBar current="family_gathering" onTabChange={(tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }} />

      {quick && (
        <GatherQuickStart
          kind={quick.kind}
          solemn={quick.solemn}
          initial={planInitial}
          onClose={() => setQuick(null)}
        />
      )}
      {planOpen && (
        <GatherPlanForm
          initial={planInitial}
          onClose={() => setPlanOpen(false)}
          onCreated={id => { setPlanOpen(false); window.location.hash = `#/gather/${id}` }}
        />
      )}
    </div>
  )
}
