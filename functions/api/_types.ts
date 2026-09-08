/**
 * Cloudflare Pages Functions — 共用型別
 * binding: DB (D1Database)
 * secret:  CLOUDINARY_API_SECRET（由產品負責人 wrangler pages secret put 設定）
 * secret:  FAMILY_TREE_API_KEY  （由產品負責人 wrangler pages secret put 設定；
 *                                 用於向 85AI 代理發出 Bearer 認證；
 *                                 絕不可出現在前端 / repo 明文 / response body）
 */
export interface Env {
  DB: D1Database
  CLOUDINARY_API_SECRET?: string
  FAMILY_TREE_API_KEY?:   string
}
