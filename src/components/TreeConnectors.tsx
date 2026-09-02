/**
 * TreeConnectors — 動態 SVG 父子連線 overlay
 *
 * 架構：
 *   - 疊在整棵樹容器上的 position:absolute SVG（pointerEvents:none）
 *   - 按每條 parent_child 邊，從父頭像中心畫折線到子頭像中心
 *   - 用 data-member-id / data-member-side 定位 DOM 元素
 *   - 監聽 ResizeObserver + 所有代層 scrollWrapper 的 scroll 事件
 *   - rAF 節流避免 scroll 卡頓
 *
 * module ≤ 250 行。
 */

import { useEffect, useRef, useCallback } from 'react'
import type { ApiRel } from '../../packages/family-tree-engine'

/* ── 工具函數 ── */

/**
 * 取得 memberId 對應的 DOM 元素中心座標（相對於 containerEl）。
 * side: 'primary' | 'spouse' | undefined
 *   - 有 side 時用 [data-member-id][data-member-side] 精準定位配偶半邊
 *   - 無 side 時用 [data-member-id] 定位整個 block
 */
function getMemberCenter(
  memberId: string,
  containerEl: Element,
  side?: 'primary' | 'spouse',
): { x: number; y: number } | null {
  const selector = side
    ? `[data-member-id="${memberId}"][data-member-side="${side}"]`
    : `[data-member-id="${memberId}"]`
  const el = containerEl.querySelector(selector)
  if (!el) return null

  const elRect = el.getBoundingClientRect()
  const containerRect = containerEl.getBoundingClientRect()

  return {
    x: elRect.left + elRect.width / 2 - containerRect.left,
    y: elRect.top  + elRect.height / 2 - containerRect.top,
  }
}

/**
 * 建立一條折線 SVG path（elbow connector）：
 * 父中心(px,py) → 中轉點 → 子中心(cx,cy)
 * 折點在父/子之間垂直中點，形成 T 形分叉結構。
 */
function elbowPath(px: number, py: number, cx: number, cy: number): string {
  const midY = py + (cy - py) / 2
  return `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`
}

/* ── Props ── */

export interface ConnectorEdge {
  /** parent_child 邊：parent memberId */
  parentId: string
  /** parent_child 邊：child memberId */
  childId: string
  /**
   * 此 parent 在其 household 卡中的角色
   * undefined = 單身卡（整張卡中心）
   * 'primary' = 配偶卡左半
   * 'spouse'  = 配偶卡右半
   */
  parentSide?: 'primary' | 'spouse'
}

export interface TreeConnectorsProps {
  /** 整棵樹容器的 ref（SVG 將 absolute 疊在此容器上） */
  containerRef: React.RefObject<HTMLElement | null>
  /** 所有需要畫線的 parent_child 邊，已計算好 parentSide */
  edges: ConnectorEdge[]
  /** 監聽 scroll 的各代 scrollWrapper 元素 ref 陣列 */
  scrollRefs: React.RefObject<HTMLElement | null>[]
}

/** 一條連線的座標 */
interface Line { px: number; py: number; cx: number; cy: number }

/* ── Component ── */

export default function TreeConnectors({ containerRef, edges, scrollRefs }: TreeConnectorsProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number | null>(null)

  const redraw = useCallback(() => {
    const container = containerRef.current
    const svg = svgRef.current
    if (!container || !svg) return

    const containerRect = container.getBoundingClientRect()
    svg.setAttribute('width',  String(containerRect.width))
    svg.setAttribute('height', String(containerRect.height))

    const lines: Line[] = []

    for (const edge of edges) {
      const parentPt = getMemberCenter(edge.parentId, container, edge.parentSide)
      const childPt  = getMemberCenter(edge.childId,  container)
      if (!parentPt || !childPt) continue
      lines.push({ px: parentPt.x, py: parentPt.y, cx: childPt.x, cy: childPt.y })
    }

    // 重建所有 path 元素
    // 清空舊路徑
    while (svg.firstChild) svg.removeChild(svg.firstChild)

    for (const ln of lines) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', elbowPath(ln.px, ln.py, ln.cx, ln.cy))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', 'var(--color-primary)')
      path.setAttribute('stroke-width', '2')
      path.setAttribute('stroke-linecap', 'round')
      svg.appendChild(path)
    }
  }, [containerRef, edges])

  const scheduleRedraw = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      redraw()
    })
  }, [redraw])

  useEffect(() => {
    // 初始畫線（等 layout 穩定後）
    const timer = setTimeout(scheduleRedraw, 50)

    // ResizeObserver 監聽容器大小變化
    const ro = new ResizeObserver(scheduleRedraw)
    if (containerRef.current) ro.observe(containerRef.current)

    // 監聽各代 scrollWrapper 的 scroll 事件
    const scrollEls = scrollRefs.map(r => r.current).filter(Boolean) as HTMLElement[]
    for (const el of scrollEls) el.addEventListener('scroll', scheduleRedraw, { passive: true })

    // 監聽 window resize
    window.addEventListener('resize', scheduleRedraw, { passive: true })

    return () => {
      clearTimeout(timer)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      for (const el of scrollEls) el.removeEventListener('scroll', scheduleRedraw)
      window.removeEventListener('resize', scheduleRedraw)
    }
  }, [scheduleRedraw, containerRef, scrollRefs])

  // edges 變動時重畫
  useEffect(() => { scheduleRedraw() }, [edges, scheduleRedraw])

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    />
  )
}

/* ── 工具：從 ApiRel[] 建立 ConnectorEdge[] ── */

/**
 * buildConnectorEdges:
 * 將 parent_child 邊轉為 ConnectorEdge，
 * 並判斷每個 parent 在其 household 中是 primary 還是 spouse。
 *
 * householdMap: memberId → { isPrimary: boolean }
 *   - isPrimary=true  → side='primary'
 *   - isPrimary=false → side='spouse'
 *   - 不在 map 中（單身）→ side=undefined
 */
export function buildConnectorEdges(
  relationships: ApiRel[],
  householdMemberRoles: Map<string, 'primary' | 'spouse'>,
): ConnectorEdge[] {
  return relationships
    .filter(r => r.edge_type === 'parent_child')
    .map(r => ({
      parentId:   r.from_member,
      childId:    r.to_member,
      parentSide: householdMemberRoles.get(r.from_member),
    }))
}
