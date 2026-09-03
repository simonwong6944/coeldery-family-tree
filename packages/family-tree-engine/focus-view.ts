/**
 * buildFocusView — 焦點式無限多層視圖（細步 4i）
 *
 * 由焦點向上/向下遞歸砌所有代，輸出 levels 陣列（generation 由小到大）。
 * visited(usedIds) 防環；向下相容保留 parentLayer/focusLayer/childLayer alias。
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
import { buildMarriageMap, buildPetsByOwner, makeHousehold } from './focus-view-helpers'

/* ── Main ── */

export function buildFocusView(
  members: ApiMember[],
  relationships: ApiRel[],
  focusId: string,
): FocusView {
  const byId       = new Map(members.map(m => [m.id, m]))
  const spouseMap  = buildMarriageMap(relationships)
  const petsByOwner = buildPetsByOwner(members, relationships)
  const pcEdges    = relationships.filter(r => r.edge_type === 'parent_child')

  /** 跨代共享 usedIds，防止同一人重複出現 */
  const usedIds = new Set<string>()

  const levels: FocusLevel[] = []

  /* ── 焦點代（generation = 0）── */
  // 焦點 household
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

  levels.push({
    generation: 0,
    groups: [{ parentHouseholdId: null, households: focusHouseholds }],
  })

  /* ── 向上遞歸（-1, -2, …）── */
  // currentGenParentIds: 本代「每個人」的直接父母 id 集合（用於找上一代）
  // 用 Map<parentId, childHouseholdId> 為每個父母記錄「來自哪個 household」
  // 簡化：上層代只做一個大 group（parentHouseholdId=null for gen<-1；gen=-1 用 focusHH）
  let currentMemberIds: Set<string> = new Set([
    focusId,
    ...(focusHH?.spouse ? [focusHH.spouse.id] : []),
  ])

  for (let gen = -1; ; gen--) {
    // 收集 currentMemberIds 的所有直接父母 id（未使用）
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
      nextIds.add(hh.primary.id)
      if (hh.spouse) nextIds.add(hh.spouse.id)
    }

    if (genHouseholds.length === 0) break

    levels.push({
      generation: gen,
      groups: [{ parentHouseholdId: null, households: genHouseholds }],
    })
    currentMemberIds = nextIds
  }

  /* ── 向下遞歸（+1, +2, …）── */
  // 每代：以上一代各 household 為 parent 分組，收集子女
  // 初始「上一代 households」= 焦點代的 households（含兄弟姊妹）
  let prevGenHouseholds: Household[] = focusHouseholds

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

      groups.push({
        parentHouseholdId: parentHH.primary.id,
        households: childHouseholds,
      })
    }

    // 若本代完全無子女，停止向下
    const hasAny = groups.some(g => g.households.length > 0)
    if (!hasAny) break

    levels.push({ generation: gen, groups })
    prevGenHouseholds = groups.flatMap(g => g.households)
  }

  /* ── 排序 levels（generation 由小到大）── */
  levels.sort((a, b) => a.generation - b.generation)

  /* ── 向下相容 alias ── */
  const focusLevel   = levels.find(l => l.generation === 0)
  const parentLevel  = levels.find(l => l.generation === -1)
  const childLevel   = levels.find(l => l.generation === 1)

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

  return { levels, focusId, parentLayer, focusLayer, childLayer }
}
