/**
 * GatherList — 「我的聚會」清單（嵌於家庭聚會 tab）
 * 只負責列出＋跳去詳情；「發起聚會」由家庭聚會頁嘅快速安排 tiles 負責。
 * 規格：.coappery/family_gather.md §5
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listGatherings, type GatheringListItem } from '../utils/gatherApi'
import { gsCard, gsMuted, gsBadge, gsSectionTitle } from './gatherStyles'

export default function GatherList() {
  const { t } = useTranslation()
  const [list, setList] = useState<GatheringListItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    listGatherings()
      .then(l => { setList(l); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const active = list.filter(g => g.status !== 'cancelled')

  return (
    <section>
      <h3 style={gsSectionTitle}>{t('gather.my_gatherings')}</h3>

      {loaded && active.length === 0 && (
        <p style={{ ...gsMuted, margin: '0 16px 12px' }}>{t('gather.no_gathering')}</p>
      )}

      {active.map(g => {
        const tone = g.status === 'confirmed' ? 'ok' : 'wait'
        return (
          <article key={g.id} style={gsCard}>
            <button
              onClick={() => { window.location.hash = `#/gather/${g.id}` }}
              style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>{g.title}</h4>
                <span style={gsBadge(tone)}>{t(`gather.status_${g.status}`)}</span>
              </div>
              <p style={{ ...gsMuted, margin: '4px 0 0' }}>
                {t(`gather.occ_${g.occasion_type}`)}
                {g.subject_name ? `・${g.subject_name}` : ''}
                {g.target_date ? `・${g.target_date}` : ''}
              </p>
              <p style={{ ...gsMuted, margin: '4px 0 0' }}>
                {t('gather.list_counts', { c: g.confirmed_count, o: g.option_count, v: g.voter_count })}
              </p>
            </button>
          </article>
        )
      })}
    </section>
  )
}
