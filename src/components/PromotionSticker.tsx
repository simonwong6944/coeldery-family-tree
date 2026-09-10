/**
 * PromotionSticker — 商戶節日推廣卡（喺「揀商戶」清單內出現）
 *
 * 雙動作（family_gather.md §6）：
 *   ①撳「領取優惠」→ 平台記錄（一人一次、名額有限）
 *   ②「WhatsApp 預約」→ 預填訊息向商戶確認（商戶記錄；平台不涉金流）
 * 忌辰（莊重場合）唔會渲染此組件（rules §23）。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { claimPromotion } from '../utils/promotionApi'
import { claimState, defaultClaimText, waHref, type Promotion } from '../utils/promotions'
import { gsRow, gsBtnPrimary, gsBtnGhost, gsMuted } from '../pages/gatherStyles'

interface Props {
  promo: Promotion
  onClaimed?: (promotionId: string) => void
}

export default function PromotionSticker({ promo, onClaimed }: Props) {
  const { t } = useTranslation()
  const [claimed, setClaimed] = useState(promo.my_claimed)
  const [waText, setWaText]     = useState<string>(defaultClaimText(promo))
  const [busy, setBusy]         = useState(false)
  const [err, setErr]           = useState('')

  const state = claimState({ ...promo, my_claimed: claimed })

  async function claim() {
    setBusy(true); setErr('')
    const r = await claimPromotion(promo.id)
    setBusy(false)
    if (!r.ok) { setErr(r.error ?? t('promo.err_generic')); return }
    if (r.data?.wa_text) setWaText(r.data.wa_text)
    setClaimed(true)
    onClaimed?.(promo.id)
  }

  return (
    <div style={{
      marginTop: '6px', padding: '8px 10px', borderRadius: '10px',
      border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-card)',
    }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>🎁 {promo.title}</div>
      {promo.description && <div style={{ ...gsMuted, marginTop: '2px' }}>{promo.description}</div>}
      <div style={{ ...gsMuted, marginTop: '2px' }}>
        {t('gather.festival_label', { name: promo.festival_name, date: promo.festival_date })}
        {'・'}
        {promo.quota_left === null ? t('promo.quota_unlimited') : t('promo.quota', { left: promo.quota_left })}
      </div>

      <div style={{ ...gsRow, marginTop: '6px' }}>
        {state === 'claimable' && (
          <button style={gsBtnPrimary} disabled={busy} onClick={e => { e.stopPropagation(); claim() }}>
            {busy ? t('gather.saving') : t('promo.claim')}
          </button>
        )}
        {state === 'claimed' && (
          <>
            <span style={{ ...gsMuted, color: 'var(--color-primary)', fontWeight: 'bold' }}>✅ {t('promo.claimed')}</span>
            <a style={gsBtnGhost} href={waHref(promo, waText)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
              💬 {t('promo.whatsapp')}
            </a>
          </>
        )}
        {state === 'full' && <span style={gsMuted}>{t('promo.full')}</span>}
        {state === 'expired' && <span style={gsMuted}>{t('promo.expired')}</span>}
      </div>
      {err && <div style={{ ...gsMuted, color: 'var(--color-accent)', marginTop: '4px' }}>{err}</div>}
    </div>
  )
}
