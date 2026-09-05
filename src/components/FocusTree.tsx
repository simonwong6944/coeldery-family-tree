/**
 * FocusTree — 焦點式家庭樹
 * 4q: selectedIdxHint / householdsKey / setPointerCapture
 * 4r: idByGen(id-based) + pickHouseholds by primaryId
 * 4s: seedChain — 焦點切換時沿直系初始化整條鏈 idByGen
 *     解決：(1) gen≥2 初始孤立（David 消失）
 *           (2) gen 0 hint vs safeIdx 錯位（Suzanne 下錯顯 Simon 仔女）
 * 4t: 修連動後深層 snap 漏觸發
 *     解決：(1) setIdx 清除下層後沿 parentHouseholdId 鏈重新 seed 所有下層
 *           (2) double-RAF 依賴 householdsKey，內容改變也強制 snap
 * 4u: 修 iOS Safari 手勢（touch-action: none 殺死所有原生手勢）
 *     解決：(1) touchAction 改 pan-y，恢復 track 內垂直 scroll
 *           (2) 新增 touch events（touchstart/touchend）處理橫向 swipe dx
 *           (3) 移除 setPointerCapture，避免阻礙 iOS pan-y 手勢識別
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
  const touchRef       = useRef<{ x: number; y: number } | null>(null)
  selectedIdxRef.current = selectedIdx

  const isSingle = households.length <= 1
  const canSwipe = !!onSelect && !isSingle

  const householdsKey = useMemo(
    () => households.map(h => h.primary.id).join(','),
    [households]
  )

  /* snap：selectedIdx 或 householdsKey 變化都重新置中 */
  useEffect(() => {
    const cards = Array.from(scrollRef.current?.children ?? []).slice(1, -1) as HTMLElement[]
    cards[selectedIdx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx, householdsKey])

  /* 4t: householdsKey 改變（含 mount）→ 雙幀強制 auto 置中，覆蓋「內容換但 selectedIdx 數值未變」情況 */
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => {
      const cards = Array.from(scrollRef.current?.children ?? []).slice(1, -1) as HTMLElement[]
      cards[selectedIdxRef.current]?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
    }))
    return () => cancelAnimationFrame(r)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdsKey])

  /* Pointer events：桌面 / 觸控螢幕（不含 iOS Safari）
   * 移除 setPointerCapture — 配合 pan-y 不阻礙 iOS 原生手勢 */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) return
    pointerRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    // ⚠️ 4u: 移除 setPointerCapture，iOS pan-y 下 capture 阻礙手勢識別
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

  const clearPointer = useCallback(() => { pointerRef.current = null }, [])

  /* Touch events：iOS Safari 原生 — pan-y 下 pointer events 收不到正確 dx
   * touchstart 記錄起點；touchend 計算 dx/dy，維持 SWIPE_THRESHOLD 邏輯 */
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!canSwipe) return
    const t = e.touches[0]
    if (t) touchRef.current = { x: t.clientX, y: t.clientY }
  }, [canSwipe])

  const onTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!canSwipe) return
    const s = touchRef.current
    touchRef.current = null
    if (!s) return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - s.x, dy = t.clientY - s.y
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < SWIPE_THRESHOLD) return
    const cur  = selectedIdxRef.current
    const next = dx < 0 ? Math.min(cur + 1, households.length - 1) : Math.max(cur - 1, 0)
    if (next !== cur) onSelect!(next)
  }, [canSwipe, households.length, onSelect])

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
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'flex', flexDirection: 'row',
          overflowX: 'scroll', overflowY: 'visible',
          width: '100%', padding: '4px 0', boxSizing: 'border-box',
          touchAction: canSwipe ? 'pan-y' : 'auto',  // 4u: pan-y 恢復垂直 scroll，iOS Safari 用 touch events 處理橫向
          justifyContent: isSingle ? 'center' : 'flex-start',
          userSelect: 'none',
        }}
      >
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}
        {households.map((hh, i) => (
          <div key={hh.primary.id}
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
 * Phase 4: sortSpouses — 同一 household 內夫左妻右排序。
 * male → primary 在左（保持原有 primary/spouse 結構），
 * female → spouse 在左（交換 primary / spouse）。
 * 任何一方 gender 為 null / undefined → 維持原有次序，不報錯、不隱藏。
 * 此函數純計算，不改動 id、不影響 snap / seed / swipe 邏輯。
 */
function sortSpouses(hh: Household): Household {
  const { primary, spouse } = hh
  if (!spouse) return hh                          // 單身戶，無需排序
  const pg = primary.gender ?? null
  const sg = spouse.gender  ?? null
  if (pg === null || sg === null) return hh       // 任一方未設定 → 維持原有次序
  if (pg === 'male' && sg === 'female') return hh // 已正確：male 左、female 右
  if (pg === 'female' && sg === 'male')           // 需交換：female 在 primary 位 → 搬去右邊
    return { ...hh, primary: spouse, spouse: primary }
  return hh                                       // 同性或其他組合 → 維持原有次序
}

/** 4r: id-based pickHouseholds — 用 selectedParentId 直接對位，棄 index */
function pickHouseholds(
  groups: { parentHouseholdId: string; households: Household[] }[],
  selectedParentId: string | null,
): Household[] {
  if (!selectedParentId) return []
  return groups.find(g => g.parentHouseholdId === selectedParentId)?.households ?? []
}

/**
 * 4s: seedChain — 沿焦點直系初始化整條鏈的 idByGen
 *
 * 輸入：
 *   levels      — FocusView.levels（引擎輸出，generation 已排序）
 *   focusHHs    — gen=0 已排序的 households
 *   hintIdx     — selectedIdxHint（焦點本人在 gen=0 的排序後位置）
 *
 * 輸出：Record<number, string>
 *   每個有 household 的 generation → 選中 household primary.id
 *   gen=0  → focusHHs[hintIdx].primary.id（焦點本人）
 *   gen>0  → 上一層已選 household 的子女 group 第一個（birth_date 排序後最早）
 *   gen<0  → 各層 allHH[0].primary.id（第一個祖先；通常一房）
 *
 * 此函數純計算，不 setState，供 useEffect 呼叫。
 */
function seedChain(
  levels: FocusLevel[],
  focusHHs: Household[],
  hintIdx: number,
): Record<number, string> {
  const seed: Record<number, string> = {}

  // gen=0：焦點本人（hintIdx 指向的房）
  const focusHH = focusHHs[hintIdx] ?? focusHHs[0]
  if (!focusHH) return seed
  seed[0] = focusHH.primary.id

  // gen>0：逐層向下，順著已選 primary.id 找子女 group 第一房
  let prevSelectedId: string = focusHH.primary.id
  for (const level of levels.filter(l => l.generation > 0).sort((a, b) => a.generation - b.generation)) {
    const group = level.groups.find(g => g.parentHouseholdId === prevSelectedId)
    const firstHH = group?.households[0]
    if (!firstHH) break  // 直系鏈斷開，停止
    seed[level.generation] = firstHH.primary.id
    prevSelectedId = firstHH.primary.id
  }

  // gen<0：逐層向上，各層第一個 household
  for (const level of levels.filter(l => l.generation < 0)) {
    const allHH = level.groups.flatMap(g => g.households)
    if (allHH.length > 0) seed[level.generation] = allHH[0].primary.id
  }

  return seed
}

export interface FocusTreeProps {
  focusView: FocusView; selectedIdx: number; selfId: string | null
  setFocusId: (id: string) => void; setSelectedIdx: (idx: number) => void
}

export default function FocusTree({ focusView, selectedIdx: _selectedIdx, selfId, setFocusId, setSelectedIdx }: FocusTreeProps) {
  const { t } = useTranslation()
  const { levels, focusId, selectedIdxHint } = focusView
  const focusHHs = levels.find(l => l.generation === 0)?.groups.flatMap(g => g.households) ?? []

  // 4s: idByGen 現包含 gen=0 的 id（seedChain 會填入），不再靠 safeIdx 兜底
  const [idByGen, setIdByGen] = useState<Record<number, string>>(() =>
    seedChain(levels, focusHHs, selectedIdxHint)
  )

  /**
   * 取得指定代選中 household 的 primary.id
   * 4s: gen=0 也從 idByGen 讀（由 seedChain 初始化，由 setIdx 更新）
   *     fallback → focusHHs[0]（防止 race condition）
   */
  function getSelectedId(g: number): string | null {
    return idByGen[g] ?? (g === 0 ? (focusHHs[0]?.primary.id ?? null) : null)
  }

  /**
   * 選中某代某 household
   * 4t: 清除 g 以下所有代後，沿 parentHouseholdId 鏈重新 seed 所有下層，
   *     確保 gen+2 等深層 householdsKey 立即改變，觸發各層 double-RAF snap。
   */
  function setIdx(g: number, next: number, primaryId: string) {
    if (g === 0) setSelectedIdx(next)
    setIdByGen(prev => {
      // 更新本代，清除所有更深代
      const u: Record<number, string> = { ...prev, [g]: primaryId }
      for (const k of Object.keys(u).map(Number)) {
        if (k > g) delete u[k]
      }
      // 4t: 沿 parentHouseholdId 鏈重新 seed 所有下層（gen > g）
      let parentId = primaryId
      for (const level of levels.filter(l => l.generation > g).sort((a, b) => a.generation - b.generation)) {
        const group = level.groups.find(gr => gr.parentHouseholdId === parentId)
        const firstHH = group?.households[0]
        if (!firstHH) break  // 直系鏈斷開，停止
        u[level.generation] = firstHH.primary.id
        parentId = firstHH.primary.id
      }
      if (g < 0) setSelectedIdx(0)
      return u
    })
  }

  /**
   * 4s: 焦點切換 → seedChain 重新計算整條直系鏈
   * 同步 setSelectedIdx(hintIdx) 確保 gen=0 index 與 seed 一致
   */
  useEffect(() => {
    const chain = seedChain(levels, focusHHs, selectedIdxHint)
    setIdByGen(chain)
    setSelectedIdx(selectedIdxHint)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, selectedIdxHint])

  // gen=0 的 safeIdx：從 idByGen[0] 反查，確保與 seed/hint 一致
  const gen0Id   = idByGen[0] ?? focusHHs[0]?.primary.id ?? null
  const safeIdx  = gen0Id ? Math.max(0, focusHHs.findIndex(h => h.primary.id === gen0Id)) : 0

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

        const groups4child = level.groups.map(g => ({
          parentHouseholdId: g.parentHouseholdId ?? '',
          households: g.households,
        }))
        // logicalHHs：引擎原始次序，用於 snap/seed id 查找（primary.id = parentHouseholdId）
        const logicalHHs = gen > 0
          ? pickHouseholds(groups4child, getSelectedId(gen - 1))
          : allHH
        if (logicalHHs.length === 0) return null
        // displayHHs：純顯示層，Phase 4 夫左妻右排序（不影響 id 查找邏輯）
        const displayHHs = logicalHHs.map(sortSpouses)

        // 本代選中 idx：由 idByGen 中 id 反查 logicalHHs；gen=0 用 safeIdx
        const layerIdx = gen === 0
          ? safeIdx
          : (() => {
              const sid = idByGen[gen] ?? null
              if (!sid) return 0
              const idx = logicalHHs.findIndex(h => h.primary.id === sid)
              return idx >= 0 ? idx : 0
            })()

        return (
          <div key={gen} style={{ width: '100%', display: 'contents' }}>
            {li !== 0 && <VerticalConnector height={24} />}
            <LayerLabel text={genLabel(gen, t)} accent={gen === 0} />
            <VerticalConnector height={8} />
            <LayerCarousel
              households={displayHHs}
              selectedIdx={layerIdx}
              onSelect={(i) => setIdx(gen, i, logicalHHs[i]?.primary.id ?? '')}
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
