/**
 * FocusTree — 焦點式家庭樹（4o：全層統一 carousel）
 * 所有代（父母/本人/子女/孫）用同一個 LayerCarousel；
 * gen>0 按 getIdx(gen-1) 選出對應 group 的 households；
 * 保留 4n idxByGen 向下連動 + reset 更深代精神。
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, FocusLevel, Household } from '../../packages/family-tree-engine'
import { HouseholdChip, VerticalConnector } from './FocusTreeParts'

const SWIPE_THRESHOLD = 40

/* ── LayerCarousel：所有代共用 ── */
function LayerCarousel({ households, selectedIdx, onSelect, focusedMemberId, setFocusId, chipSize = 80 }: {
  households: Household[]; selectedIdx: number; onSelect?: (idx: number) => void
  focusedMemberId?: string; setFocusId: (id: string) => void; chipSize?: number
}) {
  const scrollRef      = useRef<HTMLDivElement | null>(null)
  const prevIdxRef     = useRef<number>(-1)
  const selectedIdxRef = useRef(selectedIdx)
  const pointerRef     = useRef<{ x: number; y: number; id: number } | null>(null)
  selectedIdxRef.current = selectedIdx

  const isSingle = households.length <= 1
  const canSwipe = !!onSelect && !isSingle

  /* snap on idx change（prevIdx=-1 強制 mount 時也執行）*/
  useEffect(() => {
    if (prevIdxRef.current === selectedIdx) return
    prevIdxRef.current = selectedIdx
    const cards = Array.from(scrollRef.current?.children ?? []).slice(1, -1) as HTMLElement[]
    cards[selectedIdx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedIdx])

  /* mount 時雙幀後強制置中（修 Simon 偏右 / Cindy 切邊）*/
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => {
      const cards = Array.from(scrollRef.current?.children ?? []).slice(1, -1) as HTMLElement[]
      cards[selectedIdxRef.current]?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
    }))
    return () => cancelAnimationFrame(r)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!canSwipe) return
    pointerRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }, [canSwipe])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!canSwipe) return
    const s = pointerRef.current
    if (!s || s.id !== e.pointerId) return
    pointerRef.current = null
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < SWIPE_THRESHOLD) return
    const cur = selectedIdxRef.current
    const next = dx < 0 ? Math.min(cur + 1, households.length - 1) : Math.max(cur - 1, 0)
    if (next !== cur) onSelect!(next)
  }, [canSwipe, households.length, onSelect])

  const onPointerCancel = useCallback(() => { pointerRef.current = null }, [])

  if (!households.length) return null
  return (
    <div style={{ width: '100%' }}>
      <div ref={scrollRef} className="focus-carousel-track"
        onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
        style={{
          display: 'flex', flexDirection: 'row',
          overflowX: 'hidden', overflowY: 'visible',
          width: '100%', padding: '4px 0', boxSizing: 'border-box',
          touchAction: canSwipe ? 'none' : 'auto',
          justifyContent: isSingle ? 'center' : 'flex-start',
          userSelect: 'none',
        }}
      >
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}
        {households.map((hh, i) => (
          <div key={hh.primary.id} style={{ width: isSingle ? 'auto' : '80vw', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <HouseholdChip hh={hh} size={chipSize} isFocus={i === selectedIdx} focusedMemberId={focusedMemberId} onClickPrimary={setFocusId} onClickSpouse={setFocusId} />
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
  [1]: 'gen.layer_label_1',       [2]: 'gen.layer_label_2',       [3]: 'gen.layer_label_3',
}
function genLabel(gen: number, t: (k: string) => string): string {
  return GEN_KEY[gen] ? t(GEN_KEY[gen]) : (gen < 0 ? `第 ${gen} 代` : `第 +${gen} 代`)
}

/* 從 gen>0 groups 中，按上代選中的 household 選出本代 households */
function pickHouseholds(
  groups: { parentHouseholdId: string; households: Household[] }[],
  parentHHs: Household[], parentIdx: number,
): Household[] {
  const parentHH = parentHHs[parentIdx]
  if (!parentHH) return []
  return groups.find(g => g.parentHouseholdId === parentHH.primary.id)?.households ?? []
}

export interface FocusTreeProps {
  focusView: FocusView; selectedIdx: number; selfId: string | null
  setFocusId: (id: string) => void; setSelectedIdx: (idx: number) => void
}

export default function FocusTree({ focusView, selectedIdx, selfId, setFocusId, setSelectedIdx }: FocusTreeProps) {
  const { t } = useTranslation()
  const { levels, focusId } = focusView
  const focusHHs = levels.find(l => l.generation === 0)?.groups.flatMap(g => g.households) ?? []
  const safeIdx  = selectedIdx < focusHHs.length ? selectedIdx : 0

  /* 4n/4o：每代獨立 selectedIdx（gen≥1），向下連動 */
  const [idxByGen, setIdxByGen] = useState<Record<number, number>>({})
  function getIdx(g: number) { return g === 0 ? safeIdx : (idxByGen[g] ?? 0) }
  function setIdx(g: number, next: number) {
    if (g === 1) setSelectedIdx(next)
    setIdxByGen(prev => {
      const u: Record<number, number> = { ...prev, [g]: next }
      for (const k of Object.keys(prev).map(Number)) { if (k > g) u[k] = 0 }
      return u
    })
  }
  useEffect(() => { setIdxByGen({}) }, [focusId])

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8px', paddingBottom: '32px' }}>

      {selfId && selfId !== focusId && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '8px' }}>
          <button onClick={() => setFocusId(selfId)} style={{ padding: '0 20px', minHeight: '40px', borderRadius: '20px', fontSize: '15px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-card)', color: 'var(--color-primary)' }}>
            {t('gen.back_to_self')}
          </button>
        </div>
      )}

      {levels.map((level: FocusLevel, li: number) => {
        const gen   = level.generation
        const allHH = level.groups.flatMap(g => g.households)
        if (allHH.length === 0) return null

        /* gen>0：選出本代要顯示的 households（按上代選中房）*/
        const parentHHs = gen > 1
          ? (levels.find(l => l.generation === gen - 1)?.groups.flatMap(g => g.households) ?? [])
          : focusHHs
        const groups4child = level.groups.map(g => ({ parentHouseholdId: g.parentHouseholdId ?? '', households: g.households }))
        const displayHHs   = gen > 0 ? pickHouseholds(groups4child, parentHHs, getIdx(gen - 1)) : allHH
        if (displayHHs.length === 0) return null

        const layerIdx     = getIdx(gen)
        const safeLayerIdx = layerIdx < displayHHs.length ? layerIdx : 0

        return (
          <div key={gen} style={{ width: '100%', display: 'contents' }}>
            {li !== 0 && <VerticalConnector height={24} />}
            <LayerLabel text={genLabel(gen, t)} accent={gen === 0} />
            <VerticalConnector height={8} />
            <LayerCarousel
              households={displayHHs}
              selectedIdx={safeLayerIdx}
              onSelect={gen === 0 ? setSelectedIdx : gen < 0 ? undefined : (i) => setIdx(gen, i)}
              focusedMemberId={focusId}
              setFocusId={setFocusId}
              chipSize={gen === 0 ? 80 : 64}
            />
          </div>
        )
      })}

    </div>
  )
}
