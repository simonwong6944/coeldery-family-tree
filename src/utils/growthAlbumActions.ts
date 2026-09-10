/**
 * growthAlbumActions — 成長相簿共用動作（上傳 / 編輯）
 * 供 GrowthAlbumPage 與 GrowthAlbumSection 共用，避免重複並令頁面 ≤200 行。
 * 上傳走 rules §9（Cloudinary 簽名上載成功才寫 DB）。
 */
import {
  uploadPhotoToCloudinary, uploadVideoToCloudinary, readVideoDuration,
  MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS,
} from './cloudinaryUpload'

type TFn = (key: string) => string

export interface AlbumItemLike {
  id: string
  media_kind: string
  caption: string | null
  year: number
  month: number
}

/** 編輯項目（說明／年月）；回傳是否成功 */
export async function editAlbumItem(t: TFn, it: AlbumItemLike): Promise<boolean> {
  const cap = window.prompt(t('growth_album.edit_caption'), it.caption ?? '')
  if (cap === null) return false
  const ym = window.prompt(t('growth_album.edit_month'), `${it.year}-${String(it.month).padStart(2, '0')}`)
  const payload: Record<string, unknown> = { caption: cap }
  if (ym) {
    const [y, m] = ym.split('-').map(Number)
    if (y && m >= 1 && m <= 12) { payload.year = y; payload.month = m }
  }
  const res = await fetch(`/api/growth-album/${it.id}`, {
    method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.ok
}

export interface UploadOutcome { ok: boolean; error?: string }

/** 上傳相片／短片並寫入相簿；回傳 { ok, error } */
export async function uploadAlbumMedia(
  t: TFn,
  args: { memberId: string; file: File; year: number; month: number },
): Promise<UploadOutcome> {
  const { memberId, file, year, month } = args
  const isVideo = file.type.startsWith('video/')
  if (!isVideo && !file.type.startsWith('image/')) return { ok: false, error: t('growth_album.err_not_media') }
  if (isVideo  && file.size > MAX_VIDEO_BYTES)     return { ok: false, error: t('b4.compose_err_too_large') }
  if (!isVideo && file.size > MAX_PHOTO_BYTES)     return { ok: false, error: t('b4.compose_err_too_large') }
  if (isVideo) {
    const dur = await readVideoDuration(file)
    if (dur != null && dur > MAX_VIDEO_SECONDS) return { ok: false, error: t('growth_album.video_too_long') }
  }
  try {
    const payload: Record<string, unknown> = { subject_member_id: memberId, year, month }
    if (isVideo) {
      const v = await uploadVideoToCloudinary(file)
      if (v.durationSeconds > MAX_VIDEO_SECONDS) return { ok: false, error: t('growth_album.video_too_long') }
      payload.media_kind = 'video'
      payload.url = v.url
      payload.poster_url = v.posterUrl
      payload.duration_seconds = v.durationSeconds
    } else {
      payload.media_kind = 'photo'
      payload.url = await uploadPhotoToCloudinary(file)
    }
    const res = await fetch('/api/growth-album', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await res.json() as { ok: boolean; error?: string }
    if (!d.ok) return { ok: false, error: d.error ?? t('growth_album.upload_failed') }
    return { ok: true }
  } catch {
    return { ok: false, error: t('growth_album.upload_failed') }
  }
}
