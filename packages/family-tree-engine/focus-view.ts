/**
 * buildFocusView — 焦點式局部三層視圖（細步 4h）
 *
 * 輸入：全量 members、relationships、目前 focusId
 * 輸出：FocusView — 最多三層（上/中/下），每層含 households 陣列
 *
 * 中層（焦點代）：
 *   - focusHousehold：焦點所屬 household（焦點 + 配偶 + 寵物）
 *   - siblings：與焦點共享至少一個父母的同代 person，各自連配偶合成 household
 *   - 合併後中層 = [focusHousehold, ...siblings]，焦點 household 必在陣列第 0 位
 *
 * 上層（父母代）：
 *   - 焦點的 parent_child 邊 from_member → 找其 household（parent + 配偶）
 *   - 若父母是一對夫妻 → 合成一張卡；若無父母 → 上層空
 *
 * 下層（仔女代）4h 新：
 *   - 每個中層 household 各自計算其子女（primary + spouse 的 parent_child.to_member 合併去重）
 *   - childLayer.groups：Array<{ parentHouseholdId, households }>
 *   - 無子女的房 → groups 對應項 households 為空陣列（佔位對齊）
 *
 * 注意：本人（is_self=1）在配偶卡中恆定排在 primary 位置（left）。
 *
 * SOP 規則 B：≤ 250 行。
 */

import type { ApiMember, ApiRel, Household } from './index'

/* ── Types ── */

export interface FocusLayer {
  households: Household[]
}

/** 4h：下層每一組子女，對應中層某個 household */
export interface ChildGroup {
  /** 對應 focusLayer.households 中某個 household 的 primary.id */
  parentHouseholdId: string
  /** 該房子女（各自連配偶合成 household），無子女時為空陣列 */
  households: Household[]
}

/** 4h：下層結構改為按中層 household 分組 */
export interface ChildLayer {
  groups: ChildGroup[]
}

export interface FocusView {
  /** 上層：焦點的父母 household（空陣列 = 無父母） */
  parentLayer: FocusLayer
  /** 中層：焦點所在 household + 兄弟姊妹 households（焦點 household 永在 index 0） */
  focusLayer: FocusLayer
  /** 下層（4h）：按中層 household 分組的子女，groups[i] 對應 focusLayer.households[i] */
  childLayer: ChildLayer
  /** 焦點 memberId */
  focusId: string
}

/* ── Helpers ── */

/** 建立 marriage adjacency map（雙向） */
function buildMarriageMap(rels: ApiRel[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of rels.filter(r => r.edge_type === 'marriage')) {
    map.set(r.from_member, r.to_member)
    map.set(r.to_member, r.from_member)
  }
  return map
}

/** 建立 petsByOwner map */
function buildPetsByOwner(members: ApiMember[], rels: ApiRel[]): Map<string, ApiMember[]> {
  const byId = new Map(members.map(m => [m.id, m]))
  const map = new Map<string, ApiMember[]>()
  for (const r of rels.filter(r => r.edge_type === 'pet_owner')) {
    const pet = byId.get(r.to_member)
    if (!pet || pet.member_kind !== 'pet') continue
    if (!map.has(r.from_member)) map.set(r.from_member, [])
    map.get(r.from_member)!.push(pet)
  }
  return map
}

/**
 * 根據 primaryId 組成一個 Household。
 * 若 primaryId 的配偶也在 spouseMap 中，合成配偶卡。
 * 本人（is_self=1）恆定為 primary（在左）。
 */
