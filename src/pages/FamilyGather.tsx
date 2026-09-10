/**
 * FamilyGather — 家庭聚會（#/family-gather）＝**行動中心**
 *
 * 定位（product_decisions v1.8–v1.11）：
 *   家庭圈＝畀祝福（情感）；家庭聚會＝採取行動（有目的 → 商戶才有推廣機會）。
 *   首頁**唔會列出商戶目錄**：只有用戶撳「訂餐廳／訂蛋糕／買禮物／送花」嗰刻，
 *   商戶才以可篩選清單（類型／地區／排序）出現；節日聚會仲會顯示該節日嘅商戶推廣。
 *
 * 版面：① 即將到來（節日 ＋ 家人提醒 → 一鍵去安排）② 需要安排什麼？（tiles）③ 我的聚會
 * 忌辰：唔可以發起聚會；「去安排」只走莊重分支（獻上思念／送上鮮花，零廣告）—— rules §23
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import GatherList from './GatherList'
import GatherPlanForm from './GatherPlanForm'
import GatherQuickStart from './GatherQuickStart'
import UpcomingList, { type ArrangeArgs } from './UpcomingList'
import UpcomingGatherings from './UpcomingGatherings'
import type { OptionKind } from '../utils/gatherPlan'
import { gsPage, gsMain, gsSectionTitle } from './gatherStyles'

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
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

interface PlanInitial { occasion?: string; subject?: string; date?: string }

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
      festival: p.get('festival') ?? undefined,
    }
  }, [])

  const [quick, setQuick] = useState<{ kind: OptionKind; solemn: boolean } | null>(
    entry.solemn ? { kind: 'gift', solemn: true } : null,
  )
  const [planOpen, setPlanOpen] = useState(entry.plan)
  const [planInitial, setPlanInitial] = useState<PlanInitial | undefined>(
    entry.plan ? { occasion: entry.occasion, subject: entry.subject, date: entry.date } : undefined,
  )
  const [planFestivalId, setPlanFestivalId] = useState<string | undefined>(
    entry.plan ? entry.festival : undefined,
  )

  /* 「即將到來」→ 去安排 */
  function arrange(a: ArrangeArgs) {
    setPlanInitial({ occasion: a.occasion, subject: a.subject, date: a.date })
    setPlanFestivalId(a.festivalId)
    setPlanOpen(true)
  }

  return (
    <div style={gsPage}>
      <TopBar titleKey="gather.page_title" onBack={() => { window.location.hash = '#/' }} />
      <main style={gsMain}>
        <p style={{ margin: '16px 16px 4px', fontSize: '16px', color: 'var(--color-text-secondary)' }}>{t('gather.intro')}</p>

        {/* ① 即將到來：節日 ＋ 家人提醒 → 一鍵去安排（忌辰走莊重分支）*/}
        <UpcomingList onArrange={arrange} onSolemn={() => setQuick({ kind: 'gift', solemn: true })} />

        {/* ② 快速安排：需要服務嗰刻才出商戶 */}
        <h3 style={gsSectionTitle}>{t('gather.tiles_title')}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '0 16px 12px' }}>
          <button style={tileStyle} onClick={() => { setPlanInitial(undefined); setPlanFestivalId(undefined); setPlanOpen(true) }}>
            <span aria-hidden="true" style={{ fontSize: '26px' }}>🗓</span>{t('gather.plan_title')}
          </button>
          {TILES.map(x => (
            <button key={x.kind} style={tileStyle} onClick={() => setQuick({ kind: x.kind, solemn: false })}>
              <span aria-hidden="true" style={{ fontSize: '26px' }}>{x.icon}</span>{t(x.labelKey)}
            </button>
          ))}
        </div>

        {/* ③ 即將舉行的聚會（App 內通知）＋ 我的聚會 */}
        <UpcomingGatherings />
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
          initialFestivalId={planFestivalId}
          onClose={() => setPlanOpen(false)}
          onCreated={id => { setPlanOpen(false); window.location.hash = `#/gather/${id}` }}
        />
      )}
    </div>
  )
}
