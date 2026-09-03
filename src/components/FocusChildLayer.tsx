/**
 * FocusChildLayer — 下層子女區（4j）
 *
 * 4j 對正策略改動：
 *   - 不再追隨 carousel DOM 的 selectedIdx 卡座標（4h-fix-2 舊策略），
 *     因為中層卡現在是 80vw 寬、snap 到容器正中，
 *     highlight 父母卡永遠在容器水平正中心。
 *   - 新策略：align() 直接把 groups[selectedIdx] 的 group 元素
 *     移到 wrap 容器的水平正中心。
 *   - 依然用絕對 translateX（每次先歸零再算），不累加，不漂移。
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
   * 4j align 策略：
   *   highlight 父母卡永遠 snap 到中層容器正中心（80vw 卡 + snap）。
   *   因此下層直接把 groups[selectedIdx] 的 group 移到 wrap 容器水平正中心。
   *
   *   步驟：
   *   1. 歸零 transform（無 transition），取得原始 layout 座標
   *   2. 計算 wrap 容器水平中心 x（viewport 座標）
   *   3. 找 groups[selectedIdx] 對應的 trackChildren 元素
   *   4. 計算 groupEl 中心 x（transform=0，座標可靠）
   *   5. delta = wrapCenterX - groupCx（一次性絕對值，不累加）
   *   6. 加 transition，apply translateX(delta)
   */
  const align = useCallback(() => {
    const track = trackRef.current
    const wrap = wrapRef.current
    if (!track || !wrap) return

    /* Step 1: 歸零 transform，不加 transition */
    track.style.transition = 'none'
    track.style.transform = ''

    /* Step 2: wrap 容器水平中心（viewport 座標） */
    const wrapRect = wrap.getBoundingClientRect()
    const wrapCenterX = wrapRect.left + wrapRect.width / 2

    /* Step 3: 找 groups[selectedIdx] 在 trackChildren 中的真實下標
     *   groups[i].households.length===0 → track 中沒有此 group 的 DOM
     */
    const trackChildren = Array.from(track.children) as HTMLElement[]
    let trackIdx = 0
    for (let i = 0; i < selectedIdx && i < groups.length; i++) {
      if (groups[i].households.length > 0) trackIdx++
    }

    const groupEl = trackChildren[trackIdx]
    if (!groupEl) {
      /* 選中的 group 無子女 → 整個 track 相對 wrap 置中 */
      const trackRect = track.getBoundingClientRect()
      const trackCx = trackRect.left + trackRect.width / 2
      const delta = wrapCenterX - trackCx
      requestAnimationFrame(() => {
        track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
        track.style.transform = `translateX(${delta}px)`
      })
      return
    }

    /* Step 4: groupEl 中心 x（transform=0，可靠） */
    const groupRect = groupEl.getBoundingClientRect()
    const groupCx = groupRect.left + groupRect.width / 2

    /* Step 5: 一次性絕對 delta，不累加 */
    const delta = wrapCenterX - groupCx

    /* Step 6: 加回 transition，apply 絕對 translateX */
    requestAnimationFrame(() => {
      track.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)'
      track.style.transform = `translateX(${delta}px)`
    })
  }, [selectedIdx, groups])

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

  /* carousel scroll 時也重算對位（carousel snap 完成後 selectedIdx 更新前的過渡期） */
  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return
    carousel.addEventListener('scroll', scheduleAlign, { passive: true })
    return () => carousel.removeEventListener('scroll', scheduleAlign)
  }, [carouselRef, scheduleAlign])

  if (!hasAnyChildren) return null

  return (
    /* 外層：全寬，只截橫向溢出（overflowX:hidden 防橫爆版），
     * overflowY 必須 visible，讓子女卡高度貢獻到 <main> scrollHeight，
     * 縱向 scroll 才能正常觸發。overflow:hidden 整體截住會令 scrollHeight 永遠等於 clientHeight。
     */
    <div ref={wrapRef} style={{
      width: '100%',
      overflowX: 'hidden',
      overflowY: 'visible',
      display: 'flex',
      justifyContent: 'center',   /* flex 置中作 fallback */
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
