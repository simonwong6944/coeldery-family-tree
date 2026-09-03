/**
 * @coeldery/family-tree-engine
 * 通用分代演算法 — BFS 從錨點計算每個成員的 generation level，
 * 並按 marriage 邊分組 household。
 * 細步 4g 新增：buildFocusView() 焦點式局部三層視圖。
 *
 * SOP 規則 B：≤ 250 行。
 * 超出時拆分：本檔保留原有 buildLevels/buildTreeLevels；
 * buildFocusView 邏輯拆至 focus-view.ts 並於此重新 export。
 */

/* ── Type Definitions ── */

export interface ApiMember {
  id: string
  display_name: string
  member_kind: string
  birth_date: string | null
  deceased_date?: string | null
  avatar_url: string | null
  is_self?: number  // 1 = 本人，0 = 一般；全 family 最多一個 is_self=1
}

export interface ApiRel {
  id: string
  from_member: string
  to_member: string
  edge_type: string
  status: string | null
}

/** 一個 household（一對配偶或單人）+ 附屬寵物 */
export interface Household {
  primary: ApiMember
  spouse?: ApiMember    // marriage 邊配偶
  pets: ApiMember[]     // pet_owner 邊附屬寵物
}

/** 一個代層 */
export interface TreeLevel {
  level: number                // 0 = 錨點代，-1 = 上一代，+1 = 下一代，...
  households: Household[]      // 有序（先配偶組，後單身）
}

/* ── BFS Level 計算 ── */

/**
 * buildLevels: BFS 從錨點（第一個 person member）出發，
 * 沿 parent_child 邊雙向遍歷，計算每位 person 成員的 level。
 * marriage 邊傳播同一 level 給配偶。
 * 孤立 person（無關係邊）歸入 level 0。
 *
 * 返回 Map<memberId, level>。
 */
export function buildLevels(
  members: ApiMember[],
  relationships: ApiRel[],
): Map<string, number> {
  const persons = members.filter(m => m.member_kind === 'person')
  if (persons.length === 0) return new Map()

  // 錨點 = 優先取 is_self=1 的成員；若無則 fallback 第一個 person（加入順序）
  const anchor = persons.find(p => p.is_self === 1) ?? persons[0]

  const levelMap = new Map<string, number>()
  levelMap.set(anchor.id, 0)

  // parent_child adjacency（雙向，記錄相對偏移）
  // edge: from → to（from 是父/長輩，to 是子/晚輩）
  // 從 child 視角：parent = childLevel - 1（需 from_level = to_level - 1）
  // 從 parent 視角：child = parentLevel + 1

  const pcEdges = relationships.filter(r => r.edge_type === 'parent_child')
  const marriageEdges = relationships.filter(r => r.edge_type === 'marriage')

  // personId → Set<personId> marriage 鄰居
  const marriageNeighbours = new Map<string, Set<string>>()
  for (const rel of marriageEdges) {
    if (!marriageNeighbours.has(rel.from_member)) marriageNeighbours.set(rel.from_member, new Set())
    if (!marriageNeighbours.has(rel.to_member)) marriageNeighbours.set(rel.to_member, new Set())
    marriageNeighbours.get(rel.from_member)!.add(rel.to_member)
    marriageNeighbours.get(rel.to_member)!.add(rel.from_member)
  }

  const personIdSet = new Set(persons.map(p => p.id))

  const queue: string[] = [anchor.id]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const currentLevel = levelMap.get(currentId)!

    // 1. Marriage 邊：配偶同 level
    for (const spouseId of marriageNeighbours.get(currentId) ?? []) {
      if (!levelMap.has(spouseId) && personIdSet.has(spouseId)) {
        levelMap.set(spouseId, currentLevel)
        queue.push(spouseId)
      }
    }

    // 2. parent_child 向下：current 是父（from），child 是晚輩（to）→ childLevel = currentLevel + 1
    for (const rel of pcEdges) {
      if (rel.from_member === currentId && personIdSet.has(rel.to_member) && !levelMap.has(rel.to_member)) {
        levelMap.set(rel.to_member, currentLevel + 1)
        queue.push(rel.to_member)
      }
    }

    // 3. parent_child 向上：current 是子（to），parent 是長輩（from）→ parentLevel = currentLevel - 1
    for (const rel of pcEdges) {
      if (rel.to_member === currentId && personIdSet.has(rel.from_member) && !levelMap.has(rel.from_member)) {
        levelMap.set(rel.from_member, currentLevel - 1)
        queue.push(rel.from_member)
      }
    }
  }

  // 孤立 person（BFS 未訪問）→ level 0
  for (const p of persons) {
    if (!levelMap.has(p.id)) levelMap.set(p.id, 0)
  }

  return levelMap
}

