/**
 * GatherQuickStart — 首頁「快速安排」tiles／提醒卡嘅跳板
 *
 * 定位：家庭聚會＝**有目的嘅行動**。撳「訂餐廳／訂蛋糕／買禮物／送花」之後，
 * 先問「呢件事加入邊個聚會？」，冇就開新安排；之後才喺聚會詳情內揀商戶。
 * → 商戶只喺「有需要」嗰刻出現（唔會喺首頁列表）。
 *
 * 忌辰（solemn）：走**獨立莊重分支** —— 唔建立聚會、唔出任何廣告，
 * 只提供鮮花／拜祭商戶之一鍵聯絡（spec §7 / rules §23）。
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MerchantPicker from '../components/MerchantPicker'
import GatherPlanForm from './GatherPlanForm'
import { listGatherings, type GatheringListItem } from '../utils/gatherApi'
import type { OptionKind } from '../utils/gatherPlan'
import type { QueryMerchant } from '../utils/merchantQuery'
import {
  gsOverlay, gsSheet, gsMuted, gsRow, gsBtnPrimary, gsBtnGhost, gsCard,
} from './gatherStyles'

interface Props {
  kind: OptionKind
  solemn?: boolean
  initial?: { occasion?: string; subject?: string; date?: string }
  onClose: () => void
}

export default function GatherQuickStart({ kind, solemn = false, initial, onClose }: Props) {
  const { t } = useTranslation()
  const [list, setList] = useState<GatheringListItem[]>([])
  const [creating, setCreating] = useState(false)
  const [picked, setPicked] = useState<QueryMerchant | null>(null)

  useEffect(() => {
    if (solemn) return
    listGatherings().then(l => setList(l.filter(g => g.status !== 'cancelled'))).catch(() => undefined)
  }, [solemn])

  /* ── 忌辰莊重分支：只揀鮮花／拜祭商戶 → 一鍵聯絡（零廣告、零聚會） ── */
  if (solemn) {
    if (!picked) {
      return <MerchantPicker kind="gift" solemn onClose={onClose} onPick={setPicked} />
    }
    return (
      <div style={gsOverlay} onClick={onClose}>
        <div style={gsSheet} onClick={e => e.stopPropagation()}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text)' }}>
            {t('gather.solemn_title')}
          </h3>
          <p style={{ ...gsMuted, margin: 0 }}>{t('gather.memorial_notice')}</p>
          <section style={gsCard}>
            <h4 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--color-text)' }}>{picked.name}</h4>
            {picked.address && <p style={{ ...gsMuted, margin: 0 }}>{picked.address}</p>}
            <div style={gsRow}>
              {picked.phone && <a style={gsBtnGhost} href={`tel:${picked.phone}`}>📞 {t('gather.call')}</a>}
            </div>
          </section>
          <div style={gsRow}>
            <button style={gsBtnGhost} onClick={onClose}>{t('common.back')}</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── 一般分支：建立新安排 ── */
  if (creating) {
    return (
      <GatherPlanForm
        initial={initial}
        initialTitle={t(`gather.need_${kind}`)}
        onClose={onClose}
        onCreated={id => { window.location.hash = `#/gather/${id}?add=${kind}` }}
      />
    )
  }

  /* ── 一般分支：加入現有聚會 ── */
  return (
    <div style={gsOverlay} onClick={onClose}>
      <div style={gsSheet} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t('gather.quick_title', { kind: t(`gather.kind_${kind}`) })}
        </h3>
        <p style={{ ...gsMuted, margin: 0 }}>{t('gather.quick_hint')}</p>

        {list.map(g => (
          <button
            key={g.id}
            style={{ ...gsBtnGhost, textAlign: 'left', minHeight: '56px' }}
            onClick={() => { window.location.hash = `#/gather/${g.id}?add=${kind}` }}
          >
            {g.title}
          </button>
        ))}

        <div style={gsRow}>
          <button style={gsBtnPrimary} onClick={() => setCreating(true)}>＋ {t('gather.plan_title')}</button>
          <button style={gsBtnGhost} onClick={onClose}>{t('gather.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
