/**
 * FocusTree — 焦點式家庭樹主體（4i：多層遞歸渲染）
 *
 * 依 focusView.levels 陣列（generation 由小到大）順序 render：
 *   - generation < 0 → 祖先代，用 ParentRow（單行橫排）
 *   - generation = 0 → 焦點代，用 FocusCarousel（横向 snap）
 *   - generation > 0 → 後代代，每代用 FocusChildLayer（平移對位）
 *
 * 每兩個相鄰代之間加 VerticalConnector 分隔線。
 * 樣式維持現狀，唔加新視覺功能。
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, FocusLevel, Household } from '../../packages/family-tree-engine'
import { HouseholdChip, VerticalConnector, ParentRow, SiblingBar } from './FocusTreeParts'
import FocusChildLayer from './FocusChildLayer'

/* ── FocusCarousel ── 焦點代橫向 snap carousel ── */
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
      {households.length > 1 && <SiblingBar />}
      <div
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        onScroll={onScroll}
        style={{
          display: 'flex', flexDirection: 'row', gap: '12px',
          overflowX: 'auto', overflowY: 'visible', width: '100%',
          scrollSnapType: 'x mandatory',
          scrollPaddingInline: 'calc(50% - 90px)',
          padding: '4px 0', boxSizing: 'border-box',
          msOverflowStyle: 'none', touchAction: 'pan-x',
          justifyContent: 'center',
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

/* ── levelLabel：根據 generation 決定文字 ── */
function genLabel(gen: number, t: ReturnType<typeof import('react-i18next').useTranslation>['t']): string {
  // 使用 locale 已有的 layer_label_minus1 / layer_label_0 / layer_label_1 等 key
  const keyMap: Record<number, string> = {
    [-3]: 'gen.layer_label_minus3', [-2]: 'gen.layer_label_minus2',
    [-1]: 'gen.layer_label_minus1', [0]: 'gen.layer_label_0',
    [1]: 'gen.layer_label_1', [2]: 'gen.layer_label_2', [3]: 'gen.layer_label_3',
  }
  const key = keyMap[gen]
  if (key) return t(key)
  return gen < 0 ? `第 ${gen} 代` : `第 +${gen} 代`
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
  const { levels, focusId } = focusView

  const focusLevel  = levels.find(l => l.generation === 0)
  const focusHHs    = focusLevel?.groups.flatMap(g => g.households) ?? []
  const safeIdx     = selectedIdx < focusHHs.length ? selectedIdx : 0

  const carouselRef = useRef<HTMLDivElement | null>(null)

  return (
    /* FocusTree 不設 height/overflow，自然撐高 <main>，靠 Shell <main> scroll */
    <div style={{
      width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: '8px', paddingBottom: '32px',
    }}>

      {/* 返回本人掣 */}
      {selfId && selfId !== focusId && (
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

      {/* ── 依 levels 順序 render 所有代 ── */}
      {levels.map((level: FocusLevel, li: number) => {
        const isFirst = li === 0
        const allHH   = level.groups.flatMap(g => g.households)
        if (allHH.length === 0) return null

        return (
          <div key={level.generation} style={{ width: '100%', display: 'contents' }}>
            {/* 相鄰代之間加 VerticalConnector */}
            {!isFirst && <VerticalConnector height={24} />}

            <LayerLabel
              text={genLabel(level.generation, t)}
              accent={level.generation === 0}
            />

            {level.generation < 0 && (
              /* 祖先代：ParentRow 單行橫排 */
              <>
                <VerticalConnector height={20} />
                <ParentRow
                  households={allHH}
                  focusedMemberId={focusId}
                  setFocusId={setFocusId}
                />
              </>
            )}

            {level.generation === 0 && (
              /* 焦點代：FocusCarousel */
              <div style={{ width: '100%' }}>
                <FocusCarousel
                  households={focusHHs}
                  selectedIdx={safeIdx}
                  focusedMemberId={focusId}
                  onSelect={setSelectedIdx}
                  setFocusId={setFocusId}
                  scrollRef={carouselRef}
                />
              </div>
            )}

            {level.generation > 0 && (
              /* 後代代：FocusChildLayer（平移對位）
               * carouselRef 傳給 gen=1 對齊焦點 carousel；
               * gen>1 的 carouselRef 設 null（不對位，下步再處理）。 */
              <FocusChildLayer
                groups={level.groups.map(g => ({
                  parentHouseholdId: g.parentHouseholdId ?? '',
                  households: g.households,
                }))}
                selectedIdx={level.generation === 1 ? safeIdx : 0}
                carouselRef={level.generation === 1 ? carouselRef : { current: null }}
                focusedMemberId={focusId}
                setFocusId={setFocusId}
              />
            )}
          </div>
        )
      })}

    </div>
  )
}
