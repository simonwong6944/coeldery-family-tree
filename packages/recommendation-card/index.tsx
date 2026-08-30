/**
 * @coeldery/recommendation-card
 * CoEldery 85 家庭圈 — 推薦卡組件（B4 feed 插入）
 * 規格：.coappery/design/B4_recommendation_card.md
 * 顏色：只用 CSS var，禁止 hardcode hex / rgba
 * 文字：全部 via i18n t('b4_reco.*')
 * v1.1.0：移除內部 dismissed useState，改由頁面層經 onDismiss prop 持久化至 feedRepository
 */

import { useTranslation } from 'react-i18next'

export interface RecommendationCardProps {
  /** 標題文字（由頁面層傳入，使用 t('b4_reco.title1') 或 t('b4_reco.title2') 作 mock） */
  title: string
  /** 副標題文字（由頁面層傳入） */
  subtitle?: string
  /** 點擊「了解更多」CTA 的回調 */
  onCtaClick?: () => void
  /** 點擊「稍後再提醒我」的回調（頁面層負責呼叫 feedRepository.dismissReco 並更新 state）*/
  onDismiss?: () => void
}

export default function RecommendationCard({
  title,
  subtitle,
  onCtaClick,
  onDismiss,
}: RecommendationCardProps) {
  const { t } = useTranslation()

  /* ── 共用樣式 token（跟足 post-card 的 React.CSSProperties 寫法）── */
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-recommendation)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-soft)',
    overflow: 'hidden',
    marginBottom: '16px',
    padding: '20px 16px 16px',
  }

  /* 標籤 pill：白底 + var(--color-divider) 淺邊框 + 次要文字色（暖灰褐）
     嚴禁綠色作識別底（B4 §5、§3 紅線） */
  const labelStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: 'var(--color-card)',
    border: '1.5px solid var(--color-divider)',
    color: 'var(--color-text-secondary)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '16px',
    fontFamily: 'inherit',
    marginBottom: '12px',
  }

  const titleStyle: React.CSSProperties = {
    margin: '0 0 8px',
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'inherit',
    color: 'var(--color-text)',
    lineHeight: 1.4,
  }

  const subtitleStyle: React.CSSProperties = {
    margin: '0 0 20px',
    fontSize: '16px',
    fontFamily: 'inherit',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.5,
  }

  /* CTA 按鈕：高 ≥ 56px，熱區 ≥ 44×44px（rules.md §2）
     使用 --color-primary（森林綠）作主 CTA，跟品牌規範
     注意：綠色在此為「CTA 掣」而非「推薦卡識別底」，符合 B4 §3 紅線
     （紅線禁止綠色作「識別背景色」，主 CTA 掣用綠屬正常 design token 用法） */
  const ctaStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: '56px',
    padding: '0 16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-card)',
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginBottom: '10px',
  }

  /* 關閉掣：純文字樣式，熱區 ≥ 44×44px（rules.md §2）
     禁止 icon-only（rules.md §2、B4 §5）
     onClick 委派給頁面層 onDismiss（持久化責任在頁面層）*/
  const dismissStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: '44px',
    padding: '0 16px',
    borderRadius: '12px',
    border: '1.5px solid var(--color-divider)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: '16px',
    fontFamily: 'inherit',
    cursor: 'pointer',
  }

  return (
    <article
      aria-label={t('b4_reco.label')}
      style={cardStyle}
    >
      {/* 標籤：為您推薦（白底 + 淺邊框，非綠底）*/}
      <span style={labelStyle}>
        {t('b4_reco.label')}
      </span>

      {/* 標題（≥18px，由 props 傳入，頁面層提供 mock）*/}
      <h2 style={titleStyle}>
        {title}
      </h2>

      {/* 副標題（≥16px，可選）*/}
      {subtitle && (
        <p style={subtitleStyle}>
          {subtitle}
        </p>
      )}

      {/* CTA：了解更多（高 ≥56px，純文字，非 icon-only）*/}
      <button
        style={ctaStyle}
        onClick={onCtaClick}
        aria-label={t('b4_reco.cta')}
      >
        {t('b4_reco.cta')}
      </button>

      {/* 關閉：稍後再提醒我（熱區 ≥44px；onClick 委派 onDismiss，由頁面層呼叫 feedRepository.dismissReco）*/}
      <button
        style={dismissStyle}
        onClick={onDismiss}
        aria-label={t('b4_reco.dismiss')}
      >
        {t('b4_reco.dismiss')}
      </button>
    </article>
  )
}
