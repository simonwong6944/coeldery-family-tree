/**
 * relationMapping — 關係 UI key → 後端 relation_key 映射
 * 共用於 B3AddMember 及 MemberAddRelPanel，避免重複定義。
 */

export const RELATION_OPTIONS = [
  'relation_father',
  'relation_mother',
  'relation_son',
  'relation_daughter',
  'relation_spouse',
  'relation_sibling',
  'relation_grandchild',
  'relation_other',
] as const

export type RelationUiKey = typeof RELATION_OPTIONS[number]

/** UI key → 後端 relation_key（RELATION_TO_EDGE 方向邏輯不變） */
export const UI_TO_BACKEND: Record<RelationUiKey, string> = {
  relation_father:     'relation_parent',
  relation_mother:     'relation_parent',
  relation_son:        'relation_child',
  relation_daughter:   'relation_child',
  relation_spouse:     'relation_spouse',
  relation_sibling:    'relation_sibling',
  relation_grandchild: 'relation_grandchild',
  relation_other:      'relation_other',
}

/** MemberAddRelPanel 用的 5 個選項（父親/母親/兒子/女兒/配偶） */
export const PANEL_RELATION_OPTIONS = [
  'relation_father',
  'relation_mother',
  'relation_son',
  'relation_daughter',
  'relation_spouse',
] as const satisfies readonly RelationUiKey[]
