/**
 * @coeldery/household-card
 * CoEldery 85 家庭樹 — 家庭卡片組件
 *
 * 支援三種變體：
 *   - 'couple'  夫婦並排（兩頭像 + 綠色實心心形）
 *   - 'single'  單人（一個頭像置中）
 *   - 'couple_with_pet'  夫婦並排 + 寵物頭像（paw badge + 淺米色背景）
 *
 * 所有資料由 props 傳入，唔內置任何 mock data。
 * 顏色只用 CSS var，禁止 hardcode hex。
 * 文字全部 via i18n t('key')。
 * 卡片：白底、16px 圓角、柔和陰影、padding ≥ 20px。
 *
 * Focused 卡（isFocused=true）：2px solid var(--color-primary) 外框 + 擴散環 + 較深陰影。
 * Peek 卡（isPeek=true）：opacity ~50%、輕微縮小（scale 0.9）、灰階。
 * 通知紅點（showNotificationDot=true）：8×8px var(--color-accent)，白色外圈 2px，出現在指定成員頭像右上角。
 */

import { useTranslation } from 'react-i18next'

/* ── Type Definitions ─── */

export interface MemberInfo {
  /** 成員姓名（i18n key 或直接名字，由父層決定） */
  name: string
  /** 關係標籤，16px Regular，muted color */
  relation: string
  /** 頭像 URL（空字串 → 顯示首字母 fallback） */
  avatarUrl?: string
  /** 是否在此成員頭像右上角顯示通知紅點 */
  showNotificationDot?: boolean
}

export interface PetInfo {
  /** 寵物名字 */
  name: string
  /** 寵物種類（狗/貓等） */
  petType: string
  /** 主人關係稱謂（用於標籤） */
  ownerRelation: string
  /** 寵物頭像 URL（空字串 → 🐾 fallback） */
  avatarUrl?: string
}

export type HouseholdCardVariant = 'couple' | 'single' | 'couple_with_pet'

export interface HouseholdCardProps {
  /** 卡片變體 */
  variant: HouseholdCardVariant
  /** 主成員（夫/本人/焦點成員） */
  primaryMember: MemberInfo
  /** 次要成員（妻/配偶），couple / couple_with_pet 時必須傳 */
  secondaryMember?: MemberInfo
  /** 寵物資料，couple_with_pet 時必須傳 */
  pet?: PetInfo
  /** 頭像大小（px），預設 80 */
  avatarSize?: number
  /** 是否為 focused 卡（2px 綠框 + 擴散環 + 深陰影） */
  isFocused?: boolean
  /** 是否為 peek 卡（半透明 + 縮小 + 灰階） */
  isPeek?: boolean
  /** 卡片寬度（px 或 CSS string），carousel 層傳入 */
  width?: number | string
}

/* ── Sub-components ─── */

/** 心形 icon（法拉利紅 --color-accent，情感裝飾，見 rules.md 第16條色彩例外） */
function HeartIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      aria-hidden="true"
      role="img"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        d="M12 21.593c-.379-.286-8.592-6.483-8.592-12.152C3.408 5.88 5.698 4 8.008 4c1.726 0 3.259.85 4.104 2.122C12.957 4.85 14.49 4 16.216 4c2.31 0 4.6 1.88 4.6 5.441 0 5.669-8.213 11.866-8.592 12.152-.066.05-.143.075-.224.075s-.158-.025-.224-.075z"
        fill="var(--color-accent)"
      />
    </svg>
  )
}

