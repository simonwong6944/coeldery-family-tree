/**
 * CouponSticker — 優惠券卡（**統一 Type A 節日推廣券 ＋ Type B 推薦獎勵券**）
 *
 * 雙動作（family_gather.md §6）：
 *   ①撳「領取優惠」→ 平台記錄（一人一次、名額有限）
 *   ②「WhatsApp 預約」→ 預填訊息向商戶確認（商戶記錄；平台不涉金流）
 * 狀態：locked（未解鎖：推薦人數不足）／claimable／claimed／full／expired
 * 忌辰等莊重場合唔會渲染此組件（rules §23）。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { gsRow, gsBtnPrimary, gsBtnGhost, gsMuted } from '../pages/gatherStyles'

export interface CouponLike {
  id: string
  title: string
  description: string | null
  quota_left: number | null
  my_claimed: boolean
  festival_name?: string | null
  festival_date?: string | null
  required_referrals?: number | null
  merchant: { name: string | null; whatsapp?: string | null }
}

export type CouponState = 'claimable' | 'claimed' | 'locked' | 'full' | 'expired'

interface Props {
  coupon: CouponLike
  state: CouponState
  defaultText: string
  claim: () => Promise<{ ok: boolean; error?: string; data?: { wa_text?: string } }>
  onClaimed?: () => void
  lockedHint?: string
}

function waHref(whatsapp: string | null | undefined, text: string): string {
  const num = (whatsapp ?? '').replace(/\D/g, '')
  const q = encodeURIComponent(text)
  return num ? `https://wa.me/${num}?text=${q}` : `https://wa.me/?text=${q}`
}

export default function CouponSticker({ coupon, state: initialState, defaultText, claim, onClaimed, lockedHint }: Props) {
  const { t } = useTranslation()
  const [claimed, setClaimed] = useState(coupon.my_claimed)
  const [waText, setWaText]   = useState(defaultText)
  const [busy, setBusy]       = useState(false)
  const [err, setErr]         = useState('')

  const state: CouponState = claimed && initialState !== 'full' && initialState !== 'expired'
    ? 'claimed'
    : initialState

  async function doClaim() {
    setBusy(true); setErr('')
    const r = await claim()
    setBusy(false)
    if (!r.ok) { setErr(r.error ?? t('promo.err_generic')); return }
    if (r.data?.wa_text) setWaText(r.data.wa_text)
    setClaimed(true)
    onClaimed?.()
  }

  return (
    <div style={{
      marginTop: '6px', padding: '8px 10px', borderRadius: '10px',
      border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-card)',
    }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>🎁 {coupon.title}</div>
      {coupon.description && <div style={{ ...gsMuted, marginTop: '2px' }}>{coupon.description}</div>}
      <div style={{ ...gsMuted, marginTop: '2px' }}>
        {coupon.festival_name
          ? t('gather.festival_label', { name: coupon.festival_name, date: coupon.festival_date ?? '' })
          : coupon.merchant.name ?? ''}
        {'・'}
        {coupon.quota_left === null ? t('promo.quota_unlimited') : t('promo.quota', { left: coupon.quota_left })}
      </div>

      <div style={{ ...gsRow, marginTop: '6px' }}>
        {state === 'claimable' && (
          <button style={gsBtnPrimary} disabled={busy} onClick={e => { e.stopPropagation(); doClaim() }}>
            {busy ? t('gather.saving') : t('promo.claim')}
          </button>
        )}
        {state === 'locked' && (
          <span style={gsMuted}>{lockedHint ?? t('promo.locked')}</span>
        )}
        {state === 'claimed' && (
          <>
            <span style={{ ...gsMuted, color: 'var(--color-primary)', fontWeight: 'bold' }}>✅ {t('promo.claimed')}</span>
            <a style={gsBtnGhost} href={waHref(coupon.merchant.whatsapp, waText)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
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
