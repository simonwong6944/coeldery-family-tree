/**
 * buildFocusView — 焦點式局部三層視圖（細步 4g）
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
 * 下層（仔女代）：
 *   - 由「當前選中 household」（selectedHouseholdIdx 決定）的成員之 parent_child 邊 to_member
 *   - primary + spouse 的子女合併（去重），各自連配偶合成 household
 *   - 若無子女 → 下層空
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

export interface FocusView {
  /** 上層：焦點的父母 household（空陣列 = 無父母） */
  parentLayer: FocusLayer
  /** 中層：焦點所在 household + 兄弟姊妹 households（焦點 household 永在 index 0） */
  focusLayer: FocusLayer
  /** 下層：當前選中 household 的子女 households */
  childLayer: FocusLayer
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
  selectedHouseholdIdx = 0,
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

  // 焦點 household（確保 focusId 在 primary 或 spouse 其中之一）
  // 若 focusId 是 spouse，找其配偶（primary 方向）
  const focusSpouseId = spouseMap.get(focusId)
  const focusPrimaryId =
    focusSpouseId && byId.get(focusSpouseId)?.is_self !== 1 && byId.get(focusId)?.is_self !== 1
      ? focusId  // 沒有 is_self 標記，維持 focusId 為 primary
      : focusId  // 直接以 focusId 做 primary，makeHousehold 內部會自動處理 is_self 排序

  const focusHousehold = makeHousehold(focusPrimaryId, byId, spouseMap, petsByOwner, focusUsed)
  const focusLayer: Household[] = focusHousehold ? [focusHousehold] : []

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
    if (hh) focusLayer.push(hh)
  }

  // ── 下層：選中 household 的子女 ──
  const selectedHH = focusLayer[selectedHouseholdIdx] ?? focusLayer[0]
  const parentMemberIds: string[] = []
  if (selectedHH) {
    parentMemberIds.push(selectedHH.primary.id)
    if (selectedHH.spouse) parentMemberIds.push(selectedHH.spouse.id)
  }

  const childIdSet = new Set<string>()
  for (const pid of parentMemberIds) {
    for (const r of pcEdges.filter(r => r.from_member === pid)) {
      childIdSet.add(r.to_member)
    }
  }

  const childUsed = new Set<string>()
  const childHouseholds: Household[] = []
  for (const cid of childIdSet) {
    if (childUsed.has(cid)) continue
    const hh = makeHousehold(cid, byId, spouseMap, petsByOwner, childUsed)
    if (hh) childHouseholds.push(hh)
  }

  return {
    parentLayer: { households: parentHouseholds },
    focusLayer:  { households: focusLayer },
    childLayer:  { households: childHouseholds },
    focusId,
  }
}
