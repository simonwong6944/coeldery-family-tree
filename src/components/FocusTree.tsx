/**
 * FocusTree — 焦點式家庭樹主體（4h-fix）
 *
 * 4h-fix 改動：
 *   - 真·上下 scroll：FocusTree 不設 height/overflow，
 *     所有代全 render 落 DOM，靠 Shell <main overflowY:auto> 做 scroll
 *   - 中層 carousel scrollRef 傳給 FocusChildLayer 量度父母卡位置
 *   - FocusChildLayer 負責下層全房齊出 + translateX 對齊
 *   - 線簡化：層間只保留中央固定垂直基準線，無多餘垂直線
 *   - 每層 justifyContent: center（水平置中）
 *   - 移除 SiblingBar（整代橫線）
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, Household } from '../../packages/family-tree-engine'
import { HouseholdChip, VerticalConnector, ParentRow } from './FocusTreeParts'
import FocusChildLayer from './FocusChildLayer'

/* ── FocusCarousel ── 中層 scroll-snap carousel ── */
function FocusCarousel({
  households, selectedIdx, focusedMemberId, onSelect, setFocusId, scrollRef,
}: {
  households: Household[]
  selectedIdx: number
  focusedMemberId?: string
  onSelect: (idx: number) => void
  setFocusId: (id: string) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const settling = useRef(false)

  // selectedIdx 變化時滾到對應卡
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !el.children[selectedIdx]) return
    ;(el.children[selectedIdx] as HTMLElement).scrollIntoView({
      behavior: 'smooth', inline: 'center', block: 'nearest',
    })
  }, [selectedIdx, scrollRef])

  // scroll 停止後更新 selectedIdx（純視覺，不影響下層資料）
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
  }, [selectedIdx, onSelect, scrollRef])

  return (
    <div
      ref={scrollRef as React.RefObject<HTMLDivElement>}
      onScroll={onScroll}
      style={{
        display: 'flex', flexDirection: 'row', gap: '12px',
        overflowX: 'auto', width: '100%',
        scrollSnapType: 'x mandatory',
        /* padding 讓首/末卡能 snap 到正中（90px ≈ 半張 80px 卡 + padding） */
        padding: '4px calc(50% - 90px)',
        boxSizing: 'border-box',
        msOverflowStyle: 'none',
        position: 'relative', zIndex: 1,
        justifyContent: 'flex-start',
      }}
    >
      {households.map((hh, i) => (
        <div key={hh.primary.id} style={{ scrollSnapAlign: 'center', flexShrink: 0 }}>
          <HouseholdChip
            hh={hh} size={80}
            isFocus={i === selectedIdx}
            focusedMemberId={focusedMemberId}
            onClickPrimary={setFocusId}
            onClickSpouse={setFocusId}
          />
        </div>
      ))}
    </div>
  )
}

/* ── 層標籤 ── */
function LayerLabel({ text, accent = false }: { text: string; accent?: boolean }) {
  return <div style={{ fontSize: '13px', fontWeight: 'bold', padding: '4px 0', textAlign: 'center', width: '100%', color: accent ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>{text}</div>
}

/* ── FocusTree（主組件）── */

export interface FocusTreeProps {
  focusView: FocusView
  selectedIdx: number
  selfId: string | null
  setFocusId: (id: string) => void
  setSelectedIdx: (idx: number) => void
}

export default function FocusTree({
  focusView, selectedIdx, selfId, setFocusId, setSelectedIdx,
}: FocusTreeProps) {
  const { t } = useTranslation()
  const { parentLayer, focusLayer, childLayer } = focusView
  const focusedMemberId = focusView.focusId

  const hasParents = parentLayer.households.length > 0
  const hasAnyChildren = childLayer.groups.some(g => g.households.length > 0)
  const safeIdx = selectedIdx < focusLayer.households.length ? selectedIdx : 0

  // carouselRef 傳給 FocusCarousel + FocusChildLayer（量度父母卡位置）
  const carouselRef = useRef<HTMLDivElement | null>(null)

  return (
    /* 任務一：FocusTree 不設 height，全代 render 落 DOM，Shell <main overflowY:auto> 是 scroll container */
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: '8px', paddingBottom: '32px',
    }}>

      {/* 返回本人掣 */}
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

      {/* ── 上層（父母代）── */}
      {hasParents && (
        <>
          <LayerLabel text={t('gen.parent_layer_label')} />
          {/* 中央固定垂直基準線（上層用） */}
          <VerticalConnector height={20} />
          <ParentRow
            households={parentLayer.households}
            focusedMemberId={focusedMemberId}
            setFocusId={setFocusId}
          />
          {/* 上層到中層的基準線 */}
          <VerticalConnector height={24} />
        </>
      )}

      {/* ── 中層（焦點代 carousel）── */}
      <LayerLabel text={t('gen.focus_layer_label')} accent />
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <FocusCarousel
          households={focusLayer.households}
          selectedIdx={safeIdx}
          focusedMemberId={focusedMemberId}
          onSelect={setSelectedIdx}
          setFocusId={setFocusId}
          scrollRef={carouselRef}
        />
      </div>

      {/* ── 下層（子女代）── */}
      {hasAnyChildren && (
        <>
          {/* 中層到下層的基準線 */}
          <VerticalConnector height={24} />
          <LayerLabel text={t('gen.child_layer_label')} />
          {/* FocusChildLayer：全房齊出 + 跟 highlight 父母卡平移對齊 */}
          <FocusChildLayer
            groups={childLayer.groups}
            selectedIdx={safeIdx}
            carouselRef={carouselRef}
            focusedMemberId={focusedMemberId}
            setFocusId={setFocusId}
          />
        </>
      )}

    </div>
  )
}
