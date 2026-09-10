/**
 * _params — 業務規則數字集中處（rules §5：數字不可 hardcode 於各 endpoint）
 *
 * v1 以集中常數代替「後台／參數設定」；將來改為 DB 設定表時，只需改此檔。
 * 任何 endpoint 需要配額／上限數字，一律由此 import。
 */

export const QUOTA = {
  /** 每位成員（每棵所屬樹）每月「相片」顯示位 */
  photoPerMonth: 5,
  /** 每位成員（每棵所屬樹）每月「短片」顯示位 */
  videoPerMonth: 2,
  /** 短片長度上限（秒） */
  maxVideoSeconds: 90,
} as const
