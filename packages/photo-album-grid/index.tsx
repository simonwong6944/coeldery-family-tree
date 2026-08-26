/**
 * @coeldery/photo-album-grid
 * CoEldery 85 家庭樹 — 相簿區組件（B2 成員詳情頁相簿區）
 *
 * 功能：
 *   - 區段標題（18px Bold）+ 配額文字（16px muted）
 *   - 3 欄正方形縮圖 grid（96–108px）
 *   - 新內容紅點：8px var(--color-accent)，2px 白色外圈，右上角
 *
 * 所有資料由 props 傳入，不內置任何 mock data。
 * 顏色只用 CSS var，禁止 hardcode hex。
 * 文字全部 via i18n t('key')。
 *
 * 衍生自：.coappery/design/B2_B3.md §2.1 相簿區
 */

import { useTranslation } from 'react-i18next'

/* ── Type Definitions ─── */

export interface PhotoItem {
  /** 縮圖 URL（空 → 顯示灰色 placeholder） */
  thumbnailUrl?: string
  /** 是否為新內容（右上角顯示紅點） */
  isNew?: boolean
  /** 無障礙描述（預設用 index） */
  altText?: string
}

export interface PhotoAlbumGridProps {
  /** 區段標題 i18n key（預設顯示「相簿」） */
  titleKey?: string
  /** 配額文字（如「本月 相 3/5 · 片 1/2」），直接傳字串由父層格式化 */
  quotaText?: string
  /** 相片項目列表 */
  photos: PhotoItem[]
  /** 點擊縮圖回調（傳入 index） */
  onPhotoClick?: (index: number) => void
  /** 點擊配額文字回調（跳至配額說明） */
  onQuotaClick?: () => void
}

/* ── Constants ─── */

const THUMB_SIZE = 100   /* 3 欄縮圖正方形邊長（96–108px 範圍內） */
const GRID_GAP   = 4     /* grid 間距 px */

/* ── Sub-components ─── */

/** 單張縮圖格（正方形，可選新內容紅點） */
function PhotoThumb({
  photo,
  index,
  onClick,
}: {
  photo: PhotoItem
  index: number
  onClick?: (idx: number) => void
}) {
  const { t } = useTranslation()
  const alt = photo.altText ?? t('photo_album_grid.photo_alt', { index: index + 1 })

  return (
    <div
      style={{
        position: 'relative',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        flexShrink: 0,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--color-divider)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={alt}
      onClick={() => onClick?.(index)}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick(index)
      }}
    >
      {/* 縮圖圖片 */}
      {photo.thumbnailUrl && (
        <img
          src={photo.thumbnailUrl}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}

      {/* 新內容紅點（8px，var(--color-accent)，2px 白色外圈） */}
      {photo.isNew && (
        <span
          aria-label={t('photo_album_grid.new_dot_label')}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-accent)',
            border: '2px solid var(--color-card)',
            display: 'block',
          }}
        />
      )}
    </div>
  )
}

/* ── Main Component ─── */

export default function PhotoAlbumGrid({
  titleKey = 'photo_album_grid.default_title',
  quotaText,
  photos,
  onPhotoClick,
  onQuotaClick,
}: PhotoAlbumGridProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t(titleKey)}
      style={{
        padding: '16px',
        backgroundColor: 'var(--color-card)',
      }}
    >
      {/* ── 標題列：區段標題 + 配額 ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          gap: '8px',
        }}
      >
        {/* 區段標題 18px Bold */}
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            lineHeight: 1.3,
          }}
        >
          {t(titleKey)}
        </h3>

        {/* 配額文字 16px muted（可點擊） */}
        {quotaText && (
          <span
            role={onQuotaClick ? 'button' : undefined}
            tabIndex={onQuotaClick ? 0 : undefined}
            onClick={onQuotaClick}
            onKeyDown={(e) => {
              if (onQuotaClick && (e.key === 'Enter' || e.key === ' ')) onQuotaClick()
            }}
            aria-label={t('photo_album_grid.quota_label', { quota: quotaText })}
            style={{
              fontSize: '16px',
              color: 'var(--color-text-secondary)',
              fontFamily: 'inherit',
              lineHeight: 1.3,
              cursor: onQuotaClick ? 'pointer' : 'default',
              minHeight: onQuotaClick ? '44px' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {quotaText}
          </span>
        )}
      </div>

      {/* ── 3 欄縮圖 Grid ── */}
      {photos.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(3, ${THUMB_SIZE}px)`,
            gap: `${GRID_GAP}px`,
          }}
          role="list"
          aria-label={t('photo_album_grid.grid_label')}
        >
          {photos.map((photo, idx) => (
            <div key={idx} role="listitem">
              <PhotoThumb photo={photo} index={idx} onClick={onPhotoClick} />
            </div>
          ))}
        </div>
      ) : (
        /* 空狀態 */
        <p
          style={{
            margin: 0,
            fontSize: '18px',
            color: 'var(--color-text-secondary)',
            fontFamily: 'inherit',
            textAlign: 'center',
            padding: '24px 0',
            lineHeight: 1.5,
          }}
        >
          {t('photo_album_grid.empty_text')}
        </p>
      )}
    </section>
  )
}
