/**
 * FocusTree — 焦點式家庭樹主體（細步 4g）
 *
 * 架構：
 *   - 最多 3 層：上（父母代）、中（焦點代 carousel）、下（子女代）
 *   - 中層：scroll-snap carousel，左右滾動切換兄弟姊妹
 *   - 上/下層：固定置中，點擊任何成員 → 成為新 focusId（換代探索）
 *   - 連線：純 CSS/JSX 垂直線 + sibling bar（無 SVG DOM 量測，永遠居中）
 *   - 返回本人掣：focusId ≠ selfId 時顯示
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, Household } from '../../packages/family-tree-engine'
import {
  HouseholdChip, SiblingBar, VerticalConnector, ChildrenRow, ParentRow,
} from './FocusTreeParts'

/* ── FocusCarousel ── 中層 scroll-snap carousel ── */
function FocusCarousel({
  households, selectedIdx, onSelect, setFocusId,
}: {
  households: Household[]
  selectedIdx: number
  onSelect: (idx: number) => void
  setFocusId: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const settling = useRef(false)

  // selectedIdx 變化時滾動到對應卡
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !el.children[selectedIdx]) return
    ;(el.children[selectedIdx] as HTMLElement).scrollIntoView({
      behavior: 'smooth', inline: 'center', block: 'nearest',
    })
  }, [selectedIdx])

  // scroll 停止後更新 selectedIdx
  const onScroll = useCallback(() => {
    if (settling.current) return
    settling.current = true
    setTimeout(() => {
      settling.current = false
      const el = scrollRef.current
      if (!el) return
      const center = el.getBoundingClientRect().left + el.clientWidth / 2
      let bestIdx = 0, bestDist = Infinity
      Array.from(el.children).forEach((child, i) => {
        const r = (child as HTMLElement).getBoundingClientRect()
        const d = Math.abs(r.left + r.width / 2 - center)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      })
      if (bestIdx !== selectedIdx) onSelect(bestIdx)
    }, 150)
  }, [selectedIdx, onSelect])

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{
        display: 'flex', flexDirection: 'row', gap: '12px',
        overflowX: 'auto', width: '100%',
        scrollSnapType: 'x mandatory',
        padding: '4px calc(50% - 90px)',  // 讓第一/末尾卡能 snap 到正中（90px ≈ 半張卡寬）
        boxSizing: 'border-box',
        msOverflowStyle: 'none',
        position: 'relative', zIndex: 1,
      }}
    >
      {households.map((hh, i) => (
        <div
          key={hh.primary.id}
          style={{ scrollSnapAlign: 'center', flexShrink: 0 }}
        >
          <HouseholdChip
            hh={hh} size={80}
            isFocus={i === selectedIdx}
            onClick={setFocusId}
          />
        </div>
      ))}
    </div>
  )
}

/* ── FocusTree（主組件）── */

export interface FocusTreeProps {
  focusView: FocusView
  /** 中層目前選中的 household index（決定下層顯示哪組子女） */
  selectedIdx: number
  /** is_self=1 成員 id（返回本人掣用） */
  selfId: string | null
  setFocusId: (id: string) => void
  setSelectedIdx: (idx: number) => void
}

export default function FocusTree({
  focusView, selectedIdx, selfId, setFocusId, setSelectedIdx,
}: FocusTreeProps) {
  const { t } = useTranslation()
  const { parentLayer, focusLayer, childLayer } = focusView

  const hasParents = parentLayer.households.length > 0
  const hasChildren = childLayer.households.length > 0
  const safeIdx = selectedIdx < focusLayer.households.length ? selectedIdx : 0

  return (
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 0, position: 'relative', paddingTop: '8px',
    }}>

      {/* 返回本人掣（焦點不在本人時才顯示） */}
      {selfId && selfId !== focusView.focusId && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
          <button
            onClick={() => setFocusId(selfId)}
            style={{
              padding: '0 20px', minHeight: '40px', borderRadius: '20px',
              fontSize: '15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer',
              border: '2px solid var(--color-primary)',
              backgroundColor: 'var(--color-card)', color: 'var(--color-primary)',
            }}
          >{t('gen.back_to_self')}</button>
        </div>
      )}

      {/* 上層（父母代） */}
      {hasParents && (
        <>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '4px 0', fontWeight: 'bold' }}>
            {t('gen.parent_layer_label')}
          </div>
          <ParentRow households={parentLayer.households} setFocusId={setFocusId} />
          <VerticalConnector height={24} />
        </>
      )}

      {/* 中層（焦點代 carousel）— 帶 sibling bar */}
      <div style={{ fontSize: '13px', color: 'var(--color-primary)', padding: '2px 0 4px', fontWeight: 'bold' }}>
        {t('gen.focus_layer_label')}
      </div>
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        {focusLayer.households.length > 1 && <SiblingBar />}
        <FocusCarousel
          households={focusLayer.households}
          selectedIdx={safeIdx}
          onSelect={setSelectedIdx}
          setFocusId={setFocusId}
        />
      </div>

      {/* 下層（子女代） */}
      {hasChildren && (
        <>
          <VerticalConnector height={24} />
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', padding: '2px 0 4px', fontWeight: 'bold' }}>
            {t('gen.child_layer_label')}
          </div>
          <ChildrenRow households={childLayer.households} setFocusId={setFocusId} />
        </>
      )}

      <div style={{ height: '16px' }} />
    </div>
  )
}
