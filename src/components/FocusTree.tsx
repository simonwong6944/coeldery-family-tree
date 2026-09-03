/**
 * FocusTree — 焦點式家庭樹（4l：一撥跳一張）
 * generation < 0 → ParentRow；= 0 → FocusCarousel（swipe-to-step）；> 0 → FocusChildLayer
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, FocusLevel, Household } from '../../packages/family-tree-engine'
import { HouseholdChip, VerticalConnector, ParentRow } from './FocusTreeParts'
import FocusChildLayer from './FocusChildLayer'

const SWIPE_THRESHOLD = 40   // px：橫向位移超過此值才算有效 swipe

/*
 * FocusCarousel — 4l：一撥跳一張
 *
 * 設計：
 *   - overflowX:hidden → 關閉自由 scroll，避免 CSS scroll 與手勢互搶
 *   - pointer handlers 直接掛在 track div（非外層 wrapper）
 *   - touchAction:'none' → 瀏覽器不接管任何方向，pointer events 完整到 JS
 *   - 縱向判斷在 onPointerUp：|dy|>|dx| 時 return，不攔截縱向 scroll
 *     （touch-action:none 下縱向 scroll 仍可由外層 main overflow:auto 處理，
 *       因為 pointer cancel 後 main 的 touch scroll 會接管）
 *   - 單張 fallback：touchAction:'auto'，無手勢邏輯
 */
function FocusCarousel({ households, selectedIdx, focusedMemberId, onSelect, setFocusId, scrollRef }: {
  households: Household[]
  selectedIdx: number
  focusedMemberId?: string
  onSelect: (idx: number) => void
  setFocusId: (id: string) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const prevIdxRef  = useRef(-1)          // 上次 programmatic scroll target
  const selectedIdxRef = useRef(selectedIdx) // 避免 stale closure
  const pointerRef  = useRef<{ x: number; y: number; id: number } | null>(null)
  const isSingle    = households.length === 1
  const total       = households.length

  // 每次 render 同步最新 selectedIdx 到 ref
  selectedIdxRef.current = selectedIdx

  /* selectedIdx 改變時，smooth scroll 令新卡置中 */
  useEffect(() => {
    if (prevIdxRef.current === selectedIdx) return
    prevIdxRef.current = selectedIdx
    const el = scrollRef.current
    if (!el) return
    /* children: [spacer, card0, card1, …, spacer] → cards = slice(1,-1) */
    const cards = Array.from(el.children).slice(1, -1) as HTMLElement[]
    cards[selectedIdx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedIdx, scrollRef])

  /* ── pointer 手勢攔截：handlers 掛在 track div 本身 ── */
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

    /* 縱向為主 → 不攔截（外層 main overflow:auto 處理縱向 scroll） */
    if (Math.abs(dy) > Math.abs(dx)) return

    /* 未過閾值 → 彈返 */
    if (Math.abs(dx) < SWIPE_THRESHOLD) return

    /* 有效橫向 swipe：跳一張，讀 ref 避免 stale closure */
    const cur = selectedIdxRef.current
    const next = dx < 0
      ? Math.min(cur + 1, total - 1)   // 左撥 → 下一張
      : Math.max(cur - 1, 0)           // 右撥 → 上一張
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
          /* overflowX:hidden 阻止自由 scroll */
          overflowX: 'hidden', overflowY: 'visible',
          width: '100%',
          padding: '4px 0', boxSizing: 'border-box',
          /*
           * touchAction:'none' → 瀏覽器不接管任何 touch 手勢，
           * pointer events 完整送達 JS handler。
           * 縱向 scroll 判斷交由 onPointerUp |dy|>|dx| 邏輯決定是否攔截。
           * 單張時用 'auto' 維持原生行為。
           */
          touchAction: isSingle ? 'auto' : 'none',
          justifyContent: isSingle ? 'center' : 'flex-start',
          userSelect: 'none',
        }}
      >
        {/* 首端 spacer：讓首張卡 scrollIntoView 後置中 */}
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}

        {households.map((hh, i) => (
          <div key={hh.primary.id} style={{
            width: '80vw', flexShrink: 0,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          }}>
            <HouseholdChip
              hh={hh} size={80}
              isFocus={i === selectedIdx}
              focusedMemberId={focusedMemberId}
              onClickPrimary={setFocusId}
              onClickSpouse={setFocusId}
            />
          </div>
        ))}

        {/* 末端 spacer：讓末張卡 scrollIntoView 後置中 */}
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', minWidth: '10vw', flexShrink: 0 }} />}
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

/* ── generation → i18n label ── */
const GEN_KEY: Record<number, string> = {
  [-3]: 'gen.layer_label_minus3', [-2]: 'gen.layer_label_minus2',
  [-1]: 'gen.layer_label_minus1', [0]: 'gen.layer_label_0',
  [1]: 'gen.layer_label_1', [2]: 'gen.layer_label_2', [3]: 'gen.layer_label_3',
}
function genLabel(gen: number, t: (k: string) => string): string {
  return GEN_KEY[gen] ? t(GEN_KEY[gen]) : (gen < 0 ? `第 ${gen} 代` : `第 +${gen} 代`)
}

/* ── FocusTree（主組件）── */
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

  return (
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

      {/* 依 levels 順序 render 所有代 */}
      {levels.map((level: FocusLevel, li: number) => {
        const allHH = level.groups.flatMap(g => g.households)
        if (allHH.length === 0) return null
        return (
          <div key={level.generation} style={{ width: '100%', display: 'contents' }}>
            {li !== 0 && <VerticalConnector height={24} />}
            <LayerLabel text={genLabel(level.generation, t)} accent={level.generation === 0} />

            {level.generation < 0 && (
              <>
                <VerticalConnector height={20} />
                <ParentRow households={allHH} focusedMemberId={focusId} setFocusId={setFocusId} />
              </>
            )}

            {level.generation === 0 && (
              <div style={{ width: '100%' }}>
                <FocusCarousel
                  households={focusHHs} selectedIdx={safeIdx}
                  focusedMemberId={focusId} onSelect={setSelectedIdx}
                  setFocusId={setFocusId} scrollRef={carouselRef}
                />
              </div>
            )}

            {level.generation > 0 && (
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
