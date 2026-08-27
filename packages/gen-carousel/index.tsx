/**
 * @coeldery/gen-carousel — 第二代輪播帶（peek 半截卡 + 指示點）
 * 原封搬移自 B1HomePage.tsx PeekCard、IndicatorDots 及 Gen2 carousel 帶（細步 3c refactor）。
 * 佈局：position:relative 外容器 + overflow:hidden；focused 卡 calc(100% - 32px)；
 *       左右 peek 卡 position:absolute 56px，透過 translateX 半露效果。
 * 顏色：全部 CSS var。文字：全部 i18n。無 hardcode hex。
 * derivedFrom: .coappery/design/B1.md §4.2–4.4（Gen2 輪播）
 * SOP 規則 B：≤250 行。
 */

import { useTranslation } from 'react-i18next'
import HouseholdCard from '../household-card'
import type { MemberInfo, PetInfo } from '../household-card'

/* ── IndicatorDots ── */

export interface IndicatorDotsProps { total: number; active: number }

/** 輪播指示點（● ○ …），active 點實心，其餘空心。亦供 @coeldery/gen-section 使用。 */
export function IndicatorDots({ total, active }: IndicatorDotsProps) {
  const { t } = useTranslation()
  return (
    <div
      aria-label={t('common.indicator_position', { active: active + 1, total })}
      style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center', marginTop: '16px' }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: '10px', height: '10px', borderRadius: '50%',
            backgroundColor: i === active ? 'var(--color-primary)' : 'transparent',
            border: i === active ? 'none' : '2px solid var(--color-divider)',
            display: 'block', flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

/* ── PeekCard（內部）── */

interface PeekCardProps {
  side: 'left' | 'right'
  primaryMember: MemberInfo
  secondaryMember?: MemberInfo
  pet?: PetInfo
}

/** 左/右半露真實 HouseholdCard。opacity 0.5 + grayscale(15%) + scale 0.92。 */
function PeekCard({ side, primaryMember, secondaryMember, pet }: PeekCardProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '56px', flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center',
        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
        position: 'relative',
      }}
    >
      <div
        style={{
          transform: side === 'left'
            ? 'translateX(calc(100% - 56px)) scale(0.92)'
            : 'translateX(calc(-100% + 56px)) scale(0.92)',
          transformOrigin: side === 'left' ? 'right center' : 'left center',
          opacity: 0.5,
          filter: 'grayscale(15%)',
          transition: 'none',
          flexShrink: 0,
          width: '220px',
        }}
      >
        <HouseholdCard
          variant={pet ? 'couple_with_pet' : secondaryMember ? 'couple' : 'single'}
          primaryMember={primaryMember}
          secondaryMember={secondaryMember}
          pet={pet}
          avatarSize={52}
          isFocused={false}
          isPeek={false}
          width="220px"
        />
      </div>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: '50%',
          [side === 'left' ? 'right' : 'left']: '4px',
          transform: 'translateY(-50%)',
          fontSize: '18px', color: 'var(--color-text-secondary)',
          opacity: 0.7, pointerEvents: 'none', zIndex: 1,
        }}
      >
        {side === 'left' ? '‹' : '›'}
      </span>
    </div>
  )
}

/* ── GenCarousel Props ── */

export interface GenCarouselProps {
  ariaLabelKey: string       // 外層 group aria-label 的 i18n key（例如 'gen2.layer_label'）
  focusedPrimary: MemberInfo
  focusedSecondary?: MemberInfo
  focusedPet?: PetInfo
  focusedAvatarSize?: number  // 預設 64
  leftPeekPrimary: MemberInfo
  leftPeekSecondary?: MemberInfo
  rightPeekPrimary: MemberInfo
  rightPeekSecondary?: MemberInfo
  dotsTotal: number
  dotsActive: number
}

/* ── GenCarousel（主體）── */

/**
 * GenCarousel — 第二代輪播帶
 * 組成：carousel band（focused 卡 + 左右 peek 絕對定位）+ IndicatorDots。
 */
export default function GenCarousel({
  ariaLabelKey,
  focusedPrimary,
  focusedSecondary,
  focusedPet,
  focusedAvatarSize = 64,
  leftPeekPrimary,
  leftPeekSecondary,
  rightPeekPrimary,
  rightPeekSecondary,
  dotsTotal,
  dotsActive,
}: GenCarouselProps) {
  const { t } = useTranslation()
  return (
    <>
      <div
        role="group"
        aria-label={t(ariaLabelKey)}
        style={{
          width: '100%', position: 'relative', boxSizing: 'border-box',
          overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'stretch',
        }}
      >
        {/* Focused 卡 */}
        <div style={{ width: 'calc(100% - 32px)', maxWidth: '320px', flexShrink: 0 }}>
          <HouseholdCard
            variant={focusedPet ? 'couple_with_pet' : focusedSecondary ? 'couple' : 'single'}
            primaryMember={focusedPrimary}
            secondaryMember={focusedSecondary}
            pet={focusedPet}
            avatarSize={focusedAvatarSize}
            isFocused
            width="100%"
          />
        </div>

        {/* 左 peek */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, width: '56px', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}
        >
          <PeekCard side="left" primaryMember={leftPeekPrimary} secondaryMember={leftPeekSecondary} />
        </div>

        {/* 右 peek */}
        <div
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '56px', height: '100%', overflow: 'hidden', pointerEvents: 'none' }}
        >
          <PeekCard side="right" primaryMember={rightPeekPrimary} secondaryMember={rightPeekSecondary} />
        </div>
      </div>

      <IndicatorDots total={dotsTotal} active={dotsActive} />
    </>
  )
}
