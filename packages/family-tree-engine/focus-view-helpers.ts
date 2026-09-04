/**
 * focus-view-helpers — buildFocusView 共用 helper（4q：+sortHouseholdsByBirthDate）
 *
 * 4q 新增：
 *   sortHouseholdsByBirthDate(hhs, focusId)
 *   - birth_date ASC 排序（null 排最後）
 *   - 返回 { sorted, focusIdx }；focusIdx = focusId 在排序後的位置（無焦點則 0）
 *
 * Dependency note（記於 build_log）：
 *   birth_date 現取自 D1 ApiMember.birth_date；若日後搬至 CoEldery85
 *   需同步更新資料源。
 *
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

/**
 * sortHouseholdsByBirthDate
 *
 * 按 household.primary.birth_date ASC 排序：
 *   - birth_date 有值：ISO 日期字串比較（'YYYY-MM-DD' lexicographic = 正確年份排序）
 *   - birth_date null：排最後（用 '9999-99-99' 佔位）
 *   - 同 birth_date：保持原始順序（stable sort，JS ≥ V8 ES2019 保證穩定）
 *
 * focusId 傳入時，返回排序後該 household 的 index（作為 selectedIdxHint）。
 * focusId 為 null 時 focusIdx = 0。
 *
 * @param households  原始 households（不修改原陣列）
 * @param focusId     焦點人 id（可為 null）
 * @returns { sorted, focusIdx }
 */
export function sortHouseholdsByBirthDate(
  households: Household[],
  focusId: string | null,
): { sorted: Household[]; focusIdx: number } {
  const FAR_DATE = '9999-99-99'

  const sorted = [...households].sort((a, b) => {
    const da = a.primary.birth_date ?? FAR_DATE
    const db = b.primary.birth_date ?? FAR_DATE
    if (da < db) return -1
    if (da > db) return 1
    return 0
  })

  let focusIdx = 0
  if (focusId !== null) {
    const idx = sorted.findIndex(
      hh => hh.primary.id === focusId || hh.spouse?.id === focusId
    )
    if (idx >= 0) focusIdx = idx
  }

  return { sorted, focusIdx }
}