/** 圓形頭像 */
function Avatar({
  member,
  size,
  showDot = false,
}: {
  member: MemberInfo
  size: number
  showDot?: boolean
}) {
  const initial = member.name.charAt(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      {/* 頭像圓圈 + 可選通知紅點 */}
      <div style={{ position: 'relative', width: size, height: size }}>
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.name}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              objectFit: 'cover',
              display: 'block',
              boxShadow: 'var(--shadow-soft)',
            }}
          />
        ) : (
          /* 無頭像 fallback：首字母 */
          <div
            aria-label={member.name}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: 'var(--color-divider)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.round(size * 0.38) + 'px',
              fontWeight: 'bold',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            {initial}
          </div>
        )}

        {/* 通知紅點（8×8px，白色 2px 外圈） */}
        {showDot && (
          <span
            aria-label="有新動態通知"
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
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

      {/* 姓名 18px Bold */}
      <span
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'var(--color-text)',
          fontFamily: 'inherit',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {member.name}
      </span>

      {/* 關係標籤 16px Regular muted */}
      <span
        style={{
          fontSize: '16px',
          fontWeight: 'normal',
          color: 'var(--color-text-secondary)',
          fontFamily: 'inherit',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {member.relation}
      </span>
    </div>
  )
}

/** 寵物頭像 block（右上角 paw badge，淺米色背景） */
function PetAvatar({ pet, size = 48 }: { pet: PetInfo; size?: number }) {
  const { t } = useTranslation()
  const petLabel = t('household_card.pet_label', {
    petName: pet.name,
    ownerRelation: pet.ownerRelation,
    petType: pet.petType,
  })
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '10px 12px',
        borderRadius: '12px',
        backgroundColor: 'var(--color-bg)',
        position: 'relative',
      }}
    >
      {/* 寵物頭像 */}
      <div style={{ position: 'relative', width: size, height: size }}>
        {pet.avatarUrl ? (
          <img
            src={pet.avatarUrl}
            alt={pet.name}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: 'var(--shadow-soft)',
            }}
          />
        ) : (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: 'var(--color-divider)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: 'var(--shadow-soft)',
            }}
            aria-label={pet.name}
          >
            🐾
          </div>
        )}
        {/* Paw badge 右上角 */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            fontSize: '14px',
            lineHeight: 1,
          }}
        >
          🐾
        </span>
      </div>

      {/* 寵物標籤（分兩行：名字 + 主人關係） */}
      <span
        style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: 'var(--color-text)',
          fontFamily: 'inherit',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {pet.name}
      </span>
      <span
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100px',
        }}
        aria-label={petLabel}
      >
        {petLabel}
      </span>
    </div>
  )
}

/* ── Main Component ─── */

export default function HouseholdCard({
  variant,
  primaryMember,
  secondaryMember,
  pet,
  avatarSize = 80,
  isFocused = false,
  isPeek = false,
  width,
}: HouseholdCardProps) {
  /* 根據 focused / peek 狀態計算樣式 */
  const cardBoxShadow = isFocused
    ? 'var(--shadow-focus-card), var(--ring-focus)'
    : 'var(--shadow-soft)'

  const cardBorder = isFocused
    ? '2px solid var(--color-primary)'
    : '1.5px solid var(--color-divider)'

  const cardFilter = isPeek ? 'grayscale(10%)' : 'none'
  const cardOpacity = isPeek ? 0.5 : 1
  const cardTransform = isPeek ? 'scale(0.92)' : 'scale(1)'

  return (
    <article
      style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '16px',
        border: cardBorder,
        boxShadow: cardBoxShadow,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
        width: width !== undefined ? width : 'auto',
        boxSizing: 'border-box',
        filter: cardFilter,
        opacity: cardOpacity,
        transform: cardTransform,
        transition: 'transform 0.2s ease, opacity 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* ── 成員區 ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'nowrap',
        }}
      >
        {/* 主成員 */}
        <Avatar
          member={primaryMember}
          size={avatarSize}
          showDot={primaryMember.showNotificationDot}
        />

        {/* 夫婦模式：心形 + 次要成員 */}
        {(variant === 'couple' || variant === 'couple_with_pet') && secondaryMember && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingTop: Math.round(avatarSize * 0.25) + 'px',
              }}
            >
              <HeartIcon />
            </div>
            <Avatar
              member={secondaryMember}
              size={avatarSize}
              showDot={secondaryMember.showNotificationDot}
            />
          </>
        )}

        {/* 寵物區域（couple_with_pet） */}
        {variant === 'couple_with_pet' && pet && (
          <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '4px' }}>
            <PetAvatar pet={pet} size={Math.round(avatarSize * 0.6)} />
          </div>
        )}
      </div>
    </article>
  )
}
