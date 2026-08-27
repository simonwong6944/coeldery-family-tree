/**
 * @coeldery/reminder-card
 * CoEldery 85 家庭圈 — Feed 溫馨提示卡（版本 A）
 * 規格：.coappery/design/B5_reminder_cards.md §1
 * 顏色：只用 CSS var，禁止 hardcode hex / rgba
 * 文字：全部 via i18n t('key')
 * 行數上限：≤200 行
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface ReminderCardProps {
  /** 事件對象名（如「陳大文」） */
  targetName: string
  /** 主標 emoji 圖示（如「🎂」） */
  icon: string
  /** 主標文字（已格式化，如「陳大文 下個月生日」） */
  titleText: string
  /** 副標文字（如「10 月 15 日・仲有 30 日」） */
  subtitleText: string
  /** 「送上祝福」掣回調（靜態 mockup 可傳 undefined） */
  onBlessing?: () => void
  /** 「去安排」掣回調（靜態 mockup 可傳 undefined） */
  onArrange?: () => void
}

export default function ReminderCard({
  icon, titleText, subtitleText, onBlessing, onArrange,
}: ReminderCardProps) {
  const { t } = useTranslation()
  const [blessingPressed, setBlessingPressed] = useState(false)

  const handleBlessing = () => {
    setBlessingPressed(true)
    setTimeout(() => setBlessingPressed(false), 800)
    onBlessing?.()
  }

  /* ── 共用 pill 掣基礎樣式 ── */
  const basePill: React.CSSProperties = {
    flex: 1,
    minHeight: '56px',
    borderRadius: '28px',
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    transition: 'opacity 0.15s',
  }

  return (
    <article
      aria-label={t('b5.reminder_label')}
      style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-soft)',
        overflow: 'hidden',
        marginBottom: '16px',
        /* 左側 4px 綠直條識別 */
        borderLeft: '4px solid var(--color-primary)',
        padding: '16px',
      }}
    >
      {/* ── 細標「溫馨提示」── */}
      <p style={{
        margin: '0 0 8px',
        fontSize: '16px',
        fontWeight: 'bold',
        color: 'var(--color-primary)',
        lineHeight: 1.2,
      }}>
        {icon} {t('b5.reminder_label')}
      </p>

      {/* ── 主標 ── */}
      <p style={{
        margin: 0,
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'var(--color-text)',
        lineHeight: 1.3,
      }}>
        {titleText}
      </p>

      {/* ── 副標 ── */}
      <p style={{
        margin: '4px 0 16px',
        fontSize: '16px',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.3,
      }}>
        {subtitleText}
      </p>

      {/* ── 兩個並列掣 ── */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* 送上祝福 — 線框綠 */}
        <button
          onClick={handleBlessing}
          aria-label={t('b5.send_blessing_btn')}
          style={{
            ...basePill,
            background: blessingPressed ? 'var(--color-primary)' : 'var(--color-card)',
            color: blessingPressed ? 'var(--color-card)' : 'var(--color-primary)',
            border: '2px solid var(--color-primary)',
          }}
        >
          {t('b5.send_blessing_btn')}
        </button>

        {/* 去安排 — 實心綠 */}
        <button
          onClick={() => onArrange?.()}
          aria-label={t('b5.go_arrange_btn')}
          style={{
            ...basePill,
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-card)',
            boxShadow: 'var(--shadow-cta)',
          }}
        >
          {t('b5.go_arrange_btn')}
        </button>
      </div>
    </article>
  )
}
