/**
 * FocusTree — 焦點式家庭樹
 * 4q: selectedIdxHint / householdsKey / setPointerCapture
 * 4r: idByGen(id-based) + pickHouseholds by primaryId; fallback → []
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
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
  const selectedIdxRef = useRef(selectedIdx)
  const pointerRef     = useRef<{ x: number; y: number; id: number } | null>(null)
  selectedIdxRef.current = selectedIdx

  const isSingle = households.length <= 1
  const canSwipe = !!onSelect && !isSingle

  // Symptom 2 修正：householdsKey 追蹤 households 內容是否變化
  const householdsKey = useMemo(
    () => households.map(h => h.primary.id).join(','),
    [households]
  )

  /**
   * snap effect：selectedIdx 或 householdsKey 任一變化都重新置中。
   * 不再依賴 prevIdxRef 比較——households 換了（層連動）即使 idx 不變也要 snap。
   * mount 時亦觸發（householdsKey 初始值算作「變化」）。
   */
  useEffect(() => {
    const cards = Array.from(scrollRef.current?.children ?? []).slice(1, -1) as HTMLElement[]
    cards[selectedIdx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx, householdsKey])

  /* mount 後雙幀強制 auto 置中（修偏位）*/
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => {
      const cards = Array.from(scrollRef.current?.children ?? []).slice(1, -1) as HTMLElement[]
      cards[selectedIdxRef.current]?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
    }))
    return () => cancelAnimationFrame(r)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Symptom 3 修正：setPointerCapture 確保 pointerup 必達 */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) return
    pointerRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    // 鎖住 pointer → 即使 drag 出範圍，pointerup/cancel 仍觸發在同一元素
    try { (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId) } catch (_) { /* ignore */ }
  }, [canSwipe])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!canSwipe) return
    const s = pointerRef.current
    if (!s || s.id !== e.pointerId) { pointerRef.current = null; return }
    pointerRef.current = null
    const dx = e.clientX - s.x, dy = e.clientY - s.y
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < SWIPE_THRESHOLD) return
    const cur  = selectedIdxRef.current
    const next = dx < 0 ? Math.min(cur + 1, households.length - 1) : Math.max(cur - 1, 0)
    if (next !== cur) onSelect!(next)
  }, [canSwipe, households.length, onSelect])

  // Symptom 3 補充：任何離開/失去 capture 路徑都清 pointerRef
  const clearPointer = useCallback(() => { pointerRef.current = null }, [])

  if (!households.length) return null
  return (
    <div style={{ width: '100%' }}>
      <div
        ref={scrollRef}
        className="focus-carousel-track"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={clearPointer}
        onPointerLeave={clearPointer}
        onLostPointerCapture={clearPointer}
        style={{
          display: 'flex', flexDirection: 'row',
          overflowX: 'scroll', overflowY: 'visible',
          width: '100%', padding: '4px 0', boxSizing: 'border-box',
          touchAction: canSwipe ? 'none' : 'auto',
          justifyContent: isSingle ? 'center' : 'flex-start',
          userSelect: 'none',
        }}
      >
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}
        {households.map((hh, i) => (
          <div
            key={hh.primary.id}
            style={{ width: isSingle ? 'auto' : '80vw', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}
          >
            <HouseholdChip
              hh={hh} size={chipSize}
              isFocus={i === selectedIdx}
              focusedMemberId={focusedMemberId}
              onClickPrimary={setFocusId}
              onClickSpouse={setFocusId}
              leftCount={i}
              rightCount={households.length - 1 - i}
            />
          </div>
        ))}
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}
      </div>
    </div>
  )
}

function LayerLabel({ text, accent = false }: { text: string; accent?: boolean }) {
  return (
    <div style={{
      fontSize: '13px', fontWeight: 'bold', padding: '4px 0',
      textAlign: 'center', width: '100%',
      color: accent ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    }}>{text}</div>
  )
}

