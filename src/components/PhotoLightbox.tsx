/**
 * PhotoLightbox — 相片全屏檢視
 * 撳大圖、左右滑動／撳 ‹ › 切換、Esc 關閉。
 * 長者友善：關閉掣 / 左右掣熱區 ≥ 44px，文字 ≥ 16px。
 * 顏色只用 CSS var。
 */

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export interface LightboxItem {
  id: string
  url: string
  poster_url?: string | null
  media_kind: string
  year: number
  month: number
}

interface Props {
  items: LightboxItem[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
}

export default function PhotoLightbox({ items, index, onClose, onIndex }: Props) {
  const { t } = useTranslation()
  const cur = items[index]

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft'  && index > 0)                 onIndex(index - 1)
      if (e.key === 'ArrowRight' && index < items.length - 1)  onIndex(index + 1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [index, items.length, onClose, onIndex])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!cur) return null
  const isVideo = cur.media_kind === 'video'
  const hasPrev = index > 0
  const hasNext = index < items.length - 1

  /* 左右滑動 */
  let startX = 0
  const onTouchStart = (e: React.TouchEvent) => { startX = e.touches[0]?.clientX ?? 0 }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = (e.changedTouches[0]?.clientX ?? 0) - startX
    if (dx > 40 && hasPrev) onIndex(index - 1)
    else if (dx < -40 && hasNext) onIndex(index + 1)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('growth_album.title')}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'var(--overlay-lightbox)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px', boxSizing: 'border-box',
      }}
    >
      <button onClick={onClose} aria-label={t('growth_album.close')} style={closeBtn}>✕</button>

      {isVideo ? (
        <video
          src={cur.url}
          poster={cur.poster_url ?? undefined}
          controls
          playsInline
          style={{ maxWidth: '92vw', maxHeight: '74vh', borderRadius: '8px', display: 'block' }}
        />
      ) : (
        <img src={cur.url} alt="" style={{ maxWidth: '92vw', maxHeight: '74vh', objectFit: 'contain', borderRadius: '8px', display: 'block' }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
        <button onClick={() => onIndex(index - 1)} disabled={!hasPrev} aria-label={t('growth_album.prev')} style={navBtn(!hasPrev)}>‹</button>
        <span style={{ fontSize: '16px', color: 'var(--color-on-media)', minWidth: '120px', textAlign: 'center' }}>
          {t('growth_album.month_label', { year: cur.year, month: cur.month })} · {index + 1}/{items.length}
        </span>
        <button onClick={() => onIndex(index + 1)} disabled={!hasNext} aria-label={t('growth_album.next')} style={navBtn(!hasNext)}>›</button>
      </div>
    </div>
  )
}

const closeBtn: React.CSSProperties = {
  position: 'absolute', top: '12px', right: '12px',
  width: '48px', height: '48px', borderRadius: '50%',
  border: 'none', cursor: 'pointer', fontSize: '22px', lineHeight: 1,
  backgroundColor: 'var(--overlay-chip)', color: 'var(--color-text)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
function navBtn(dis: boolean): React.CSSProperties {
  return {
    width: '52px', height: '52px', borderRadius: '50%',
    border: 'none', cursor: dis ? 'not-allowed' : 'pointer',
    fontSize: '28px', lineHeight: 1, opacity: dis ? 0.35 : 1,
    backgroundColor: 'var(--overlay-chip)', color: 'var(--color-text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
