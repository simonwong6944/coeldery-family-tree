/**
 * gatherScenes — 家庭聚會「場合 → 商戶」過濾（純函式，可獨立測試）
 * 規格：.coappery/family_gather.md §1–4、§7；rules 第 23 條（忌辰／莊重場合零廣告硬攔截）
 * 不依賴 React／DOM（除 gatherSceneFromHash 讀 hash 參數），方便 node 直接測試。
 */

export type GatherScene = 'all' | 'birthday' | 'anniversary' | 'festival' | 'memorial'

export const GATHER_SCENES: GatherScene[] = ['all', 'birthday', 'anniversary', 'festival', 'memorial']

export interface GatherMerchant {
  id: string
  name: string
  ad_tier: number
  phone: string | null
  whatsapp: string | null
  map_url: string | null
  photo_url: string | null
  description: string | null
  address: string | null
  category_id: string | null
  category_name: string | null
  tags?: { id: string; name: string }[]
}

/* 場合 → 商戶主分類（§3.2）。忌辰除「禮品與花藝」外，亦納入「殯儀與身後事」（拜祭相關）。 */
export const SCENE_CATS: Record<GatherScene, string[] | null> = {
  all:         null,
  birthday:    ['cat-food', 'cat-gift'],
  anniversary: ['cat-food', 'cat-gift'],
  festival:    ['cat-food', 'cat-gift'],
  memorial:    ['cat-gift', 'cat-funeral'],
}

/* 次要匹配：分類粒度粗，故同時以商戶標籤補足（標籤由平台策展）。 */
export const SCENE_TAGS: Record<GatherScene, string[]> = {
  all:         [],
  birthday:    ['蛋糕', '餐廳', '茶餐廳', '到會', '自助餐', '禮品', '鮮花', '花店'],
  anniversary: ['餐廳', '酒店', '禮品', '鮮花', '花店'],
  festival:    ['餐廳', '茶餐廳', '糕點', '年貨', '禮品', '鮮花', '花店'],
  memorial:    ['拜祭', '殯儀', '鮮花', '花店', '花籃'],
}

/** 是否莊重場合（忌辰）→ 需套用零廣告硬攔截 */
export function isMemorialScene(scene: GatherScene): boolean {
  return scene === 'memorial'
}

/** 該商戶是否屬此場合（分類相符，或標籤含場合關鍵字） */
export function matchScene(m: GatherMerchant, scene: GatherScene): boolean {
  const cats = SCENE_CATS[scene]
  if (cats === null) return true
  if (m.category_id !== null && cats.includes(m.category_id)) return true
  const keywords = SCENE_TAGS[scene]
  return (m.tags ?? []).some(t => keywords.some(k => t.name.includes(k)))
}

/**
 * 場合過濾。忌辰（莊重場合）**先**排除一切付費／贊助商戶（ad_tier > 0），
 * 只保留自然排序結果 —— 此為 rules 第 23 條不可繞過之硬攔截。
 */
export function filterMerchants(all: GatherMerchant[], scene: GatherScene): GatherMerchant[] {
  return all
    .filter(m => matchScene(m, scene))
    .filter(m => (isMemorialScene(scene) ? m.ad_tier === 0 : true))
}

/** 由 location.hash 讀取場合（例：'#/family-gather?scene=memorial'），無效值一律回 'all' */
export function gatherSceneFromHash(hash: string): GatherScene {
  const m = /scene=([a-z]+)/.exec(hash)
  const s = (m?.[1] ?? 'all') as GatherScene
  return GATHER_SCENES.includes(s) ? s : 'all'
}
