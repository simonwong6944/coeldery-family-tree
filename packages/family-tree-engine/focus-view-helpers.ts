/**
 * focus-view-helpers — buildFocusView 共用 helper（細步 4i）
 * 拆出以確保 focus-view.ts ≤ 250 行。
 * SOP 規則 B：本檔 ≤ 250 行。
 */

import type { ApiMember, ApiRel, Household } from './index'

export function buildMarriageMap(rels: ApiRel[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of rels.filter(r => r.edge_type === 'marriage')) {
    map.set(r.from_member, r.to_member)
    map.set(r.to_member, r.from_member)
  }
  return map
}

export function buildPetsByOwner(
  members: ApiMember[],
  rels: ApiRel[],
): Map<string, ApiMember[]> {
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
 * 將 primaryId 組成 Household。
 * - 本人（is_self=1）恆定為 primary（左）。
 * - usedIds 跨代共享，防止同一人重複出現於多代。
 */
export function makeHousehold(
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
    const s = byId.get(spouseId)
    if (s?.member_kind === 'person') { spouseMember = s; usedIds.add(spouseId) }
  }

  // 本人恆定排 primary（左）
  let fp = primary, fs = spouseMember
  if (spouseMember && spouseMember.is_self === 1 && primary.is_self !== 1) {
    fp = spouseMember; fs = primary
  }

  const petSet = new Map<string, ApiMember>()
  for (const p of petsByOwner.get(fp.id) ?? []) petSet.set(p.id, p)
  for (const p of petsByOwner.get(fs?.id ?? '') ?? []) petSet.set(p.id, p)

  return { primary: fp, spouse: fs, pets: Array.from(petSet.values()) }
}