/* ── Household 分組 ── */

/**
 * buildTreeLevels: 根據 levelMap 與 relationships，
 * 將每個 level 的 person 成員分組為 Household，
 * 並附上寵物。
 *
 * 返回 TreeLevel[]（按 level 升冪排列，含負數 level）。
 */
export function buildTreeLevels(
  members: ApiMember[],
  relationships: ApiRel[],
  levelMap: Map<string, number>,
): TreeLevel[] {
  const byId = new Map(members.map(m => [m.id, m]))

  const marriageEdges = relationships.filter(r => r.edge_type === 'marriage')
  const petOwnerEdges = relationships.filter(r => r.edge_type === 'pet_owner')

  // petOwnerId → pet members
  const petsByOwner = new Map<string, ApiMember[]>()
  for (const rel of petOwnerEdges) {
    const pet = byId.get(rel.to_member)
    if (!pet || pet.member_kind !== 'pet') continue
    if (!petsByOwner.has(rel.from_member)) petsByOwner.set(rel.from_member, [])
    petsByOwner.get(rel.from_member)!.push(pet)
  }

  // 已配對的 person IDs（不重複加入）
  const paired = new Set<string>()

  // level → Household[]
  const levelHouseholds = new Map<number, Household[]>()

  // 先處理 marriage 邊配對
  for (const rel of marriageEdges) {
    const a = byId.get(rel.from_member)
    const b = byId.get(rel.to_member)
    if (!a || !b) continue
    if (a.member_kind !== 'person' || b.member_kind !== 'person') continue
    if (paired.has(a.id) || paired.has(b.id)) continue

    const levelA = levelMap.get(a.id)
    if (levelA === undefined) continue

    paired.add(a.id)
    paired.add(b.id)

    // 寵物：合並兩人的寵物（去重）
    const petSet = new Map<string, ApiMember>()
    for (const p of petsByOwner.get(a.id) ?? []) petSet.set(p.id, p)
    for (const p of petsByOwner.get(b.id) ?? []) petSet.set(p.id, p)

    const household: Household = {
      primary: a,
      spouse: b,
      pets: Array.from(petSet.values()),
    }

    if (!levelHouseholds.has(levelA)) levelHouseholds.set(levelA, [])
    levelHouseholds.get(levelA)!.push(household)
  }

  // 再處理單身 person（未配對）
  for (const [memberId, level] of levelMap) {
    if (paired.has(memberId)) continue
    const member = byId.get(memberId)
    if (!member || member.member_kind !== 'person') continue

    const household: Household = {
      primary: member,
      pets: petsByOwner.get(memberId) ?? [],
    }

    if (!levelHouseholds.has(level)) levelHouseholds.set(level, [])
    levelHouseholds.get(level)!.push(household)
  }

  // 轉換為 TreeLevel[]，按 level 升冪
  const result: TreeLevel[] = []
  const sortedLevels = Array.from(levelHouseholds.keys()).sort((a, b) => a - b)
  for (const level of sortedLevels) {
    result.push({ level, households: levelHouseholds.get(level)! })
  }
  return result
}

/* ── Re-export 焦點視圖（細步 4g）── */
export type { FocusView, FocusLayer } from './focus-view'
export { buildFocusView } from './focus-view'
