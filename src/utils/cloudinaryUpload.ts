/**
 * cloudinaryUpload — Cloudinary 簽名上載共用 helper（相片 + 短片）
 *
 * 流程（依 rules §9 上傳狀態機）：
 *   1. POST /api/cloudinary-sign 攞簽名
 *   2. POST https://api.cloudinary.com/v1_1/{cloudName}/image|video/upload（5 field）
 *   3. 回 secure_url（成功先可以寫 DB）
 *
 * ⚠️ 不加 upload_preset / tags / transformation，否則簽名不符。
 */

interface SignFields {
  signature: string
  timestamp: number
  apiKey: string
  cloudName: string
  folder: string
}

interface SignResponse extends Partial<SignFields> {
  ok: boolean
  error?: string
}

/** 相片大小上限（與 FamilyFeed / AvatarSection 一致）*/
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
/** 短片大小上限（暫定 100MB）*/
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
/** 短片長度上限（秒；與後端 _params.ts 一致）*/
export const MAX_VIDEO_SECONDS = 90

async function fetchSign(): Promise<SignFields> {
  const res  = await fetch('/api/cloudinary-sign', { method: 'POST', credentials: 'include' })
  const sign = await res.json() as SignResponse
  if (!sign.ok || !sign.signature || !sign.timestamp || !sign.apiKey || !sign.cloudName || !sign.folder) {
    throw new Error('sign_failed')
  }
  return {
    signature: sign.signature, timestamp: sign.timestamp,
    apiKey: sign.apiKey, cloudName: sign.cloudName, folder: sign.folder,
  }
}

function buildForm(file: File, s: SignFields): FormData {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', s.apiKey)
  fd.append('timestamp', String(s.timestamp))
  fd.append('signature', s.signature)
  fd.append('folder', s.folder)
  return fd
}

export async function uploadPhotoToCloudinary(file: File): Promise<string> {
  const s = await fetchSign()
  const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: 'POST', body: buildForm(file, s) })
  if (!res.ok) throw new Error('upload_failed')
  const data = await res.json() as { secure_url: string }
  return data.secure_url
}

/** 讀取本機影片長度（秒）；失敗回 null */
export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? v.duration : null) }
    v.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    v.src = url
  })
}

export interface VideoUploadResult {
  url: string
  /** 封面圖（Cloudinary 由影片推導嘅 .jpg）；冇就 null */
  posterUrl: string | null
  durationSeconds: number
}

export async function uploadVideoToCloudinary(file: File): Promise<VideoUploadResult> {
  const s = await fetchSign()
  const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/video/upload`, { method: 'POST', body: buildForm(file, s) })
  if (!res.ok) throw new Error('upload_failed')
  const data = await res.json() as { secure_url: string; duration?: number }
  const posterUrl = data.secure_url.replace(/\.[a-z0-9]+$/i, '.jpg')
  return {
    url: data.secure_url,
    posterUrl,
    durationSeconds: Math.round(data.duration ?? 0),
  }
}

