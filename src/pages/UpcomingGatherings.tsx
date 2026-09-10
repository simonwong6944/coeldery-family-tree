/**
 * UpcomingGatherings — 「即將舉行的聚會」（家庭聚會首頁）
 *
 * App 內通知：已確認（或已定日期）而**未過**嘅聚會，按日期排序 + 倒數，
 * 一撳可以直接「通知家人」（分享／WhatsApp）。
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listGatherings, type GatheringListItem } from '../utils/gatherApi'
import { upcomingGatherings, buildShareText, shareText, gatheringDate } from '../utils/gatherNotify'
import { gsCard, gsMuted, gsRow, gsBtnGhost, gsSectionTitle, gsBadge } from './gatherStyles'

export default function UpcomingGatherings() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Array<GatheringListItem & { _days: number | null }>>([])
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    listGatherings()
      .then(list => { setItems(upcomingGatherings(list)); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  async function notify(g: GatheringListItem) {
    const url = `${window.location.origin}/#/gather/${g.id}`
    const text = buildShareText({ title: g.title, date: gatheringDate(g), url })
    const how = await shareText(text, url)
    if (how === 'copied') setToast(t('gather.notify_copied'))
    else if (how === 'failed') setToast(t('gather.notify_failed'))
  }

  return (
    <section>
      <h3 style={gsSectionTitle}>{t('gather.upcoming_gatherings')}</h3>
      {loaded && items.length === 0 && (
        <p style={{ ...gsMuted, margin: '0 16px 12px' }}>{t('gather.no_upcoming_gathering')}</p>
      )}

      {items.map(g => (
        <article key={g.id} style={gsCard}>
          <button
            onClick={() => { window.location.hash = `#/gather/${g.id}` }}
            style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>{g.title}</h4>
              <span style={gsBadge(g.status === 'confirmed' ? 'ok' : 'wait')}>{t(`gather.status_${g.status}`)}</span>
            </div>
            <p style={{ ...gsMuted, margin: '4px 0 0' }}>
              {gatheringDate(g) ?? '—'}
              {'・'}
              {g._days === 0 ? t('gather.remind_today') : t('gather.remind_days', { n: g._days ?? 0 })}
              {g.subject_name ? `・${g.subject_name}` : ''}
            </p>
          </button>
          <div style={gsRow}>
            <button style={gsBtnGhost} onClick={() => notify(g)}>📣 {t('gather.notify_family')}</button>
          </div>
        </article>
      ))}

      {toast && <p style={{ ...gsMuted, margin: '0 16px 8px', color: 'var(--color-primary)' }}>{toast}</p>}
    </section>
  )
}
