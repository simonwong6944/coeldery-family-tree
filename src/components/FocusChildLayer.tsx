/**
 * FocusChildLayer — 下層子女區（4k）
 *
 * 4k 對正修正：
 *   - 移除 carousel scroll 事件觸發 scheduleAlign：
 *     scroll 途中量度座標不準（snap 尚未完成），只在 selectedIdx 更新後才 align。
 *   - align() 時機：selectedIdx / groups 變化後 → double RAF 確保 DOM 穩定。
 *   - group index 對應：跳過空 group（groups[i].households.length===0）的邏輯保持正確。
 *   - ResizeObserver 保留：應對視窗大小改變。
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import type { ChildGroup } from '../../packages/family-tree-engine'
import { HouseholdChip } from './FocusTreeParts'

/* ── 子女 group 渲染 ── */
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
  groups, selectedIdx, carouselRef: _carouselRef, focusedMemberId, setFocusId,
}: FocusChildLayerProps) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const raf1Ref  = useRef<number | null>(null)
  const raf2Ref  = useRef<number | null>(null)

  const hasAnyChildren = groups.some(g => g.households.length > 0)

  /**
   * 4k align 策略：
   *   snap 完成後（selectedIdx 已更新），把 groups[selectedIdx] 對應的 DOM group
   *   移到 wrap 容器水平正中心。
   *
   *   步驟：
   *   1. 歸零 transform（無 transition），讓 browser 重算 layout
   *   2. double RAF：確保 layout 穩定後再量度（避免量到中間值）
   *   3. wrap 容器水平中心 x（viewport 座標）
   *   4. 找 groups[selectedIdx] 在 track DOM 中的真實下標（跳過空 group）
   *   5. delta = wrapCenterX - groupCx（一次性絕對值，不累加）
   *   6. 加 transition + apply translateX(delta)
   */
  const align = useCallback(() => {
    const track = trackRef.current
    const wrap  = wrapRef.current
    if (!track || !wrap) return

    /* Step 1: 歸零 transform，不加 transition */
    track.style.transition = 'none'
    track.style.transform  = ''

    /* Step 2: double RAF — 等 browser 完成 paint，layout 穩定後量度 */
    if (raf1Ref.current !== null) cancelAnimationFrame(raf1Ref.current)
    raf1Ref.current = requestAnimationFrame(() => {
      raf1Ref.current = null
      if (raf2Ref.current !== null) cancelAnimationFrame(raf2Ref.current)
      raf2Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = null
        doAlign(track, wrap)
      })
    })
  }, [selectedIdx, groups])  // eslint-disable-line react-hooks/exhaustive-deps

  function doAlign(track: HTMLDivElement, wrap: HTMLDivElement) {
    /* Step 3: wrap 容器水平中心 */
    const wrapRect   = wrap.getBoundingClientRect()
    const wrapCenterX = wrapRect.left + wrapRect.width / 2

    /* Step 4: 找 groups[selectedIdx] 在 track DOM 的真實下標
     * track 只 render 非空 group，空 group 跳過
     */
    const trackChildren = Array.from(track.children) as HTMLElement[]
    let trackIdx = 0
    for (let i = 0; i < selectedIdx && i < groups.length; i++) {
      if (groups[i].households.length > 0) trackIdx++
    }

    const groupEl = trackChildren[trackIdx]
    if (!groupEl) {
      /* selectedIdx group 無子女 → track 整體相對 wrap 置中 */
      const trackRect = track.getBoundingClientRect()
      const trackCx   = trackRect.left + trackRect.width / 2
      const delta     = wrapCenterX - trackCx
      requestAnimationFrame(() => {
        track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
        track.style.transform  = `translateX(${delta}px)`
      })
      return
    }

    /* Step 5: groupEl 中心 x（transform=0，座標可靠） */
    const groupRect = groupEl.getBoundingClientRect()
    const groupCx   = groupRect.left + groupRect.width / 2

    /* Step 6: 一次性絕對 delta，不累加 */
    const delta = wrapCenterX - groupCx
    requestAnimationFrame(() => {
      track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
      track.style.transform  = `translateX(${delta}px)`
    })
  }

  /* selectedIdx 或 groups 改變後觸發 align（snap 完成後才更新 selectedIdx，時機正確）*/
  useEffect(() => { align() }, [selectedIdx, groups, align])

  /* 視窗大小改變時重新對位 */
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(align)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [align])

  /* 注意：4k 移除了 carousel scroll 事件監聽。
   * 理由：scroll 途中 selectedIdx 尚未更新，此時 align() 會量到中間值，造成偏差。
   * 正確時機是 snap 完成 → onScroll timer 觸發 onSelect → React re-render → selectedIdx 更新 → align()。
   * carouselRef 仍保留 prop（向下相容），但不再加 scroll listener。
   */

  if (!hasAnyChildren) return null

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
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
