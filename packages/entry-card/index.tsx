/**
 * @coeldery/entry-card
 * CoEldery 85 家庭樹 — 通用入口卡組件（B2 成員詳情頁入口區）
 *
 * 功能：
 *   - 白底卡、16px 圓角、var(--shadow-soft)
 *   - 左側標題（可選副提示 muted）+ 右側 chevron ›
 *   - iconType 對應顯示適當 line-style icon（與頂欄 icon 風格一致）
 *   - 整卡可點擊，觸控區 ≥44×44px
 *
 * 所有資料由 props 傳入，不內置任何 mock data。
 * 顏色只用 CSS var，禁止 hardcode hex。
 * 文字全部 via i18n t('key')。
 *
 * 衍生自：.coappery/design/B2_B3.md §2.1「查閱動態」入口卡 + §2.1「成長相簿」卡
 */

import { useTranslation } from 'react-i18next'

/* ── Type Definitions ─── */

export type EntryCardIconType = 'activity' | 'growth' | 'none'

export interface EntryCardProps {
  /** 卡片標題 i18n key */
  titleKey: string
  /** 副提示 i18n key（16px muted，可選） */
  subtitleKey?: string
  /** 圖示類型：'activity'=家庭圈動態、'growth'=成長相簿嫩芽、'none'=不顯示 */
  iconType?: EntryCardIconType
  /** 點擊整卡的回調 */
  onClick?: () => void
}

/* ── Sub-components ─── */

/**
 * 活動 icon（line-style，代表「查閱動態 / 家庭圈」）
 * 使用對話泡 SVG，線條風格與頂欄輔助 icon 一致
 */
function ActivityIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role="img"
      style={{ flexShrink: 0 }}
    >
      {/* 對話泡（代表家庭圈動態留言） */}
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/**
 * 成長相簿 icon（line-style，嫩芽 sprout 代表成長）
 * 線條風格與頂欄輔助 icon 一致
 */
function GrowthIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role="img"
      style={{ flexShrink: 0 }}
    >
      {/* 莖 */}
      <line x1="12" y1="22" x2="12" y2="11" />
      {/* 左葉 */}
      <path d="M12 11C12 11 6 10 5 5c0 0 5 0 7 6z" />
      {/* 右葉 */}
      <path d="M12 11C12 11 18 10 19 5c0 0-5 0-7 6z" />
    </svg>
  )
}

/** Chevron › 右箭頭 */
function ChevronRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-secondary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      role="img"
      style={{ flexShrink: 0 }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

/** 根據 iconType 取對應 icon 組件 */
function CardIcon({ iconType }: { iconType: EntryCardIconType }) {
  if (iconType === 'activity') return <ActivityIcon />
  if (iconType === 'growth')   return <GrowthIcon />
  return null
}

/* ── Main Component ─── */

export default function EntryCard({
  titleKey,
  subtitleKey,
  iconType = 'none',
  onClick,
}: EntryCardProps) {
  const { t } = useTranslation()

  const hasIcon = iconType !== 'none'
  const cardLabel = subtitleKey
    ? `${t(titleKey)}，${t(subtitleKey)}`
    : t(titleKey)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick()
      }}
      aria-label={cardLabel}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: 'var(--color-card)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-soft)',
        padding: '14px 16px',
        minHeight: '56px',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid var(--color-divider)',
        transition: 'box-shadow 0.15s ease',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* 左側 icon（可選） */}
      {hasIcon && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <CardIcon iconType={iconType} />
        </div>
      )}

      {/* 中間文字區（flex 1，左對齊） */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {/* 主標題 18px Bold */}
        <span
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            lineHeight: 1.3,
            display: 'block',
          }}
        >
          {t(titleKey)}
        </span>

        {/* 副提示 16px muted（可選） */}
        {subtitleKey && (
          <span
            style={{
              fontSize: '16px',
              fontWeight: 'normal',
              color: 'var(--color-text-secondary)',
              fontFamily: 'inherit',
              lineHeight: 1.4,
              display: 'block',
            }}
          >
            {t(subtitleKey)}
          </span>
        )}
      </div>

      {/* 右側 chevron › */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <ChevronRight />
      </div>
    </div>
  )
}
