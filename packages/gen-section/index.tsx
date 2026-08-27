/**
 * @coeldery/gen-section — 「第X代」標題 + 成員卡區塊容器
 * 原封搬移自 B1HomePage.tsx GenLabel、Gen3Member（細步 3c refactor）。
 * 畫面、樣式、行為零改動。
 * 導出：GenLabel、Gen3Member、GenSection（Gen3 區塊容器）。
 * IndicatorDots 由 @coeldery/gen-carousel 統一提供並再導出。
 * 顏色：全部 CSS var。文字：全部 i18n。無 hardcode hex。
 * derivedFrom: .coappery/design/B1.md §4.1（代標題）、§4.5（Gen3 成員）
 * SOP 規則 B：≤250 行。
 */

import { useTranslation } from 'react-i18next'
import type { MemberInfo } from '../household-card'
import { IndicatorDots } from '../gen-carousel'

// 再導出 IndicatorDots 供外部統一從 gen-section 取用
export { IndicatorDots } from '../gen-carousel'

/* ── GenLabel ── */

export interface GenLabelProps { labelKey: string }

/** 代層標題（第一代 / 第二代 / 第三代），居中，color-text-secondary。 */
export function GenLabel({ labelKey }: GenLabelProps) {
  const { t } = useTranslation()
  return (
    <p
      style={{
        margin: '0 0 8px',
        fontSize: '16px',
        fontWeight: 'normal',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        letterSpacing: '0.5px',
      }}
    >
      {t(labelKey)}
    </p>
  )
}

/* ── Gen3Member ── */

export interface Gen3MemberProps {
  member: MemberInfo
  size?: number  // 頭像尺寸（px），預設 64
}

/** 第三代成員：圓形頭像（含 fallback 首字母）+ 姓名 + 關係 */
export function Gen3Member({ member, size = 64 }: Gen3MemberProps) {
  const initial = member.name.charAt(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              ;(e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex')
            }}
            style={{
              width: size, height: size, borderRadius: '50%', objectFit: 'cover',
              display: 'block', boxShadow: 'var(--shadow-soft)', border: '2px solid var(--color-primary)',
            }}
          />
        ) : null}
        {/* fallback 首字母（avatarUrl 載入失敗時顯示） */}
        <div
          aria-label={member.name}
          style={{
            width: size, height: size, borderRadius: '50%',
            backgroundColor: 'var(--color-divider)',
            display: member.avatarUrl ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(size * 0.38) + 'px', fontWeight: 'bold',
            color: 'var(--color-text)', boxShadow: 'var(--shadow-soft)',
            border: '2px solid var(--color-primary)',
          }}
        >
          {initial}
        </div>
      </div>
      <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)', textAlign: 'center' }}>
        {member.name}
      </span>
      <span style={{ fontSize: '16px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        {member.relation}
      </span>
    </div>
  )
}

/* ── GenSection（Gen3 佈局容器）── */

export interface GenSectionProps {
  labelKey: string         // section aria-label + GenLabel 的 i18n key
  padding?: string         // section padding，預設 '0 16px 32px'
  children: React.ReactNode
  dotsTotal: number
  dotsActive: number
  bottomSpacer?: number    // 底部緩衝高度（px），0 表示不加
}

/**
 * GenSection — Gen3 區塊容器
 * 組成：GenLabel + 白底圓角卡片（children）+ IndicatorDots + 可選底部 spacer。
 * 僅供 Gen3 使用；Gen1/Gen2 的 section wrapper 在 B1HomePage.tsx 保留（各自佈局不同）。
 */
export function GenSection({
  labelKey,
  padding = '0 16px 32px',
  children,
  dotsTotal,
  dotsActive,
  bottomSpacer = 0,
}: GenSectionProps) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t(labelKey)}
      style={{
        width: '100%', padding, display: 'flex',
        flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box',
      }}
    >
      <GenLabel labelKey={labelKey} />
      <div
        role="group"
        aria-label={t(labelKey)}
        style={{
          backgroundColor: 'var(--color-card)',
          borderRadius: '16px',
          border: '2px solid var(--color-primary)',
          boxShadow: 'var(--shadow-soft)',
          padding: '20px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          gap: '24px', width: '100%', maxWidth: '320px', boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
      <IndicatorDots total={dotsTotal} active={dotsActive} />
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer + 'px' }} />}
    </section>
  )
}
