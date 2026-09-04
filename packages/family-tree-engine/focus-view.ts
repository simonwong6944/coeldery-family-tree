/**
 * buildFocusView — 焦點式無限多層視圖（4q：直系血脈重構 + birth_date 排序）
 *
 * 4q 改動：
 *   (1) 向上遞歸 currentMemberIds 只放 focusId，唔放 focusHH.spouse
 *       → 父母代只搜焦點本人直接父母；唔溝入配偶父母
 *   (2) sortHouseholdsByBirthDate()：各代 households 按 birth_date ASC 排序
 *       null birth_date 排最後；焦點本人 (is_self/focusId) 位置=排序後索引
 *   (3) buildFocusView 返回 selectedIdxHint（建議 selectedIdx，指向焦點本人）
 *
 * SOP 規則 B：≤ 250 行。helpers 詳見 focus-view-helpers.ts。
 */

import type { ApiMember, ApiRel, Household } from './index'

/* ── Types ── */

export interface FocusGroup {
  /** 對應上一代某個 household 的 primary.id；焦點代為 null */
  parentHouseholdId: string | null
  households: Household[]
}

export interface FocusLevel {
  /** 相對焦點代：0=焦點，-1=父母，-2=祖父母，+1=子女，+2=孫 … */
  generation: number
  groups: FocusGroup[]
}

export interface FocusView {
  /** 所有代，generation 由小到大排列 */
  levels: FocusLevel[]
  /** 焦點 memberId */
  focusId: string
  /** 建議 selectedIdx（gen=0 焦點本人在排序後的位置）*/
  selectedIdxHint: number

  /* ── 向下相容 alias（指向 levels 對應代） ── */
  parentLayer: { households: Household[] }
  focusLayer:  { households: Household[] }
  childLayer:  { groups: Array<{ parentHouseholdId: string; households: Household[] }> }
}

/* 向下相容型別（舊元件仍用） */
export interface FocusLayer  { households: Household[] }
export interface ChildGroup  { parentHouseholdId: string; households: Household[] }
export interface ChildLayer  { groups: ChildGroup[] }

/* ── Helpers（見 focus-view-helpers.ts）── */
import { buildMarriageMap, buildPetsByOwner, makeHousehold, sortHouseholdsByBirthDate } from './focus-view-helpers'

/* ── Main ── */

