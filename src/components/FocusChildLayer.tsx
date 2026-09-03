/**
 * FocusChildLayer — 下層子女區（4h-fix）
 *
 * 功能：
 *   - 全部 ChildGroup 同時 render（全房齊出，不消失）
 *   - 監聽 selectedIdx 及 carousel DOM 位置，
 *     用 getBoundingClientRect + translateX 將整個下層
 *     平移使 highlight 房的子女 group 對正畫面正中
 *   - ResizeObserver + scroll 事件 throttle（requestAnimationFrame）重算
 *   - 每組子女：
 *     - 0 子女 → 不顯示（無佔位）
 *     - 1 子女 → 垂直基準線 + 子女卡（無橫線）
 *     - 2+ 子女 → 純範圍橫線（無垂直）+ 子女卡橫排
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
  /** carousel 容器 ref，用於量度 highlight 父母卡位置 */
  carouselRef: React.RefObject<HTMLDivElement | null>
  focusedMemberId?: string
  setFocusId: (id: string) => void
}

export default function FocusChildLayer({
  groups, selectedIdx, carouselRef, focusedMemberId, setFocusId,
}: FocusChildLayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null)       // 外層 overflow: hidden
  const trackRef = useRef<HTMLDivElement>(null)       // 實際平移的 track div
  const rafId = useRef<number | null>(null)

  // 只渲染有子女的 groups（但順序保留，用 index 對應 carousel）
  const hasAnyChildren = groups.some(g => g.households.length > 0)

  /** 計算平移量並 apply */
  const align = useCallback(() => {
    const carousel = carouselRef.current
    const track = trackRef.current
    const wrap = wrapRef.current
    if (!carousel || !track || !wrap) return

    // 找 carousel 中第 selectedIdx 個子元素（scroll-snap item）
    const snapItems = Array.from(carousel.children) as HTMLElement[]
    const target = snapItems[selectedIdx] ?? snapItems[0]
    if (!target) return

    // highlight 父母卡中心 x（頁面坐標）
    const targetRect = target.getBoundingClientRect()
    const parentCx = targetRect.left + targetRect.width / 2

    // 外層 wrap 中心 x
    const wrapRect = wrap.getBoundingClientRect()
    const wrapCx = wrapRect.left + wrapRect.width / 2

    // 找 track 中第 selectedIdx 個 ChildGroup_ 的中心 x
    // track 直接子元素 = 有子女的 group div，依原始 groups 順序排
    const trackChildren = Array.from(track.children) as HTMLElement[]

    // 建立 groups[selectedIdx] 在 trackChildren 中的位置
    // （groups 中有空 group，trackChildren 只有非空 group）
    let trackIdx = 0
    for (let i = 0; i < selectedIdx && i < groups.length; i++) {
      if (groups[i].households.length > 0) trackIdx++
    }
    const groupEl = trackChildren[trackIdx]
    if (!groupEl) {
      // 若選中的 group 無子女，維持畫面置中（translateX = 0）
      // 讓整個 track 相對 wrap 置中
      const trackRect = track.getBoundingClientRect()
      const trackCx = trackRect.left + trackRect.width / 2
      const delta = wrapCx - trackCx
      track.style.transform = `translateX(${delta}px)`
      return
    }

    const groupRect = groupEl.getBoundingClientRect()
    const groupCx = groupRect.left + groupRect.width / 2

    // 所需 translate = (highlight父母卡中心) - (group 中心) + 現有 transform
    // 但更穩健：直接算從 wrap 中心到 group 中心的偏移
    // 目標：group 中心 align 到 parentCx（即 highlight 父母卡正下方）
    // 同時確保整個 track 不超出 wrap（不做 clamp，讓用戶自己 scroll）
    const currentTransform = parseFloat(track.style.transform?.replace('translateX(', '') ?? '0') || 0
    const delta = parentCx - groupCx
    track.style.transform = `translateX(${currentTransform + delta}px)`
    track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
  }, [selectedIdx, groups, carouselRef])

  /** RAF-throttled align */
  const scheduleAlign = useCallback(() => {
    if (rafId.current !== null) cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => { rafId.current = null; align() })
  }, [align])

  // selectedIdx 或 groups 變化 → 重算
  useEffect(() => {
    scheduleAlign()
  }, [selectedIdx, groups, scheduleAlign])

  // ResizeObserver 監聽 wrap 尺寸變化（橫豎屏切換等）
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(scheduleAlign)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [scheduleAlign])

  // carousel scroll → 重算對齊
  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return
    carousel.addEventListener('scroll', scheduleAlign, { passive: true })
    return () => carousel.removeEventListener('scroll', scheduleAlign)
  }, [carouselRef, scheduleAlign])

  if (!hasAnyChildren) return null

  return (
    /* 外層：固定寬，overflow hidden，防子女層溢出影響外層 scroll */
    <div ref={wrapRef} style={{
      width: '100%', overflow: 'hidden',
      display: 'flex', justifyContent: 'flex-start',
    }}>
      {/* track：平移目標，初始置中 */}
      <div ref={trackRef} style={{
        display: 'flex', flexDirection: 'row', gap: '24px',
        flexShrink: 0,
        willChange: 'transform',
        // 初始使整排置中：左右各加半個 viewport padding
        paddingLeft: 'calc(50% - 90px)',
        paddingRight: 'calc(50% - 90px)',
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
