/**
 * FocusTreeParts — 焦點樹子組件（4q：+SwipeDots）
 *
 * 4q 新增：
 *   SwipeDots — 卡左下/右下角 dots 撥動提示
 *     - leftCount / rightCount = 該方向剩餘人數
 *     - 上限 5 粒；CSS 變數上色
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

/* ── SiblingBar ── */
export function SiblingBar() {
  return (
    <div aria-hidden="true" style={{
      height: '2px', backgroundColor: 'var(--color-primary)',
      opacity: 0.45, alignSelf: 'stretch', margin: '0 8px', flexShrink: 0,
    }} />
  )
}

/* ── SwipeDots（4q 新增）──
 * count: 該方向剩餘人數（0 = 不顯示）
 * side: 'left' | 'right'
 * 上限 MAX_DOTS 粒
 */
const MAX_DOTS = 5

export function SwipeDots({ count, side }: { count: number; side: 'left' | 'right' }) {
  if (count <= 0) return null
  const dots = Math.min(count, MAX_DOTS)
  return (
    <div
      aria-label={`${side === 'left' ? '左' : '右'}邊還有 ${count} 人`}
      style={{
        position: 'absolute',
        bottom: '6px',
        ...(side === 'left' ? { left: '6px' } : { right: '6px' }),
        display: 'flex',
        flexDirection: 'row',
        gap: '3px',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      {Array.from({ length: dots }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '5px', height: '5px', borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            opacity: 0.55,
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

/* ── SelfBadge ── */
const selfBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)',
  fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary)',
  backgroundColor: 'var(--color-card)', border: '1.5px solid var(--color-primary)',
  borderRadius: '10px', padding: '1px 8px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 3,
}
function SelfBadge({ t, left = '50%' }: { t: (key: string) => string; left?: string }) {
  return <span style={{ ...selfBadgeStyle, left }}>{t('gen.self_badge')}</span>
}

/* ── HouseholdChip ──
 * 4q 新增：leftCount / rightCount → SwipeDots
 * 問題三修正（4h-fix-2）：整張 wrapper div click，用 clientX 判斷 primary/spouse
 */
export function HouseholdChip({
  hh, size, isFocus, focusedMemberId: _fid, onClickPrimary, onClickSpouse,
  leftCount = 0, rightCount = 0, selfId = null, kinKeys,
}: {
  hh: Household
  size: number
  isFocus: boolean
  focusedMemberId?: string
  onClickPrimary: (id: string) => void
  onClickSpouse?: (id: string) => void
  leftCount?: number
  rightCount?: number
  selfId?: string | null
  /** 以本人為中心嘅親屬稱謂（Map<memberId, i18nKey>）*/
  kinKeys?: Map<string, string>
}) {
  const { t } = useTranslation()
  const relOf = (id: string) => t(kinKeys?.get(id) ?? 'gen.member_relation_person')
  const primary = toInfo(hh.primary, relOf(hh.primary.id))
  const secondary = hh.spouse ? toInfo(hh.spouse, relOf(hh.spouse.id)) : undefined
  const pet = hh.pets[0] ? toPet(hh.pets[0], primary.name) : undefined
  const variant = secondary ? (pet ? 'couple_with_pet' : 'couple') : 'single'
  /* 「本人」= 登入者節點（selfId）；selfId 未定時 fallback 舊 is_self */
  const selfIsPrimary = selfId ? hh.primary.id === selfId : hh.primary.is_self === 1
  const selfIsSpouse  = !!selfId && !!hh.spouse && hh.spouse.id === selfId
  const isSelf        = selfIsPrimary || selfIsSpouse

  const wrapRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastClickId = useRef<string>(hh.primary.id)

  /* 雙擊 → 成長相簿 */
  const handleDblNav = useCallback((id: string) => {
    window.location.hash = `#/album/${id}`
  }, [])

  /* 長按 → 成員詳情（profile）*/
  const handleLongNav = useCallback((id: string) => {
    window.location.hash = `#/member/${id}`
  }, [])

  const resolveClickTarget = useCallback((clientX: number): string => {
    if (!secondary || !onClickSpouse) return hh.primary.id
    const wrap = wrapRef.current
    if (!wrap) return hh.primary.id
    const rect = wrap.getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    return clientX < midX ? hh.primary.id : hh.spouse!.id
  }, [secondary, onClickSpouse, hh.primary.id, hh.spouse])

  /* 長按（600ms）→ 成員詳情；移動 >10px 視為滑動，取消長按 */
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const longFired  = useRef(false)
  function clearPress() { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null } }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    longFired.current = false
    pressStart.current = { x: e.clientX, y: e.clientY }
    clearPress()
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      longFired.current = true
      handleLongNav(resolveClickTarget(pressStart.current?.x ?? 0))
    }, 600)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = pressStart.current
    if (!s) return
    if (Math.abs(e.clientX - s.x) > 10 || Math.abs(e.clientY - s.y) > 10) clearPress()
  }
  function onPointerUp() { clearPress() }

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (longFired.current) { longFired.current = false; return }
    const memberId = resolveClickTarget(e.clientX)
    lastClickId.current = memberId
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      const id = lastClickId.current
      if (id === hh.primary.id) onClickPrimary(id)
      else onClickSpouse?.(id)
    }, 220)
  }, [resolveClickTarget, hh.primary.id, onClickPrimary, onClickSpouse])

  const handleDblClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (longFired.current) return
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
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
      {isSelf && <SelfBadge t={t} left={!secondary ? '50%' : (selfIsSpouse ? '76%' : '24%')} />}
      <SwipeDots count={leftCount}  side="left"  />
      <SwipeDots count={rightCount} side="right" />
    </div>
  )
}

/**
 * ParentRow — @deprecated 4o 起由 FocusTree > LayerCarousel 取代，不再使用。
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