const GEN_KEY: Record<number, string> = {
  [-3]: 'gen.layer_label_minus3', [-2]: 'gen.layer_label_minus2',
  [-1]: 'gen.layer_label_minus1', [0]: 'gen.layer_label_0',
  [1]:  'gen.layer_label_1',      [2]:  'gen.layer_label_2',      [3]: 'gen.layer_label_3',
}
function genLabel(gen: number, t: (k: string) => string): string {
  return GEN_KEY[gen] ? t(GEN_KEY[gen]) : (gen < 0 ? `第 ${gen} 代` : `第 +${gen} 代`)
}

/**
 * 4r: id-based pickHouseholds
 * 用 selectedParentId (primary.id) 直接比對 parentHouseholdId，不依賴 index。
 * fallback：selectedParentId 為 null 或找不到對應 group → 回傳 []（空狀態）。
 */
function pickHouseholds(
  groups: { parentHouseholdId: string; households: Household[] }[],
  selectedParentId: string | null,
): Household[] {
  if (!selectedParentId) return []
  return groups.find(g => g.parentHouseholdId === selectedParentId)?.households ?? []
}

export interface FocusTreeProps {
  focusView: FocusView; selectedIdx: number; selfId: string | null
  setFocusId: (id: string) => void; setSelectedIdx: (idx: number) => void
}

export default function FocusTree({ focusView, selectedIdx, selfId, setFocusId, setSelectedIdx }: FocusTreeProps) {
  const { t } = useTranslation()
  const { levels, focusId, selectedIdxHint } = focusView
  const focusHHs = levels.find(l => l.generation === 0)?.groups.flatMap(g => g.households) ?? []
  const safeIdx  = selectedIdx < focusHHs.length ? selectedIdx : 0

  // 4r: 每層記住選中 household 的 primary.id（取代 index-based idxByGen）
  const [idByGen, setIdByGen] = useState<Record<number, string>>({})

  /** 取得指定代的選中 household primary.id；gen=0 直接從 focusHHs + safeIdx 取得 */
  function getSelectedId(g: number): string | null {
    if (g === 0) return focusHHs[safeIdx]?.primary.id ?? null
    return idByGen[g] ?? null
  }

  /** 選中某代某 household（傳 idx 用於 gen=0 升級 setSelectedIdx，傳 primaryId 用於 id 追蹤） */
  function setIdx(g: number, next: number, primaryId: string) {
    if (g === 0) setSelectedIdx(next)
    setIdByGen(prev => {
      const u: Record<number, string> = { ...prev, [g]: primaryId }
      // 清掉所有更子代的選中狀態（子代選取跟著重置）
      for (const k of Object.keys(prev).map(Number)) {
        if (k > g) delete u[k]
      }
      if (g < 0) setSelectedIdx(0)
      return u
    })
  }

  // 切換焦點人 → 重置所有代選中，並套用引擎建議的 selectedIdxHint
  useEffect(() => {
    setIdByGen({})
    if (selectedIdxHint > 0) setSelectedIdx(selectedIdxHint)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, selectedIdxHint])

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
        const gen   = level.generation
        const allHH = level.groups.flatMap(g => g.households)
        if (allHH.length === 0) return null

        // 4r: id-based pickHouseholds — 用父代選中 primary.id 對位
        const groups4child = level.groups.map(g => ({
          parentHouseholdId: g.parentHouseholdId ?? '',
          households: g.households,
        }))
        const displayHHs = gen > 0
          ? pickHouseholds(groups4child, getSelectedId(gen - 1))
          : allHH
        if (displayHHs.length === 0) return null

        // 本代選中 idx：由 idByGen 中的 id 反查；找不到時回 0
        const selectedId   = idByGen[gen] ?? null
        const layerIdx     = selectedId ? (displayHHs.findIndex(h => h.primary.id === selectedId) || 0) : 0
        const safeLayerIdx = layerIdx >= 0 && layerIdx < displayHHs.length ? layerIdx : 0

        return (
          <div key={gen} style={{ width: '100%', display: 'contents' }}>
            {li !== 0 && <VerticalConnector height={24} />}
            <LayerLabel text={genLabel(gen, t)} accent={gen === 0} />
            <VerticalConnector height={8} />
            <LayerCarousel
              households={displayHHs}
              selectedIdx={safeLayerIdx}
              onSelect={(i) => setIdx(gen, i, displayHHs[i]?.primary.id ?? '')}
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
