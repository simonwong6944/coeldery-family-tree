/**
 * POST /api/cloudinary-sign — 產生 Cloudinary Signed Upload 所需簽名
 *
 * ⚠️  API Secret 絕對唔可以寫入本檔、唔可以 commit、唔可以出現喺回應。
 *     只透過 env.CLOUDINARY_API_SECRET 讀取（由產品負責人 wrangler pages secret put 設定）。
 *
 * 簽名規則（Cloudinary 官方 signed upload）：
 *   1. 收集要簽嘅參數：folder + timestamp（Unix 秒，10 位）
 *   2. 按 key 字母序排列：folder=...&timestamp=...
 *   3. 尾接 API Secret（直接拼，唔加 &）：folder=...&timestamp=...<secret>
 *   4. 對以上字串做 SHA-1（Web Crypto API，無額外 npm 套件）
 *   5. 轉 hex string 作為 signature
 *
 * 回應（只含公開值）：
 *   { signature, timestamp, apiKey, cloudName, folder }
 *
 * 錯誤：
 *   503  若 env.CLOUDINARY_API_SECRET 未設定
 *
 * Cloudflare Pages Function — edge runtime
 * binding: CLOUDINARY_API_SECRET (secret)
 */

import type { Env } from './_types'

/* ── Cloudinary 公開設定（集中一處，cloud name / api key / folder 非敏感）── */
const CLOUDINARY_CONFIG = {
  cloudName: 'ex2zrh2h',
  apiKey:    '881282661643775',
  folder:    'family-feed',
} as const

/**
 * 用 Web Crypto API 計算 SHA-1，回傳 lowercase hex string。
 * Cloudflare Workers 全局有 crypto.subtle，唔需要 import。
 */
async function sha1Hex(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data    = encoder.encode(message)
  const hashBuf = await crypto.subtle.digest('SHA-1', data)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  // 1. 確認 secret 已設定（唔出現喺回應，只用作簽名）
  const apiSecret = ctx.env.CLOUDINARY_API_SECRET
  if (!apiSecret) {
    return Response.json(
      { ok: false, error: '相片服務未設定，請聯絡管理員' },
      { status: 503 }
    )
  }

  // 2. 產生 timestamp（Unix 秒，10 位整數）
  const timestamp = Math.floor(Date.now() / 1000)

  // 3. 拼簽名字串：參數按 key 字母序排列，尾接 API Secret
  //    簽名參數：folder, timestamp（按字母序：f < t）
  //    格式：folder=<folder>&timestamp=<timestamp><apiSecret>
  const paramsToSign: Record<string, string | number> = {
    folder:    CLOUDINARY_CONFIG.folder,
    timestamp: timestamp,
  }

  // 按字母序排列 key，砌成 key=value&key=value 字串
  const signatureBase = Object.keys(paramsToSign)
    .sort()
    .map(k => `${k}=${paramsToSign[k]}`)
    .join('&')
  // 尾接 API Secret（官方規則：直接拼，唔加 &）
  const stringToSign = signatureBase + apiSecret

  // 4. SHA-1
  const signature = await sha1Hex(stringToSign)

  // 5. 回應（只含公開值，API Secret 絕對唔出現喺此）
  return Response.json({
    ok:        true,
    signature,
    timestamp,
    apiKey:    CLOUDINARY_CONFIG.apiKey,
    cloudName: CLOUDINARY_CONFIG.cloudName,
    folder:    CLOUDINARY_CONFIG.folder,
  })
}
