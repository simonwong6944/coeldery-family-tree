/**
 * FocusTreeParts — 焦點樹子組件（4h-fix-2）
 *
 * 問題三修正（頭像 click 區）：
 *   - 移除 AvatarOverlay 固定座標估算
 *   - HouseholdChip wrapper 整張 div 掛 onClick/onDoubleClick
 *   - couple 卡：用 pointerEvent.clientX 與 wrapper 中央比較，
 *     左半 → primary；右半 → spouse
 *   - single 卡：整張 div click → primary
 *   - 220ms 分流 single/double click
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

/* ── SiblingBar — 純範圍橫線（中層 / 下層共用）── */
export function SiblingBar() {
  return (
    <div aria-hidden="true" style={{
      height: '2px', backgroundColor: 'var(--color-primary)',
      opacity: 0.45, alignSelf: 'stretch', margin: '0 8px', flexShrink: 0,
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

/* ── HouseholdChip ──
 * 問題三修正：整張 wrapper div click，用 clientX 判斷 primary/spouse 區
 * couple 卡：clientX < wrapper 中央 → primary；否則 → spouse
 * single 卡：整張 → primary
 */
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

  const wrapRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 記錄最後一次 click 識別的 memberId（供 dblclick handler 用）
  const lastClickId = useRef<string>(hh.primary.id)

  const handleDblNav = useCallback((id: string) => {
    window.location.hash = `#/member/${id}`
  }, [])

  /** 由 clientX 決定點了 primary 還是 spouse */
  const resolveClickTarget = useCallback((clientX: number): string => {
    if (!secondary || !onClickSpouse) return hh.primary.id
    const wrap = wrapRef.current
    if (!wrap) return hh.primary.id
    const rect = wrap.getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    return clientX < midX ? hh.primary.id : hh.spouse!.id
  }, [secondary, onClickSpouse, hh.primary.id, hh.spouse])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const memberId = resolveClickTarget(e.clientX)
    lastClickId.current = memberId
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      // 用 lastClickId.current 以確保 closure 拿到最新值
      const id = lastClickId.current
      if (id === hh.primary.id) onClickPrimary(id)
      else onClickSpouse?.(id)
    }, 220)
  }, [resolveClickTarget, hh.primary.id, onClickPrimary, onClickSpouse])

  const handleDblClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const memberId = resolveClickTarget(e.clientX)
    handleDblNav(memberId)
  }, [resolveClickTarget, handleDblNav])

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
      onClick={handleClick}
      onDoubleClick={handleDblClick}
    >
      <HouseholdCard
        variant={variant}
        primaryMember={primary}
        secondaryMember={secondary}
        pet={pet}
        avatarSize={size}
        isFocused={isFocus}
        width="auto"
      />
      {isSelf && <SelfBadge t={t} />}
    </div>
  )
}

/**
 * ParentRow — @deprecated 4o 起由 FocusTree > LayerCarousel 取代，不再使用。
 * 保留 export 以維持向後相容，內部邏輯不變。
 */
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
