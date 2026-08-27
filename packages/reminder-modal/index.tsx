/**
 * @coeldery/reminder-modal
 * CoEldery 85 家庭圈 — 入 App 迫近提醒彈出卡（版本 B）
 * 規格：.coappery/design/B5_reminder_cards.md §2
 * 顏色：只用 CSS var，禁止 hardcode hex / rgba
 * 文字：全部 via i18n t('key')
 * 行數上限：≤200 行
 */

import { useTranslation } from 'react-i18next'

export interface ReminderModalProps {
  /** 是否顯示 */
  open: boolean
  /** 對象頭像 URL */
  avatarUrl: string
  /** 對象名（for alt） */
  targetName: string
  /** Modal 大標（如「陳大文 明天生日 🎂」） */
  headline: string
  /** 溫暖副標（如「記得同佢講聲生日快樂 💚」） */
  warmSub: string
  /** 「一鍵祝福」掣回調 */
  onOneClick?: () => void
  /** 「去安排」掣回調 */
  onArrange?: () => void
  /** 「稍後提醒」掣回調 */
  onRemindLater?: () => void
  /** 關閉回調（由三個掣任一觸發後呼叫） */
  onClose: () => void
}

export default function ReminderModal({
  open, avatarUrl, targetName, headline, warmSub,
  onOneClick, onArrange, onRemindLater, onClose,
}: ReminderModalProps) {
  const { t } = useTranslation()

  if (!open) return null

  const handleOneClick = () => { onOneClick?.(); onClose() }
  const handleArrange = () => { onArrange?.(); onClose() }
  const handleRemindLater = () => { onRemindLater?.(); onClose() }

  /* ── 共用 pill 基礎 ── */
  const basePill: React.CSSProperties = {
    width: '100%',
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
  }

  return (
    /* ── 遮罩層（§2.1）── */
    <div
      role="dialog"
      aria-modal="true"
      aria-label={headline}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--overlay-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '24px 16px',
        /* 🚫 半透明遮罩唔可以純靠 tap 關閉（§2.4 規矩），故不設 onClick 關閉 */
      }}
    >
      {/* ── 中央卡（§2.2）── */}
      <div style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-modal)',
        padding: '32px 24px 24px',
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
      }}>
        {/* 大圓頭像 80px + 綠 ring */}
        <img
          src={avatarUrl}
          alt={t('a11y.avatar_alt', { name: targetName })}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--color-primary)',
            marginBottom: '12px',
          }}
        />

        {/* Headline 22px Bold 置中 */}
        <p style={{
          margin: '0 0 8px',
          fontSize: '22px',
          fontWeight: 'bold',
          color: 'var(--color-text)',
          textAlign: 'center',
          lineHeight: 1.3,
        }}>
          {headline}
        </p>

        {/* 溫暖副標 18px 置中 */}
        <p style={{
          margin: '0 0 24px',
          fontSize: '18px',
          color: 'var(--color-text)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          {warmSub}
        </p>

        {/* 一鍵祝福 — dominant 實心綠 + glow（🔴🔴🔴）*/}
        <button
          onClick={handleOneClick}
          style={{
            ...basePill,
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-card)',
            boxShadow: '0 4px 14px var(--green-glow-strong)',
            marginBottom: '12px',
          }}
        >
          {t('b5.modal_one_click_btn')}
        </button>

        {/* 去安排 — secondary 線框綠（🔴🔴）*/}
        <button
          onClick={handleArrange}
          style={{
            ...basePill,
            background: 'var(--color-card)',
            color: 'var(--color-primary)',
            border: '2px solid var(--color-primary)',
            marginBottom: '16px',
          }}
        >
          {t('b5.go_arrange_btn')}
        </button>

        {/* 稍後提醒 — tertiary 純文字 muted（🔴）*/}
        <button
          onClick={handleRemindLater}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            fontFamily: 'inherit',
            minHeight: '44px',
            minWidth: '44px',
            padding: '12px 16px',
          }}
        >
          {t('b5.modal_remind_later_btn')}
        </button>
      </div>
    </div>
  )
}
