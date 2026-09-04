/**
 * FocusTree — 焦點式家庭樹（4p：修撥唔郁 + 父母代啟用連動）
 *
 * 4p 修正：
 *   (1) overflowX:'hidden' → 'scroll'，令 scrollIntoView 有 scroll 空間
 *       scrollbar 靠 CSS (.focus-carousel-track) 隱藏，視覺上無橫條
 *   (2) gen<0 onSelect 不再是 undefined；所有代一律用 setIdx(gen, i)
 *       撥父母代 → reset gen≥0 所有更深代 idx → 下層跟住換
 *   (3) setIdx 支援 gen<0（不再限 gen=1 才 sync setSelectedIdx，
 *       改成 gen=0 才 sync，gen>0 or gen<0 只更新 idxByGen + reset 更深代）
 *
 * 4o 教訓：用單房假資料時 isSingle=true，carousel 永遠不撥，overflow bug
 *          無法被測試發現。4p 起強制 seed 每代 ≥2 房。
 *
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
  const prevIdxRef     = useRef<number>(-1)       // -1 強制 mount 時執行一次 snap
  const selectedIdxRef = useRef(selectedIdx)
  const pointerRef     = useRef<{ x: number; y: number; id: number } | null>(null)
  selectedIdxRef.current = selectedIdx

  const isSingle = households.length <= 1
  const canSwipe = !!onSelect && !isSingle

  /**
   * snap：selectedIdx 變化（含首次 mount prevIdx=-1）→ scrollIntoView
   * 4p 修正：overflowX:'scroll' 令 scrollIntoView 真正可用
   */
  useEffect(() => {
    if (prevIdxRef.current === selectedIdx) return
    prevIdxRef.current = selectedIdx
    const cards = Array.from(scrollRef.current?.children ?? []).slice(1, -1) as HTMLElement[]
    cards[selectedIdx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedIdx])

  /* mount 後雙幀強制 auto 置中（修偏位 / 切邊）*/
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
    const cur  = selectedIdxRef.current
    const next = dx < 0 ? Math.min(cur + 1, households.length - 1) : Math.max(cur - 1, 0)
    if (next !== cur) onSelect!(next)
  }, [canSwipe, households.length, onSelect])

  const onPointerCancel = useCallback(() => { pointerRef.current = null }, [])

  if (!households.length) return null
  return (
    <div style={{ width: '100%' }}>
      <div
        ref={scrollRef}
        className="focus-carousel-track"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: 'flex', flexDirection: 'row',
          /* 4p 修正：改 'scroll' 令 scrollIntoView 有作用；scrollbar 靠 CSS 隱藏 */
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

/* 從 gen>0 groups 按上代選中 household 選出本代 households */
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

  /**
   * 4n/4p：每代（含 gen<0）獨立 selectedIdx，向下連動
   * idxByGen key: generation number（可為負數）
   */
  const [idxByGen, setIdxByGen] = useState<Record<number, number>>({})

  /* getIdx：gen=0 用 safeIdx（保持與外部 selectedIdx 同步）；其他代用 idxByGen */
  function getIdx(g: number): number {
    return g === 0 ? safeIdx : (idxByGen[g] ?? 0)
  }

  /**
   * setIdx（4p 擴展）：
   *   - gen=0 時 sync setSelectedIdx（保持 4n 向後兼容）
   *   - 所有 gen：更新 idxByGen[gen]，並 reset 所有「gen 更深（數值更大）」的代
   *   - gen<0 也適用：撥父母代 → reset gen≥-1+1=gen+1 及更深代
   */
  function setIdx(g: number, next: number) {
    if (g === 0) setSelectedIdx(next)
    setIdxByGen(prev => {
      const u: Record<number, number> = { ...prev, [g]: next }
      /* reset 所有 generation > g 的代（更下層/更晚生一代）*/
      for (const k of Object.keys(prev).map(Number)) {
        if (k > g) u[k] = 0
      }
      /* 同時也要 reset gen=0 及以下，若撥的是 gen<0 */
      if (g < 0) {
        /* gen=0 用外部 selectedIdx 控制，直接 reset 到 0 */
        setSelectedIdx(0)
      }
      return u
    })
  }

  /* 切換焦點人 → 重置所有代 idx */
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
        const gen   = level.generation
        const allHH = level.groups.flatMap(g => g.households)
        if (allHH.length === 0) return null

        /* gen>0：按上代選中 household 選出本代要顯示的 households */
        const parentHHs = gen > 1
          ? (levels.find(l => l.generation === gen - 1)?.groups.flatMap(g => g.households) ?? [])
          : focusHHs
        const groups4child = level.groups.map(g => ({
          parentHouseholdId: g.parentHouseholdId ?? '',
          households: g.households,
        }))
        const displayHHs = gen > 0 ? pickHouseholds(groups4child, parentHHs, getIdx(gen - 1)) : allHH
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
              /* 4p：gen<0 也給 onSelect，父母代可撥且連動下層 */
              onSelect={(i) => setIdx(gen, i)}
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
