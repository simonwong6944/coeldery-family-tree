/**
 * FocusTree — 焦點式家庭樹（4j：一次一張 carousel）
 * generation < 0 → ParentRow；= 0 → FocusCarousel（snap）；> 0 → FocusChildLayer
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { FocusView, FocusLevel, Household } from '../../packages/family-tree-engine'
import { HouseholdChip, VerticalConnector, ParentRow } from './FocusTreeParts'
import FocusChildLayer from './FocusChildLayer'

/* 跨瀏覽器隱藏 scrollbar（偽元素須用 <style> 注入） */
const HIDE_CSS = `.focus-carousel-track::-webkit-scrollbar{display:none}`

/* ── FocusCarousel：一次一張、兩邊露邊 ── */
function FocusCarousel({ households, selectedIdx, focusedMemberId, onSelect, setFocusId, scrollRef }: {
  households: Household[]
  selectedIdx: number
  focusedMemberId?: string
  onSelect: (idx: number) => void
  setFocusId: (id: string) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* programmatic scroll：selectedIdx 改變時 smooth scroll 到對應卡 */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const target = (Array.from(el.children) as HTMLElement[])[selectedIdx]
    target?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedIdx, scrollRef])

  /* scroll 停定後（120ms）找最近中心的卡，更新 selectedIdx */
  const onScroll = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const el = scrollRef.current
      if (!el) return
      const cx = el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2
      let best = 0, bestD = Infinity
      ;(Array.from(el.children) as HTMLElement[]).forEach((c, i) => {
        const d = Math.abs(c.getBoundingClientRect().left + c.getBoundingClientRect().width / 2 - cx)
        if (d < bestD) { bestD = d; best = i }
      })
      if (best !== selectedIdx) onSelect(best)
    }, 120)
  }, [selectedIdx, onSelect, scrollRef])

  const isSingle = households.length === 1

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
      <style>{HIDE_CSS}</style>
      <div
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        className="focus-carousel-track"
        onScroll={isSingle ? undefined : onScroll}
        style={{
          display: 'flex', flexDirection: 'row',
          overflowX: isSingle ? 'hidden' : 'auto', overflowY: 'visible',
          width: '100%',
          scrollSnapType: isSingle ? 'none' : 'x mandatory',
          scrollPaddingInline: '10vw',
          padding: '4px 0', boxSizing: 'border-box',
          msOverflowStyle: 'none', touchAction: 'pan-x',
          justifyContent: isSingle ? 'center' : 'flex-start',
        }}
      >
        {/* 首端 spacer：讓第一張卡能 snap 到正中 */}
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', flexShrink: 0 }} />}

        {households.map((hh, i) => (
          <div key={hh.primary.id} style={{
            width: '80vw', flexShrink: 0, scrollSnapAlign: 'center',
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

        {/* 末端 spacer：讓最後一張卡能 snap 到正中 */}
        {!isSingle && <div aria-hidden="true" style={{ width: '10vw', flexShrink: 0 }} />}
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
