/**
 * Cloudflare Pages Functions — 共用型別
 * binding: DB (D1Database)
 * secret:  CLOUDINARY_API_SECRET（由產品負責人 wrangler pages secret put 設定）
 */
export interface Env {
  DB: D1Database
  CLOUDINARY_API_SECRET?: string
}