export function buildFocusView(
  members: ApiMember[],
  relationships: ApiRel[],
  focusId: string,
): FocusView {
  const byId        = new Map(members.map(m => [m.id, m]))
  const spouseMap   = buildMarriageMap(relationships)
  const petsByOwner = buildPetsByOwner(members, relationships)
  const pcEdges     = relationships.filter(r => r.edge_type === 'parent_child')

  /** 跨代共享 usedIds，防止同一人重複出現 */
  const usedIds = new Set<string>()

  const levels: FocusLevel[] = []

  /* ── 焦點代（generation = 0）── */
  const focusHH = makeHousehold(focusId, byId, spouseMap, petsByOwner, usedIds)
  const focusHouseholds: Household[] = focusHH ? [focusHH] : []

  // 兄弟姊妹：共享至少一個父母的同代 person
  const focusParentIds = new Set(
    pcEdges.filter(r => r.to_member === focusId).map(r => r.from_member)
  )
  for (const r of pcEdges) {
    if (focusParentIds.has(r.from_member) && r.to_member !== focusId) {
      const hh = makeHousehold(r.to_member, byId, spouseMap, petsByOwner, usedIds)
      if (hh) focusHouseholds.push(hh)
    }
  }

  // 4q：按 birth_date 排序，取得焦點本人在排序後的 index
  const { sorted: sortedFocusHH, focusIdx } = sortHouseholdsByBirthDate(focusHouseholds, focusId)
  const selectedIdxHint = focusIdx

  levels.push({
    generation: 0,
    groups: [{ parentHouseholdId: null, households: sortedFocusHH }],
  })

  /* ── 向上遞歸（-1, -2, …）── */
  // 4q 修正：currentMemberIds 只放 focusId（唔放 focusHH.spouse）
  // → 父母代只搜焦點本人直接父母，唔溝入配偶父母
  let currentMemberIds: Set<string> = new Set([focusId])

  for (let gen = -1; ; gen--) {
    const parentIdSet = new Set<string>()
    for (const memberId of currentMemberIds) {
      for (const r of pcEdges) {
        if (r.to_member === memberId && !usedIds.has(r.from_member)) {
          parentIdSet.add(r.from_member)
        }
      }
    }
    if (parentIdSet.size === 0) break

    const genHouseholds: Household[] = []
    const nextIds = new Set<string>()

    for (const pid of parentIdSet) {
      const hh = makeHousehold(pid, byId, spouseMap, petsByOwner, usedIds)
      if (!hh) continue
      genHouseholds.push(hh)
      // 4q：向上遞歸時，nextIds 只放找到的 primary（父/母），
      // 唔放配偶——因為我們要跟「焦點的直系血緣」，即祖父母是父母的父母，
      // 唔係父母配偶的父母（外曾祖父母）
      nextIds.add(hh.primary.id)
    }

    if (genHouseholds.length === 0) break

    // 祖父母及以上按 birth_date 排序（focusId 在上層不存在，全靠日期）
    const { sorted: sortedGenHH } = sortHouseholdsByBirthDate(genHouseholds, null)

    levels.push({
      generation: gen,
      groups: [{ parentHouseholdId: null, households: sortedGenHH }],
    })
    currentMemberIds = nextIds
  }

  /* ── 向下遞歸（+1, +2, …）── */
  let prevGenHouseholds: Household[] = sortedFocusHH

  for (let gen = 1; ; gen++) {
    const groups: FocusGroup[] = []

    for (const parentHH of prevGenHouseholds) {
      const parentIds: string[] = [parentHH.primary.id]
      if (parentHH.spouse) parentIds.push(parentHH.spouse.id)

      const childIdSet = new Set<string>()
      for (const pid of parentIds) {
        for (const r of pcEdges) {
          if (r.from_member === pid && !usedIds.has(r.to_member)) {
            childIdSet.add(r.to_member)
          }
        }
      }

      const childHouseholds: Household[] = []
      for (const cid of childIdSet) {
        const hh = makeHousehold(cid, byId, spouseMap, petsByOwner, usedIds)
        if (hh) childHouseholds.push(hh)
      }

      // 子女也按 birth_date 排序
      const { sorted: sortedChild } = sortHouseholdsByBirthDate(childHouseholds, null)

      groups.push({
        parentHouseholdId: parentHH.primary.id,
        households: sortedChild,
      })
    }

    const hasAny = groups.some(g => g.households.length > 0)
    if (!hasAny) break

    levels.push({ generation: gen, groups })
    prevGenHouseholds = groups.flatMap(g => g.households)
  }

  /* ── 排序 levels（generation 由小到大）── */
  levels.sort((a, b) => a.generation - b.generation)

  /* ── 向下相容 alias ── */
  const focusLevel  = levels.find(l => l.generation === 0)
  const parentLevel = levels.find(l => l.generation === -1)
  const childLevel  = levels.find(l => l.generation === 1)

  const parentLayer = {
    households: parentLevel?.groups.flatMap(g => g.households) ?? [],
  }
  const focusLayerHH = focusLevel?.groups.flatMap(g => g.households) ?? []
  const focusLayer = { households: focusLayerHH }
  const childLayer = {
    groups: (childLevel?.groups ?? []).map(g => ({
      parentHouseholdId: g.parentHouseholdId ?? '',
      households: g.households,
    })),
  }

  return { levels, focusId, selectedIdxHint, parentLayer, focusLayer, childLayer }
}
