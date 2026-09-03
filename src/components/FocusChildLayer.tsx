/**
 * FocusChildLayer — 4o：此組件已由 FocusTree 中的 LayerCarousel 取代。
 *
 * 4o 改動：
 *   - FocusTree 改用 LayerCarousel 統一處理所有代（包括子女代）
 *   - 本組件不再被 FocusTree import
 *   - 保留 export 以防其他地方有引用，但內部邏輯已清空
 *   - 已移除：doAlign / double-RAF / translateX 全部舊平移對位邏輯
 *
 * module ≤ 250 行。
 */

import type { ChildGroup } from '../../packages/family-tree-engine'

export interface FocusChildLayerProps {
  groups: ChildGroup[]
  selectedIdx: number
  carouselRef: React.RefObject<HTMLDivElement | null>
  focusedMemberId?: string
  setFocusId: (id: string) => void
  onSelect?: (idx: number) => void
}

/** @deprecated 4o 起由 FocusTree > LayerCarousel 取代，此組件已不使用 */
export default function FocusChildLayer(_props: FocusChildLayerProps): null {
  return null
}
