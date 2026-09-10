/**
 * cloudinaryUpload — Cloudinary 簽名上載共用 helper
 *
 * 流程（依 rules §9 上傳狀態機）：
 *   1. POST /api/cloudinary-sign 攞簽名
 *   2. POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload（5 field）
 *   3. 回 secure_url（成功先可以寫 DB）
 *
 * ⚠️ 不加 upload_preset / tags / transformation，否則簽名不符。
 */

interface SignResponse {
  ok: boolean
  signature?: string
  timestamp?: number
  apiKey?: string
  cloudName?: string
  folder?: string
  error?: string
}

/** 相片大小上限（與 FamilyFeed / AvatarSection 一致）*/
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export async function uploadPhotoToCloudinary(file: File): Promise<string> {
  const signRes = await fetch('/api/cloudinary-sign', { method: 'POST', credentials: 'include' })
  const sign = await signRes.json() as SignResponse
  if (!sign.ok || !sign.signature || !sign.timestamp || !sign.apiKey || !sign.cloudName || !sign.folder) {
    throw new Error('sign_failed')
  }

  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', sign.apiKey)
  fd.append('timestamp', String(sign.timestamp))
  fd.append('signature', sign.signature)
  fd.append('folder', sign.folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('upload_failed')
  const data = await res.json() as { secure_url: string }
  return data.secure_url
}
