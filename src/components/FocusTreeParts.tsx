/**
 * FocusTreeParts — 焦點樹子組件（細步 4h）
 *
 * 4h 改動：
 *   - HouseholdChip：拆成左（primary）/ 右（spouse）兩個可 click 區
 *     single-click 半邊 → setFocusId(對應人 id)
 *     double-click 頭像 → 導航 #/member/:id
 *   - SiblingBar（整代橫線）移除
 *   - 新增 ChildGroupRow：每房獨立橫線 + 垂直線
 *   - ParentRow：保留邏輯
 *
 * module ≤ 250 行。
 */

import { useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo, PetInfo } from '../../packages/household-card'
import type { ApiMember, Household, ChildGroup } from '../../packages/family-tree-engine'

export function toInfo(m: ApiMember, rel: string): MemberInfo {
  return { name: m.display_name, relation: rel, avatarUrl: m.avatar_url ?? undefined }
}
export function toPet(p: ApiMember, ownerName: string): PetInfo {
  return { name: p.display_name, petType: '寵物', ownerRelation: ownerName, avatarUrl: p.avatar_url ?? undefined }
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

/* ── HouseholdChip ──
 * 4h：拆左（primary）/ 右（spouse）兩個可 single-click 區
 * double-click 任何半邊 → 導航 #/member/:id
 * isFocus = 整張卡焦點高亮（focusId 在 primary 或 spouse）
 */
export function HouseholdChip({
  hh, size, isFocus, focusedMemberId, onClickPrimary, onClickSpouse,
}: {
  hh: Household
  size: number
  isFocus: boolean
  /** 目前 focusId，用於半邊高亮判斷 */
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

  // single/double click 分流：dblclick 攔截後阻止 click 觸發導航
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClickPrimary = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => { onClickPrimary(hh.primary.id) }, 220)
  }, [hh.primary.id, onClickPrimary])

  const handleDblClickPrimary = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null }
    window.location.hash = `#/member/${hh.primary.id}`
  }, [hh.primary.id])

  const handleClickSpouse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hh.spouse || !onClickSpouse) return
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => { onClickSpouse!(hh.spouse!.id) }, 220)
  }, [hh.spouse, onClickSpouse])

  const handleDblClickSpouse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hh.spouse) return
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null }
    window.location.hash = `#/member/${hh.spouse.id}`
  }, [hh.spouse])

  // 決定 primary / spouse 半邊是否高亮
  const primaryActive = focusedMemberId === hh.primary.id
  const spouseActive = hh.spouse && focusedMemberId === hh.spouse.id

  if (!secondary) {
    // 單人卡：整張 click
    return (
      <div
        style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
        onClick={handleClickPrimary}
        onDoubleClick={handleDblClickPrimary}
      >
        <HouseholdCard
          variant={variant} primaryMember={primary} secondaryMember={undefined}
          pet={pet} avatarSize={size} isFocused={isFocus} width="auto"
        />
        {isSelf && <SelfBadge t={t} />}
      </div>
    )
  }

  // 配偶卡：左右半邊各自 click，外層不 onClick（避免冒泡觸發）
  return (
    <div style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
      {/* 整張卡片渲染（視覺層） */}
      <div style={{ pointerEvents: 'none' }}>
        <HouseholdCard
          variant={variant} primaryMember={primary} secondaryMember={secondary}
          pet={pet} avatarSize={size} isFocused={isFocus} width="auto"
        />
      </div>
      {/* 左半邊點擊區（primary）*/}
      <div
        onClick={handleClickPrimary}
        onDoubleClick={handleDblClickPrimary}
        title={hh.primary.display_name}
        style={{
          position: 'absolute', top: 0, left: 0, width: '50%', height: '100%',
          cursor: 'pointer', zIndex: 2,
          borderRadius: '12px 0 0 12px',
          outline: primaryActive ? '2px solid var(--color-primary)' : 'none',
          outlineOffset: '-2px',
          backgroundColor: 'transparent',
        }}
      />
      {/* 右半邊點擊區（spouse）*/}
      <div
        onClick={handleClickSpouse}
        onDoubleClick={handleDblClickSpouse}
        title={hh.spouse?.display_name ?? ''}
        style={{
          position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
          cursor: 'pointer', zIndex: 2,
          borderRadius: '0 12px 12px 0',
          outline: spouseActive ? '2px solid var(--color-primary)' : 'none',
          outlineOffset: '-2px',
          backgroundColor: 'transparent',
        }}
      />
      {isSelf && <SelfBadge t={t} />}
    </div>
  )
}

/* ── SelfBadge（內部用）── */
const selfBadgeStyle: React.CSSProperties = {
  position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)',
  fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary)',
  backgroundColor: 'var(--color-card)', border: '1.5px solid var(--color-primary)',
  borderRadius: '10px', padding: '1px 8px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 3,
}
function SelfBadge({ t }: { t: (key: string) => string }) {
  return <span style={selfBadgeStyle}>{t('gen.self_badge')}</span>
}

/* ── ChildGroupRow ── 4h：下層每房子女橫排（每房獨立橫線） */
export function ChildGroupRow({
  group, focusedMemberId, setFocusId,
}: {
  group: ChildGroup
  focusedMemberId?: string
  setFocusId: (id: string) => void
}) {
  const { households } = group
  if (households.length === 0) {
    // 佔位：無子女仍需要有固定高度，方便對齊
    return <div style={{ minWidth: '90px', flexShrink: 0 }} />
  }

  const needsHBar = households.length > 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      {/* 由父母底落到橫線或子女卡 */}
      <VerticalConnector height={20} />
      {needsHBar ? (
        <>
          {/* 橫線（只覆蓋這組子女） */}
          <div aria-hidden="true" style={{
            height: '2px',
            backgroundColor: 'var(--color-primary)',
            opacity: 0.55,
            alignSelf: 'stretch',
          }} />
          {/* 每個子女：短垂直線 + 卡 */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-start' }}>
            {households.map(hh => (
              <div key={hh.primary.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <VerticalConnector height={12} />
                <HouseholdChip
                  hh={hh} size={64}
                  isFocus={focusedMemberId === hh.primary.id || focusedMemberId === hh.spouse?.id}
                  focusedMemberId={focusedMemberId}
                  onClickPrimary={setFocusId}
                  onClickSpouse={setFocusId}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        /* 單子女：直接放卡，上面已有 VerticalConnector */
        <HouseholdChip
          hh={households[0]} size={64}
          isFocus={focusedMemberId === households[0].primary.id || focusedMemberId === households[0].spouse?.id}
          focusedMemberId={focusedMemberId}
          onClickPrimary={setFocusId}
          onClickSpouse={setFocusId}
        />
      )}
    </div>
  )
}

/* ── ParentRow ── 上層父母（最多一張卡，置中） ── */
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
        hh={households[0]}
        size={64}
        isFocus={
          focusedMemberId === households[0].primary.id ||
          focusedMemberId === households[0].spouse?.id
        }
        focusedMemberId={focusedMemberId}
        onClickPrimary={setFocusId}
        onClickSpouse={setFocusId}
      />
    </div>
  )
}
