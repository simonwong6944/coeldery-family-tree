/**
 * @coeldery/top-bar
 * CoEldery 85 家庭樹 — 頂部導航欄組件
 *
 * 規格：
 *   - 高度固定 56px，背景 var(--color-card)，底部 1px var(--color-divider) 分隔線
 *   - 左：返回文字按鈕（← 老有卡 App），熱區 ≥ 44×44px
 *   - 中：標題（置中，20px Bold），由 prop 傳入
 *   - 右：三個 icon slot（每個熱區 ≥ 44×44px），由 rightSlot prop 傳入
 * 顏色：只用 CSS var，禁止 hardcode hex
 * 文字：全部 via i18n t('key')
 */

import { useTranslation } from 'react-i18next'

export interface TopBarProps {
  /** 置中標題文字（i18n key，由外部傳入） */
  titleKey?: string
  /** 返回鍵點擊 handler（靜態 UI 可不傳，預設 noop） */
  onBack?: () => void
  /** 右側 icon 區域，由父組件組裝三個 icon 按鈕 */
  rightSlot?: React.ReactNode
}

export default function TopBar({ titleKey = 'top_bar.title', onBack, rightSlot }: TopBarProps) {
  const { t } = useTranslation()

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: 'var(--color-card)',
        borderBottom: '1px solid var(--color-divider)',
        /* 三欄 flex 佈局：左返回 / 中標題 / 右 icons，消除重疊 */
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
        zIndex: 100,
        boxSizing: 'border-box',
      }}
      role="banner"
    >
      {/* 左欄：返回鍵（flex-shrink 0，不被壓縮） */}
      <div style={{ flex: '0 0 auto' }}>
        <button
          onClick={onBack ?? undefined}
          aria-label={t('top_bar.back')}
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: '44px',
            minHeight: '44px',
            padding: '0 8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-primary)',
            fontSize: '15px',
            fontWeight: 'bold',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {t('top_bar.back')}
        </button>
      </div>

      {/* 中欄：標題（flex 1，居中，overflow hidden 防止長標題頂開兩側） */}
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '0 4px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {t(titleKey)}
        </h1>
      </div>

      {/* 右欄：icon slot（flex-shrink 0，不被壓縮） */}
      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0px',
        }}
      >
        {rightSlot ?? null}
      </div>
    </header>
  )
}
