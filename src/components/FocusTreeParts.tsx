/**
 * FocusTreeParts — 焦點樹子組件（4h-fix）
 *
 * 4h-fix 改動：
 *   - HouseholdChip：頭像 overlay 觸發 single/double click（無中間分隔線）
 *     single-click 頭像 → setFocusId；double-click → #/member/:id
 *   - VerticalConnector 保留（中央基準線用）
 *   - ChildGroupRow / SiblingBar 移除（由 FocusChildLayer 接管）
 *   - ParentRow 保留，水平置中
 *
 * module ≤ 250 行。
 */

import { useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo, PetInfo } from '../../packages/household-card'
import type { ApiMember, Household } from '../../packages/family-tree-engine'

export function toInfo(m: ApiMember, rel: string): MemberInfo {
  return { name: m.display_name, relation: rel, avatarUrl: m.avatar_url ?? undefined }
}
export function toPet(p: ApiMember, ownerName: string): PetInfo {
  return { name: p.display_name, petType: '寵物', ownerRelation: ownerName, avatarUrl: p.avatar_url ?? undefined }
}

/* ── VerticalConnector ── */
export function VerticalConnector({ height = 28 }: { height?: number }) {
  return (
    <div aria-hidden="true" style={{
      width: '2px', height: `${height}px`, backgroundColor: 'var(--color-primary)',
      margin: '0 auto', opacity: 0.55, flexShrink: 0,
    }} />
  )
}

const selfBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)',
  fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary)',
  backgroundColor: 'var(--color-card)', border: '1.5px solid var(--color-primary)',
  borderRadius: '10px', padding: '1px 8px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 3,
}
function SelfBadge({ t }: { t: (key: string) => string }) {
  return <span style={selfBadgeStyle}>{t('gen.self_badge')}</span>
}

/* ── AvatarOverlay ──
 * 透明圓形 div 覆蓋頭像，single/double click 分流（220ms）
 * couple 卡：primary at (CARD_PAD, CARD_PAD)，
 *           spouse at (CARD_PAD + size + COL_GAP + HEART_W + COL_GAP, CARD_PAD)
 */
const CARD_PAD = 20
const COL_GAP = 16
const HEART_W = 28

function AvatarOverlay({
  memberId, size, left, top, onSingle, onDouble,
}: {
  memberId: string
  size: number
  left: number
  top: number
  onSingle: (id: string) => void
  onDouble: (id: string) => void
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; onSingle(memberId) }, 220)
  }, [memberId, onSingle])
  const handleDbl = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    onDouble(memberId)
  }, [memberId, onDouble])
  return (
    <div onClick={handleClick} onDoubleClick={handleDbl}
      style={{ position: 'absolute', left, top, width: size, height: size, borderRadius: '50%', cursor: 'pointer', zIndex: 4 }} />
  )
}

/* ── HouseholdChip ── */
export function HouseholdChip({
  hh, size, isFocus, focusedMemberId: _fid, onClickPrimary, onClickSpouse,
}: {
  hh: Household
  size: number
  isFocus: boolean
  focusedMemberId?: string
  onClickPrimary: (id: string) => void
  onClickSpouse?: (id: string) => void
}) {
  const { t } = useTranslation()
  const rel = t('gen.member_relation_person')
  const primary = toInfo(hh.primary, rel)
  const secondary = hh.spouse ? toInfo(hh.spouse, rel) : undefined
  const pet = hh.pets[0] ? toPet(hh.pets[0], primary.name) : undefined
  const variant = secondary ? (pet ? 'couple_with_pet' : 'couple') : 'single'
  const isSelf = hh.primary.is_self === 1

  const timerSingle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleDblNav = useCallback((id: string) => {
    window.location.hash = `#/member/${id}`
  }, [])

  // single 卡：整張 wrapper div 可 click（頭像 flex-center，固定 offset 不可靠）
  const handleSingleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (timerSingle.current) clearTimeout(timerSingle.current)
    timerSingle.current = setTimeout(() => { timerSingle.current = null; onClickPrimary(hh.primary.id) }, 220)
  }, [hh.primary.id, onClickPrimary])
  const handleSingleDbl = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (timerSingle.current) { clearTimeout(timerSingle.current); timerSingle.current = null }
    handleDblNav(hh.primary.id)
  }, [hh.primary.id, handleDblNav])

  if (!secondary) {
    return (
      <div style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
        onClick={handleSingleClick} onDoubleClick={handleSingleDbl}>
        <HouseholdCard variant={variant} primaryMember={primary} pet={pet}
          avatarSize={size} isFocused={isFocus} width="auto" />
        {isSelf && <SelfBadge t={t} />}
      </div>
    )
  }

  // couple 卡：各自頭像 overlay（無中間線）
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <HouseholdCard variant={variant} primaryMember={primary} secondaryMember={secondary}
        pet={pet} avatarSize={size} isFocused={isFocus} width="auto" />
      <AvatarOverlay memberId={hh.primary.id} size={size}
        left={CARD_PAD} top={CARD_PAD}
        onSingle={onClickPrimary} onDouble={handleDblNav} />
      {hh.spouse && onClickSpouse && (
        <AvatarOverlay memberId={hh.spouse.id} size={size}
          left={CARD_PAD + size + COL_GAP + HEART_W + COL_GAP} top={CARD_PAD}
          onSingle={onClickSpouse} onDouble={handleDblNav} />
      )}
      {isSelf && <SelfBadge t={t} />}
    </div>
  )
}

/* ── ParentRow ── 上層父母（水平置中）── */
export function ParentRow({
  households, focusedMemberId, setFocusId,
}: {
  households: Household[]
  focusedMemberId?: string
  setFocusId: (id: string) => void
}) {
  if (households.length === 0) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '0 16px' }}>
      <HouseholdChip
        hh={households[0]} size={64}
        isFocus={focusedMemberId === households[0].primary.id || focusedMemberId === households[0].spouse?.id}
        focusedMemberId={focusedMemberId}
        onClickPrimary={setFocusId}
        onClickSpouse={setFocusId}
      />
    </div>
  )
}
