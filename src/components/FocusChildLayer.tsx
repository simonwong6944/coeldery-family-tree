/**
 * FocusChildLayer — 下層子女區（4m）
 *
 * 4m 改動：
 *   1. 全層橫線：每一 group（不論單/多 household）都畫橫線，對齊卡頂高度。
 *   2. 雙向 swipe 連動：下層接收 onSelect，撥下層 → 更新 selectedIdx → 中層跟進。
 *      - pointer handlers 直接掛在 wrapRef（overflowX:hidden 容器）
 *      - touchAction:'none'（同中層），|dy|>|dx| 放行縱向
 *      - prevScrollIdxRef 守衛：programmatic align 不反向觸發 onSelect
 *      - onSelect 為 undefined 時（更深代）降級為只讀，不掛手勢
 *
 * 保留自 4k：
 *   - double RAF align（避免量到中間值）
 *   - 只在 selectedIdx / groups 改變後 align
 *   - ResizeObserver 重新對位
 *
 * module ≤ 250 行。
 */

import { useRef, useEffect, useCallback } from 'react'
import type { ChildGroup } from '../../packages/family-tree-engine'
import { HouseholdChip } from './FocusTreeParts'

const SWIPE_THRESHOLD = 40  // px，與中層一致

/* ── 子女 group 渲染（4m：單/多 household 均畫橫線）── */
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
      {/* 4m：單/多 household 均畫橫線，令同代卡頂對齊 */}
      <div aria-hidden="true" style={{
        height: '2px', backgroundColor: 'var(--color-primary)',
        opacity: 0.45, alignSelf: 'stretch', margin: '0 8px', flexShrink: 0,
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
  /** 4m：下層 swipe 時回調，更新共用 selectedIdx；undefined = 更深代（唯讀）*/
  onSelect?: (idx: number) => void
}

export default function FocusChildLayer({
  groups, selectedIdx, carouselRef: _carouselRef,
  focusedMemberId, setFocusId, onSelect,
}: FocusChildLayerProps) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const raf1Ref  = useRef<number | null>(null)
  const raf2Ref  = useRef<number | null>(null)

  /* 4m：swipe 手勢狀態 */
  const pointerRef     = useRef<{ x: number; y: number; id: number } | null>(null)
  const selectedIdxRef = useRef(selectedIdx)  // 避免 stale closure
  selectedIdxRef.current = selectedIdx

  /* 有效 group 數（跳過空 group）*/
  const validGroups  = groups.filter(g => g.households.length > 0)
  const total        = validGroups.length
  const hasChildren  = total > 0
  const isSingle     = total <= 1
  const canSwipe     = !!onSelect && !isSingle

  /**
   * 4k align 策略（保留）：
   *   snap 完成後（selectedIdx 已更新），把 groups[selectedIdx] 對應的 DOM group
   *   移到 wrap 容器水平正中心。
   */
  const align = useCallback(() => {
    const track = trackRef.current
    const wrap  = wrapRef.current
    if (!track || !wrap) return

    track.style.transition = 'none'
    track.style.transform  = ''

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
    const wrapRect    = wrap.getBoundingClientRect()
    const wrapCenterX = wrapRect.left + wrapRect.width / 2

    /* 找 groups[selectedIdx] 在 track DOM 的真實下標（跳過空 group） */
    const trackChildren = Array.from(track.children) as HTMLElement[]
    let trackIdx = 0
    for (let i = 0; i < selectedIdx && i < groups.length; i++) {
      if (groups[i].households.length > 0) trackIdx++
    }

    const groupEl = trackChildren[trackIdx]
    if (!groupEl) {
      const trackRect = track.getBoundingClientRect()
      const trackCx   = trackRect.left + trackRect.width / 2
      const delta     = wrapCenterX - trackCx
      requestAnimationFrame(() => {
        track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
        track.style.transform  = `translateX(${delta}px)`
      })
      return
    }

    const groupRect = groupEl.getBoundingClientRect()
    const groupCx   = groupRect.left + groupRect.width / 2
    const delta     = wrapCenterX - groupCx
    requestAnimationFrame(() => {
      track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
      track.style.transform  = `translateX(${delta}px)`
    })
  }

  useEffect(() => { align() }, [selectedIdx, groups, align])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(align)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [align])

  /* ── 4m：下層 swipe 手勢（canSwipe 才掛）── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!canSwipe) return
    pointerRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }, [canSwipe])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!canSwipe) return
    const start = pointerRef.current
    if (!start || start.id !== e.pointerId) return
    pointerRef.current = null

    const dx = e.clientX - start.x
    const dy = e.clientY - start.y

    /* 縱向為主 → 不攔截 */
    if (Math.abs(dy) > Math.abs(dx)) return
    /* 未過閾值 → 彈返 */
    if (Math.abs(dx) < SWIPE_THRESHOLD) return

    /* 有效橫向 swipe：跳一張（讀 ref 避免 stale） */
    const cur  = selectedIdxRef.current
    const next = dx < 0
      ? Math.min(cur + 1, total - 1)
      : Math.max(cur - 1, 0)
    if (next !== cur) onSelect!(next)
  }, [canSwipe, total, onSelect])

  const onPointerCancel = useCallback(() => { pointerRef.current = null }, [])

  if (!hasChildren) return null

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        width: '100%',
        overflowX: 'hidden',
        overflowY: 'visible',
        display: 'flex',
        justifyContent: 'center',
        /* 4m：canSwipe 時用 touchAction:none，讓 pointer events 完整到 JS */
        touchAction: canSwipe ? 'none' : 'auto',
        userSelect: 'none',
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
