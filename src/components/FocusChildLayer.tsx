/**
 * FocusChildLayer — 下層子女區（4h-fix-2）
 *
 * 問題二修正（最重要）：
 *   align() 改用絕對定位，消除累積漂移：
 *   1. 先將 track.style.transform = '' 歸零（不帶 transition）
 *   2. 讀 track/groupEl.getBoundingClientRect()（此時 transform=0，座標可靠）
 *   3. 計算 highlight 父母卡中心 x → child group 中心 x 的差
 *   4. 一次性 set translateX(delta)（絕對值，不累加）
 *
 * 問題五修正：
 *   - track 移除寫死 paddingLeft: calc(50% - 90px)
 *   - 初始對齊由 align() 在 mount 時計算，用 flex justifyContent:center 作 fallback
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import type { ChildGroup } from '../../packages/family-tree-engine'
import { HouseholdChip } from './FocusTreeParts'

/* ── 子女 group 渲染（線簡化版）── */
function ChildGroup_({
  group, focusedMemberId, setFocusId,
}: {
  group: ChildGroup
  focusedMemberId?: string
  setFocusId: (id: string) => void
}) {
  const { households } = group
  if (households.length === 0) return null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flexShrink: 0, minWidth: 0,
    }}>
      {households.length > 1 ? (
        /* 多子女：純橫線（純範圍指示，不駁父母、不駁子女），下方橫排子女卡 */
        <>
          <div aria-hidden="true" style={{
            height: '2px', backgroundColor: 'var(--color-primary)',
            opacity: 0.45, alignSelf: 'stretch', margin: '0 8px',
          }} />
          <div style={{
            display: 'flex', flexDirection: 'row', gap: '12px',
            alignItems: 'flex-start', paddingTop: '8px',
          }}>
            {households.map(hh => (
              <HouseholdChip
                key={hh.primary.id}
                hh={hh} size={64}
                isFocus={focusedMemberId === hh.primary.id || focusedMemberId === hh.spouse?.id}
                focusedMemberId={focusedMemberId}
                onClickPrimary={setFocusId}
                onClickSpouse={setFocusId}
              />
            ))}
          </div>
        </>
      ) : (
        /* 單子女：直接放卡，無線 */
        <HouseholdChip
          hh={households[0]} size={64}
          isFocus={focusedMemberId === households[0].primary.id || focusedMemberId === households[0].spouse?.id}
          focusedMemberId={focusedMemberId}
          onClickPrimary={setFocusId}
          onClickSpouse={setFocusId}
        />
      )}
    </div>
  )
}

/* ── FocusChildLayer 主體 ── */
export interface FocusChildLayerProps {
  groups: ChildGroup[]
  selectedIdx: number
  carouselRef: React.RefObject<HTMLDivElement | null>
  focusedMemberId?: string
  setFocusId: (id: string) => void
}

export default function FocusChildLayer({
  groups, selectedIdx, carouselRef, focusedMemberId, setFocusId,
}: FocusChildLayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const rafId = useRef<number | null>(null)

  const hasAnyChildren = groups.some(g => g.households.length > 0)

  /**
   * 絕對定位 align（問題二修正）：
   * 每次都從 transform=0 的原始 layout 出發，計算一次性絕對 translateX。
   * 不累加，不漂移。
   */
  const align = useCallback(() => {
    const carousel = carouselRef.current
    const track = trackRef.current
    const wrap = wrapRef.current
    if (!carousel || !track || !wrap) return

    /* Step 1: 歸零 transform（不加 transition，避免閃爍），讓 layout 穩定 */
    track.style.transition = 'none'
    track.style.transform = ''

    /* Step 2: 找 carousel 中 selectedIdx 對應的 snap 項 */
    const snapItems = Array.from(carousel.children) as HTMLElement[]
    const targetEl = snapItems[selectedIdx] ?? snapItems[0]
    if (!targetEl) return

    /* Step 3: highlight 父母卡中心 x（viewport 座標，transform=0 時可靠） */
    const targetRect = targetEl.getBoundingClientRect()
    const parentCx = targetRect.left + targetRect.width / 2

    /* Step 4: 找 groups[selectedIdx] 對應的 trackChildren 元素 */
    const trackChildren = Array.from(track.children) as HTMLElement[]
    // track 的直接子元素 = 非空 group，但保留原始 groups 順序中的空 group null slot
    // groups[i].households.length===0 → track 中沒有此 group 的 DOM
    // 需要計算 selectedIdx 在 trackChildren 中的真實下標
    let trackIdx = 0
    for (let i = 0; i < selectedIdx && i < groups.length; i++) {
      if (groups[i].households.length > 0) trackIdx++
    }

    const groupEl = trackChildren[trackIdx]
    if (!groupEl) {
      /* 選中的 group 無子女 → 整個 track 相對 wrap 置中 */
      const wrapRect = wrap.getBoundingClientRect()
      const trackRect = track.getBoundingClientRect()
      const delta = (wrapRect.left + wrapRect.width / 2) - (trackRect.left + trackRect.width / 2)
      requestAnimationFrame(() => {
        track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
        track.style.transform = `translateX(${delta}px)`
      })
      return
    }

    /* Step 5: transform=0 時 groupEl 的中心 x */
    const groupRect = groupEl.getBoundingClientRect()
    const groupCx = groupRect.left + groupRect.width / 2

    /* Step 6: 一次性絕對 delta（不累加） */
    const delta = parentCx - groupCx

    /* Step 7: 加回 transition，apply 絕對 translateX */
    requestAnimationFrame(() => {
      track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
      track.style.transform = `translateX(${delta}px)`
    })
  }, [selectedIdx, groups, carouselRef])

  const scheduleAlign = useCallback(() => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => { rafId.current = null; align() })
  }, [align])

  useEffect(() => { scheduleAlign() }, [selectedIdx, groups, scheduleAlign])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(scheduleAlign)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [scheduleAlign])

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return
    carousel.addEventListener('scroll', scheduleAlign, { passive: true })
    return () => carousel.removeEventListener('scroll', scheduleAlign)
  }, [carouselRef, scheduleAlign])

  if (!hasAnyChildren) return null

  return (
    /* 外層：全寬，overflow:hidden 防止下層卡片溢出影響外層縱向 scroll */
    <div ref={wrapRef} style={{
      width: '100%',
      overflow: 'hidden',
      display: 'flex',
      justifyContent: 'center',   /* 問題五：flex 置中作 fallback */
    }}>
      {/* track：align() 計算後加 translateX，初始無 padding（由 flex 置中） */}
      <div ref={trackRef} style={{
        display: 'flex', flexDirection: 'row', gap: '24px',
        flexShrink: 0,
        willChange: 'transform',
      }}>
        {groups.map((group) =>
          group.households.length === 0 ? null : (
            <ChildGroup_
              key={group.parentHouseholdId}
              group={group}
              focusedMemberId={focusedMemberId}
              setFocusId={setFocusId}
            />
          )
        )}
      </div>
    </div>
  )
}
