/**
 * FocusTree — 焦點式家庭樹（4n：多層連動鏈，每代獨立 selectedIdx）
 * generation < 0 → ParentRow；= 0 → FocusCarousel（swipe-to-step）；> 0 → FocusChildLayer
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, FocusLevel, Household } from '../../packages/family-tree-engine'
import { HouseholdChip, VerticalConnector, ParentRow } from './FocusTreeParts'
import FocusChildLayer from './FocusChildLayer'

const SWIPE_THRESHOLD = 40

function FocusCarousel({ households, selectedIdx, focusedMemberId, onSelect, setFocusId, scrollRef }: {
  households: Household[]
  selectedIdx: number
  focusedMemberId?: string
  onSelect: (idx: number) => void
  setFocusId: (id: string) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const prevIdxRef     = useRef(-1)
  const selectedIdxRef = useRef(selectedIdx)
  const pointerRef     = useRef<{ x: number; y: number; id: number } | null>(null)
  const isSingle       = households.length === 1
  const total          = households.length
  selectedIdxRef.current = selectedIdx

  useEffect(() => {
    if (prevIdxRef.current === selectedIdx) return
    prevIdxRef.current = selectedIdx
    const el = scrollRef.current
    if (!el) return
    const cards = Array.from(el.children).slice(1, -1) as HTMLElement[]
    cards[selectedIdx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedIdx, scrollRef])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (isSingle) return
    pointerRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }, [isSingle])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const start = pointerRef.current
    if (!start || start.id !== e.pointerId) return
    pointerRef.current = null
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dy) > Math.abs(dx)) return
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    const cur = selectedIdxRef.current
    const next = dx < 0 ? Math.min(cur + 1, total - 1) : Math.max(cur - 1, 0)
    if (next !== cur) onSelect(next)
  }, [isSingle, total, onSelect])

  const onPointerCancel = useCallback(() => { pointerRef.current = null }, [])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <div
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        className="focus-carousel-track"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'flex', flexDirection: 'row',
          overflowX: 'hidden', overflowY: 'visible',
          width: '100%', padding: '4px 0', boxSizing: 'border-box',
          touchAction: isSingle ? 'auto' : 'none',
          justifyContent: isSingle ? 'center' : 'flex-start',
          userSelect: 'none',
        }}
      >
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}
        {households.map((hh, i) => (
          <div key={hh.primary.id} style={{ width: '80vw', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <HouseholdChip hh={hh} size={80} isFocus={i === selectedIdx} focusedMemberId={focusedMemberId} onClickPrimary={setFocusId} onClickSpouse={setFocusId} />
          </div>
        ))}
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}
      </div>
    </div>
  )
}

function LayerLabel({ text, accent = false }: { text: string; accent?: boolean }) {
  return (
    <div style={{ fontSize: '13px', fontWeight: 'bold', padding: '4px 0', textAlign: 'center', width: '100%', color: accent ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>{text}</div>
  )
}

const GEN_KEY: Record<number, string> = {
  [-3]: 'gen.layer_label_minus3', [-2]: 'gen.layer_label_minus2',
  [-1]: 'gen.layer_label_minus1', [0]: 'gen.layer_label_0',
  [1]: 'gen.layer_label_1', [2]: 'gen.layer_label_2', [3]: 'gen.layer_label_3',
}
function genLabel(gen: number, t: (k: string) => string): string {
  return GEN_KEY[gen] ? t(GEN_KEY[gen]) : (gen < 0 ? `第 ${gen} 代` : `第 +${gen} 代`)
}

export interface FocusTreeProps {
  focusView: FocusView
  selectedIdx: number
  selfId: string | null
  setFocusId: (id: string) => void
  setSelectedIdx: (idx: number) => void
}

export default function FocusTree({ focusView, selectedIdx, selfId, setFocusId, setSelectedIdx }: FocusTreeProps) {
  const { t } = useTranslation()
  const { levels, focusId } = focusView
  const focusHHs  = levels.find(l => l.generation === 0)?.groups.flatMap(g => g.households) ?? []
  const safeIdx   = selectedIdx < focusHHs.length ? selectedIdx : 0
  const carouselRef = useRef<HTMLDivElement | null>(null)

  /**
   * 4n：每代（generation ≥ 1）獨立的 selectedIdx
   * FocusChildLayer[gen] 的 selectedIdx = getIdx(gen-1)（上一代選中）
   * 撥某代 → setIdx(gen, next)，重置更深代為 0
   */
  const [idxByGen, setIdxByGen] = useState<Record<number, number>>({})

  // getIdx(gen)：gen=0 → safeIdx；gen≥1 → idxByGen[gen] ?? 0
  function getIdx(gen: number): number {
    return gen === 0 ? safeIdx : (idxByGen[gen] ?? 0)
  }

  // setIdx(gen, next)：更新該代 idx，gen=1 同步 gen 0，重置更深代
  function setIdx(gen: number, next: number) {
    if (gen === 1) setSelectedIdx(next)
    setIdxByGen(prev => {
      const u: Record<number, number> = { ...prev, [gen]: next }
      for (const k of Object.keys(prev).map(Number)) { if (k > gen) u[k] = 0 }
      return u
    })
  }

  /* 切換焦點人時重置所有代 idx */
  useEffect(() => { setIdxByGen({}) }, [focusId])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8px', paddingBottom: '32px' }}>

      {selfId && selfId !== focusId && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
          <button
            onClick={() => setFocusId(selfId)}
            style={{ padding: '0 20px', minHeight: '40px', borderRadius: '20px', fontSize: '15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' }}
          >{t('gen.back_to_self')}</button>
        </div>
      )}

      {levels.map((level: FocusLevel, li: number) => {
        const allHH = level.groups.flatMap(g => g.households)
        if (allHH.length === 0) return null
        return (
          <div key={level.generation} style={{ width: '100%', display: 'contents' }}>
            {li !== 0 && <VerticalConnector height={24} />}
            <LayerLabel text={genLabel(level.generation, t)} accent={level.generation === 0} />

            {level.generation < 0 && (
              <><VerticalConnector height={20} /><ParentRow households={allHH} focusedMemberId={focusId} setFocusId={setFocusId} /></>
            )}

            {level.generation === 0 && (
              <div style={{ width: '100%' }}>
                <FocusCarousel households={focusHHs} selectedIdx={safeIdx} focusedMemberId={focusId} onSelect={setSelectedIdx} setFocusId={setFocusId} scrollRef={carouselRef} />
              </div>
            )}

            {level.generation > 0 && (
              /*
               * 4n 多層連動：
               *   selectedIdx = getIdx(gen-1)：上一代選中 → 決定本層顯示哪 group + 對正位置
               *   onSelect = setIdx(gen, i)：撥本層 → 更新本代 idx → 影響下一代 + 重置更深代
               */
              <FocusChildLayer
                groups={level.groups.map(g => ({ parentHouseholdId: g.parentHouseholdId ?? '', households: g.households }))}
                selectedIdx={getIdx(level.generation - 1)}
                carouselRef={level.generation === 1 ? carouselRef : { current: null }}
                focusedMemberId={focusId}
                setFocusId={setFocusId}
                onSelect={(i) => setIdx(level.generation, i)}
              />
            )}
          </div>
        )
      })}

    </div>
  )
}
