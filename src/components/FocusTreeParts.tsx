/**
 * FocusTreeParts — 焦點樹子組件（細步 4g）
 * 拆分自 FocusTree.tsx 以符合 module ≤ 250 行規則。
 * 包含：HouseholdChip、SiblingBar、VerticalConnector
 *
 * module ≤ 250 行。
 */

import { useTranslation } from 'react-i18next'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo, PetInfo } from '../../packages/household-card'
import type { ApiMember, Household } from '../../packages/family-tree-engine'

/* ── helpers ── */

export function toInfo(m: ApiMember, rel: string): MemberInfo {
  return { name: m.display_name, relation: rel, avatarUrl: m.avatar_url ?? undefined }
}
export function toPet(p: ApiMember, ownerName: string): PetInfo {
  return { name: p.display_name, petType: '寵物', ownerRelation: ownerName, avatarUrl: p.avatar_url ?? undefined }
}

/* ── HouseholdChip ──
 * 一張 household 卡片 + 點擊換焦點（click → setFocusId(primary.id)）
 * 本人標記顯示在 primary 頭像上方
 */
export function HouseholdChip({
  hh, size, isFocus, onClick,
}: {
  hh: Household
  size: number
  isFocus: boolean
  onClick: (id: string) => void
}) {
  const { t } = useTranslation()
  const rel = t('gen.member_relation_person')
  const primary = toInfo(hh.primary, rel)
  const secondary = hh.spouse ? toInfo(hh.spouse, rel) : undefined
  const pet = hh.pets[0] ? toPet(hh.pets[0], primary.name) : undefined
  const variant = secondary ? (pet ? 'couple_with_pet' : 'couple') : 'single'
  const isSelf = hh.primary.is_self === 1

  return (
    <div
      style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
      onClick={() => onClick(hh.primary.id)}
    >
      <HouseholdCard
        variant={variant} primaryMember={primary} secondaryMember={secondary}
        pet={pet} avatarSize={size} isFocused={isFocus} width="auto"
      />
      {isSelf && (
        <span style={{
          position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)',
          fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary)',
          backgroundColor: 'var(--color-card)', border: '1.5px solid var(--color-primary)',
          borderRadius: '10px', padding: '1px 8px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1,
        }}>{t('gen.self_badge')}</span>
      )}
    </div>
  )
}

/* ── SiblingBar ── 橫線貫穿整代，視覺提示「仲有兄弟姊妹」 */
export function SiblingBar() {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', top: '50%', left: '-100vw', right: '-100vw',
      height: '2px', backgroundColor: 'var(--color-primary)', opacity: 0.3, zIndex: 0,
      pointerEvents: 'none',
    }} />
  )
}

/* ── VerticalConnector ── 上下層之間的垂直線（永遠置中） */
export function VerticalConnector({ height = 28 }: { height?: number }) {
  return (
    <div aria-hidden="true" style={{
      width: '2px', height: `${height}px`, backgroundColor: 'var(--color-primary)',
      margin: '0 auto', opacity: 0.65, flexShrink: 0,
    }} />
  )
}

/* ── ChildrenRow ── 下層子女橫向排列，整組置中 ── */
export function ChildrenRow({
  households, setFocusId,
}: {
  households: Household[]
  setFocusId: (id: string) => void
}) {
  if (households.length === 0) return null
  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
      <SiblingBar />
      <div style={{
        display: 'flex', gap: '12px', justifyContent: 'center',
        padding: '4px 16px', position: 'relative', zIndex: 1,
      }}>
        {households.map(hh => (
          <HouseholdChip
            key={hh.primary.id}
            hh={hh} size={64} isFocus={false}
            onClick={setFocusId}
          />
        ))}
      </div>
    </div>
  )
}

/* ── ParentRow ── 上層父母（最多一張卡，置中） ── */
export function ParentRow({
  households, setFocusId,
}: {
  households: Household[]
  setFocusId: (id: string) => void
}) {
  if (households.length === 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 16px' }}>
      <HouseholdChip
        hh={households[0]}
        size={64}
        isFocus={false}
        onClick={setFocusId}
      />
    </div>
  )
}
