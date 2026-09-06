/**
 * AvatarSection — 成員頭像顯示 + 上載
 * 供 MemberDetail.tsx 使用。
 *
 * 上載流程（與 FamilyFeed 完全一致）：
 *   1. 前端驗證：格式 image/*、大小 ≤5MB
 *   2. POST /api/cloudinary-sign → 取簽名
 *   3. POST https://api.cloudinary.com/v1_1/{cloudName}/image/upload（5 個 field）
 *   4. PATCH /api/members/:id { avatar_url: secure_url }
 *   5. 成功後呼叫 onSuccess() 讓父層 refetch tree
 *
 * 規格：
 *   - 長者友善：熱區 ≥44px，掣必配文字
 *   - 全 i18n via t('member_detail.*')
 *   - inline CSSProperties + var(--color-*) token
 *   - 失敗顯示 i18n 錯誤，不崩頁
 */

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

/* ─── Cloudinary 型別（與 FamilyFeed 一致）─── */
interface SignResponse {
  ok:         boolean
  signature?: string
  timestamp?: number
  apiKey?:    string
  cloudName?: string
  folder?:    string
  error?:     string
}
interface CloudinaryUploadResponse { secure_url: string }

/* ─── Cloudinary 上載（與 FamilyFeed 完全相同的 5-field 邏輯）─── */
async function uploadToCloudinary(
  file: File,
  sign: Required<Omit<SignResponse, 'ok' | 'error'>>
): Promise<string> {
  const fd = new FormData()
  fd.append('file',      file)
  fd.append('api_key',   sign.apiKey)
  fd.append('timestamp', String(sign.timestamp))
  fd.append('signature', sign.signature)
  fd.append('folder',    sign.folder)
  // ⚠️ 不加 upload_preset / tags / transformation，否則 signature mismatch

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    { method: 'POST', body: fd }
  )
  if (!res.ok) throw new Error('cloudinary_upload_failed')
  const data = await res.json() as CloudinaryUploadResponse
  return data.secure_url
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024  // 5 MB（與 FamilyFeed 一致）

/* ─── Props ─── */
interface Props {
  memberId:  string
  memberName: string
  avatarUrl: string | null
  onSuccess: () => void    // 成功後父層 refetch
}

export default function AvatarSection({ memberId, memberName, avatarUrl, onSuccess }: Props) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [errMsg,    setErrMsg]    = useState('')

  /* ─── DiceBear 預設頭像（成員姓名 seed，與 FamilyFeed PostCard 一致）─── */
  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberName)}`
  const displayUrl    = avatarUrl || defaultAvatar

  /* ─── 觸發隱藏 file input ─── */
  function handleClickUpload() {
    setErrMsg('')
    fileInputRef.current?.click()
  }

  /* ─── 選擇檔案後執行整個上載流程 ─── */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrMsg('')
    const file = e.target.files?.[0] ?? null
    if (!file) return

    // 前端驗證：格式
    if (!file.type.startsWith('image/')) {
      setErrMsg(t('b4.compose_err_not_image'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    // 前端驗證：大小
    if (file.size > MAX_PHOTO_BYTES) {
      setErrMsg(t('b4.compose_err_too_large'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      // Step 1：攞後端 Cloudinary 簽名
      const signRes  = await fetch('/api/cloudinary-sign', { method: 'POST' })
      const signData = await signRes.json() as SignResponse
      if (
        !signData.ok    || !signData.signature || !signData.timestamp ||
        !signData.apiKey || !signData.cloudName || !signData.folder
      ) {
        setErrMsg(t('b4.compose_err_sign_fail'))
        return
      }

      // Step 2：直接上載至 Cloudinary（5 個 field，與 FamilyFeed 完全一致）
      let secureUrl: string
      try {
        secureUrl = await uploadToCloudinary(file, {
          signature: signData.signature,
          timestamp: signData.timestamp,
          apiKey:    signData.apiKey,
          cloudName: signData.cloudName,
          folder:    signData.folder,
        })
      } catch {
        setErrMsg(t('member_detail.avatar_error'))
        return
      }

      // Step 3：PATCH /api/members/:id { avatar_url }
      const patchRes  = await fetch(`/api/members/${memberId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ avatar_url: secureUrl }),
      })
      const patchData = await patchRes.json() as { ok: boolean; error?: string }
      if (!patchData.ok) {
        setErrMsg(t('member_detail.avatar_error'))
        return
      }

      // Step 4：通知父層 refetch（即時更新顯示）
      onSuccess()
    } catch {
      setErrMsg(t('member_detail.avatar_error'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  /* ─── Render ─── */
  return (
    <div
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '16px',
        marginBottom:   '16px',
        flexWrap:       'wrap',
      }}
    >
      {/* 頭像圖片 */}
      <img
        src={displayUrl}
        alt={memberName}
        width={80}
        height={80}
        style={{
          width:        '80px',
          height:       '80px',
          borderRadius: '50%',
          objectFit:    'cover',
          border:       '2px solid var(--color-border)',
          flexShrink:   0,
          backgroundColor: 'var(--color-bg)',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* 隱藏 file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={uploading}
        />

        {/* 上載掣（icon + 文字，熱區 ≥44px）*/}
        <button
          onClick={handleClickUpload}
          disabled={uploading}
          style={{
            minHeight:       '44px',
            padding:         '0 18px',
            borderRadius:    '22px',
            fontSize:        '15px',
            fontFamily:      'inherit',
            cursor:          uploading ? 'not-allowed' : 'pointer',
            border:          '1.5px solid var(--color-primary)',
            backgroundColor: 'transparent',
            color:           'var(--color-primary)',
            display:         'flex',
            alignItems:      'center',
            gap:             '6px',
            opacity:         uploading ? 0.6 : 1,
            whiteSpace:      'nowrap',
          }}
        >
          📷 {uploading ? t('member_detail.avatar_uploading') : t('member_detail.avatar_upload')}
        </button>

        {/* 錯誤訊息 */}
        {errMsg && (
          <p style={{
            margin:   0,
            fontSize: '13px',
            color:    'var(--color-danger, #dc2626)',
            maxWidth: '220px',
          }}>
            {errMsg}
          </p>
        )}
      </div>
    </div>
  )
}
