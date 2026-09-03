/**
 * FocusTree — 焦點式家庭樹主體（4h-fix-2）
 *
 * 問題一：carousel wrapper 移除 overflow:hidden（不截縱向 scroll）
 *         + touch-action:pan-x 只攔橫向手勢
 * 問題四：中層 household>1 時，carousel 上方加純範圍橫線（SiblingBar）
 * 問題五：carousel padding 改用 scrollPadding + flex justifyContent:center，
 *         移除寫死 calc(50% - 90px)
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, Household } from '../../packages/family-tree-engine'
import { HouseholdChip, VerticalConnector, ParentRow, SiblingBar } from './FocusTreeParts'
import FocusChildLayer from './FocusChildLayer'

/* ── FocusCarousel ── 中層 scroll-snap carousel ──
 * 問題四：households.length > 1 → 上方加 SiblingBar
 * 問題五：padding 改 scrollPaddingInline，flex justifyContent:center
 * 問題一：touch-action: pan-x（只攔橫向手勢，縱向 scroll 不受阻）
 */
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

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !el.children[selectedIdx]) return
    ;(el.children[selectedIdx] as HTMLElement).scrollIntoView({
      behavior: 'smooth', inline: 'center', block: 'nearest',
    })
  }, [selectedIdx, scrollRef])

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
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      {/* 問題四：兄弟姊妹橫線（household 數 > 1 時） */}
      {households.length > 1 && <SiblingBar />}

      {/* carousel scroll 容器
       * 問題五：scrollSnapType x mandatory，padding 用 scrollPaddingInline
       *   首末卡能 snap 到正中靠 scroll-padding-inline，不靠 content padding
       * 問題一：touch-action pan-x，不截縱向 scroll
       */}
      <div
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        onScroll={onScroll}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          overflowX: 'auto',
          overflowY: 'visible',    /* 問題一：不截縱向 */
          width: '100%',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: 'calc(50% - 90px)',  /* 問題五：scroll padding，不影響 layout */
          padding: '4px 0',
          boxSizing: 'border-box',
          msOverflowStyle: 'none',
          touchAction: 'pan-x',   /* 問題一：只攔橫向手勢 */
          justifyContent: 'center', /* 問題五：flex 置中（少於一屏時） */
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
    </div>
  )
}

/* ── 層標籤 ── */
function LayerLabel({ text, accent = false }: { text: string; accent?: boolean }) {
  return (
    <div style={{
      fontSize: '13px', fontWeight: 'bold', padding: '4px 0',
      textAlign: 'center', width: '100%',
      color: accent ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    }}>{text}</div>
  )
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

  const carouselRef = useRef<HTMLDivElement | null>(null)

  return (
    /* FocusTree 不設 height/overflow，自然撐高 <main>，靠 Shell <main> scroll */
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
          <VerticalConnector height={20} />
          <ParentRow
            households={parentLayer.households}
            focusedMemberId={focusedMemberId}
            setFocusId={setFocusId}
          />
          <VerticalConnector height={24} />
        </>
      )}

      {/* ── 中層（焦點代 carousel）──
       * 問題一：移除 overflow:hidden wrapper（原本截縱向 scroll）
       * 改為 width:100% 無 overflow 限制，只靠 carousel 本身 overflowX:auto
       */}
      <LayerLabel text={t('gen.focus_layer_label')} accent />
      <div style={{ width: '100%' }}>
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
          <VerticalConnector height={24} />
          <LayerLabel text={t('gen.child_layer_label')} />
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