function makeHousehold(
  primaryId: string,
  byId: Map<string, ApiMember>,
  spouseMap: Map<string, string>,
  petsByOwner: Map<string, ApiMember[]>,
  usedIds: Set<string>,
): Household | null {
  const primary = byId.get(primaryId)
  if (!primary || primary.member_kind !== 'person') return null
  if (usedIds.has(primaryId)) return null
  usedIds.add(primaryId)

  const spouseId = spouseMap.get(primaryId)
  let spouseMember: ApiMember | undefined

  if (spouseId && !usedIds.has(spouseId)) {
    spouseMember = byId.get(spouseId)
    if (spouseMember?.member_kind === 'person') {
      usedIds.add(spouseId)
    } else {
      spouseMember = undefined
    }
  }

  // 本人（is_self=1）恆定排 primary（左）
  let finalPrimary = primary
  let finalSpouse = spouseMember
  if (spouseMember && spouseMember.is_self === 1 && primary.is_self !== 1) {
    finalPrimary = spouseMember
    finalSpouse = primary
  }

  // 合併兩人寵物（去重）
  const petSet = new Map<string, ApiMember>()
  for (const p of petsByOwner.get(finalPrimary.id) ?? []) petSet.set(p.id, p)
  for (const p of petsByOwner.get(finalSpouse?.id ?? '') ?? []) petSet.set(p.id, p)

  return { primary: finalPrimary, spouse: finalSpouse, pets: Array.from(petSet.values()) }
}

/* ── Main ── */

export function buildFocusView(
  members: ApiMember[],
  relationships: ApiRel[],
  focusId: string,
): FocusView {
  const byId = new Map(members.map(m => [m.id, m]))
  const spouseMap = buildMarriageMap(relationships)
  const petsByOwner = buildPetsByOwner(members, relationships)
  const pcEdges = relationships.filter(r => r.edge_type === 'parent_child')

  // ── 上層：焦點的父母 ──
  const parentIds = pcEdges
    .filter(r => r.to_member === focusId)
    .map(r => r.from_member)

  const parentUsed = new Set<string>()
  const parentHouseholds: Household[] = []

  for (const pid of parentIds) {
    if (parentUsed.has(pid)) continue
    const hh = makeHousehold(pid, byId, spouseMap, petsByOwner, parentUsed)
    if (hh) parentHouseholds.push(hh)
  }

  // ── 中層：焦點 household + 兄弟姊妹 ──
  const focusUsed = new Set<string>()

  // 焦點 household（直接以 focusId 做 primary，makeHousehold 內部自動處理 is_self 排序）
  const focusHousehold = makeHousehold(focusId, byId, spouseMap, petsByOwner, focusUsed)
  const focusHouseholds: Household[] = focusHousehold ? [focusHousehold] : []

  // 兄弟姊妹：與 focusId 共享至少一個父母
  const focusParentIds = new Set(
    pcEdges.filter(r => r.to_member === focusId).map(r => r.from_member)
  )
  const siblingIds = new Set<string>()
  for (const r of pcEdges) {
    if (focusParentIds.has(r.from_member) && r.to_member !== focusId) {
      siblingIds.add(r.to_member)
    }
  }

  for (const sid of siblingIds) {
    if (focusUsed.has(sid)) continue
    const hh = makeHousehold(sid, byId, spouseMap, petsByOwner, focusUsed)
    if (hh) focusHouseholds.push(hh)
  }

  // ── 下層（4h）：每個中層 household 各自計算子女 ──
  const childGroups: ChildGroup[] = []

  for (const focusHH of focusHouseholds) {
    // 收集該房 primary + spouse 的所有子女 id（去重）
    const parentMemberIds: string[] = [focusHH.primary.id]
    if (focusHH.spouse) parentMemberIds.push(focusHH.spouse.id)

    const childIdSet = new Set<string>()
    for (const pid of parentMemberIds) {
      for (const r of pcEdges) {
        if (r.from_member === pid) childIdSet.add(r.to_member)
      }
    }

    // 每組子女用獨立 usedIds（不同房子女可以是同一人的不同視角，不互相干擾）
    const childUsed = new Set<string>()
    const childHouseholds: Household[] = []
    for (const cid of childIdSet) {
      if (childUsed.has(cid)) continue
      const hh = makeHousehold(cid, byId, spouseMap, petsByOwner, childUsed)
      if (hh) childHouseholds.push(hh)
    }

    childGroups.push({
      parentHouseholdId: focusHH.primary.id,
      households: childHouseholds,
    })
  }

  return {
    parentLayer: { households: parentHouseholds },
    focusLayer:  { households: focusHouseholds },
    childLayer:  { groups: childGroups },
    focusId,
  }
}
