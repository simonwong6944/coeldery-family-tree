/**
 * FamilyFeed — 家庭圈動態 feed（B4 + B5 提醒卡 + B4 推薦卡）
 * 規格：.coappery/design/B4_family_feed.md + B5_reminder_cards.md
 * v2.6.0：「送上祝福」改為預填 compose sheet，送出成功後才防重複（blessingContext）
 * v2.7.0：相片全屏 lightbox（撳相片放大，可關）
 * v2.8.0：貼文 / 留言削除（前端）— 接駁 DELETE /api/posts/:id 及 DELETE /api/posts/:id/comments
 *         Plan B：削除掣一律顯示，後端回 403 時顯示禁止提示（無 /api/me）
 * v2.4.0：提醒卡改為摘要橫幅（可展開/收合）；修正 b5 口語字
 * v2.3.0：貼文 / 留言作者頭像接真相（author_avatar_url），fallback DiceBear
 *          avatarFor() helper 單一來源，所有頭像 URL 經此產生
 * v2.2.0：提醒卡接真 API（GET /api/reminders），parallel fetch，獨立 error
 *          Compose 加相片上載（Cloudinary signed upload）
 *          PostCard photo_url 空時唔 render 相片位（UI 清理）
 *          B5 彈出卡 / 推薦卡 mock 保留不動
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import PostCard from '../../packages/post-card'
import type { CommentItem } from '../../packages/post-card'
import ReminderCard from '../../packages/reminder-card'
import ReminderModal from '../../packages/reminder-modal'
import RecommendationCard from '../../packages/recommendation-card'
import { isRecoDismissed, dismissReco } from '../utils/feedRepository'

/* ── API 回應型別 ── */
interface ApiComment {
  id: string; author_member_id: string; author_name: string
  author_avatar_url: string | null
  body: string; created_at: string
}
interface ApiPost {
  id: string; family_id: string; author_member_id: string; author_name: string
  author_avatar_url: string | null
  body_text: string | null; photo_url: string | null; created_at: string
  comments: ApiComment[]; like_count: number; isLikedByMe: boolean
}
interface SignResponse {
  ok: boolean; signature?: string; timestamp?: number
  apiKey?: string; cloudName?: string; folder?: string; error?: string
}
interface CloudinaryUploadResponse { secure_url: string }

/* ── Reminders API 回應型別 ── */
interface ReminderItem {
  member_id:    string
  display_name: string
  type:         'birthday' | 'memorial' | 'custom' | 'festival'
  source:       'member' | 'family' | 'system'
  date:         string          // YYYY-MM-DD
  days_until:   number
  age:          number | null
  gender:       string | null
}

/* ── Cloudinary signed upload（只帶 B1 簽名覆蓋嘅 5 個 field）── */
async function uploadToCloudinary(file: File, sign: Required<Omit<SignResponse, 'ok' | 'error'>>): Promise<string> {
  const fd = new FormData()
  fd.append('file',      file)
  fd.append('api_key',   sign.apiKey)
  fd.append('timestamp', String(sign.timestamp))
  fd.append('signature', sign.signature)
  fd.append('folder',    sign.folder)
  // ⚠️ 絕對唔加 upload_preset / tags / transformation 等，否則 signature mismatch

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
    { method: 'POST', body: fd }
  )
  if (!res.ok) throw new Error('cloudinary_upload_failed')
  const data = await res.json() as CloudinaryUploadResponse
  return data.secure_url
}

/* ── 頭像 URL helper：真相優先，無相 fallback DiceBear initials ── */
function avatarFor(name: string, url: string | null | undefined): string {
  return (url && url.trim())
    ? url
    : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
}

/* ── PostCard 橋接 ── */
function toCommentItems(comments: ApiComment[]): CommentItem[] {
  return comments.map(c => ({
    id:        c.id,
    name:      c.author_name,
    avatarUrl: avatarFor(c.author_name, c.author_avatar_url),
    body:      c.body,
    canDelete: true,   // Plan B: 一律顯示，403 由後端判斷
  }))
}
function toLikers(likeCount: number): string[] {
  return Array.from({ length: likeCount }, (_, i) => String(i))
}

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
}
const RECO_ID = 'reco-family-gathering-v1'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024  // 5 MB

/* ── Compose sheet 樣式 ── */
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200,
  display: 'flex', alignItems: 'flex-end',
}
const sheetStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--color-card)', borderRadius: '20px 20px 0 0',
  padding: '20px 20px 36px', boxSizing: 'border-box', display: 'flex',
  flexDirection: 'column', gap: '12px',
}

/* ──────────────────────────────────────────────────────────── */

export default function FamilyFeed() {
  const { t } = useTranslation()

  /* ── Lightbox ── */
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  /* ── 削除提示（失敗 / 403）── */
  const [deleteErrMsg, setDeleteErrMsg] = useState('')

  /* ── 貼文狀態 ── */
  const [posts,     setPosts]     = useState<ApiPost[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg,  setErrorMsg]  = useState('')

  /* ── Compose sheet ── */
  const [composeOpen,    setComposeOpen]    = useState(false)
  const [composeDraft,   setComposeDraft]   = useState('')
  const [composePhoto,   setComposePhoto]   = useState<File | null>(null)
  const [composeErr,     setComposeErr]     = useState('')
  const [composeLoading, setComposeLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── 提醒卡（真 API）── */
  const [reminders,         setReminders]         = useState<ReminderItem[]>([])
  const [remindersExpanded, setRemindersExpanded] = useState(false)
  // 已送祝福的 reminder key Set：防重複撳、成功後 disable
  const [blessedSet,      setBlessedSet]      = useState<Set<string>>(new Set())
  // 記住「呢次 compose 係為邊個 reminder 送祝福」；取消時清 null；送出成功後才 mark blessedSet
  const [blessingContext, setBlessingContext] = useState<{ key: string } | null>(null)

  /* ── 送上祝福 handler：打開 compose sheet 並預填賀文 ── */
  const handleBlessing = (r: ReminderItem) => {
    const key = `${r.member_id}-${r.type}`
    if (blessedSet.has(key)) return

    // 賀文：從 type 擇擰對應正式書面繁中文字句
    let bodyText: string
    if (r.type === 'birthday') {
      bodyText = t('b5.blessing_birthday', { name: r.display_name })
    } else if (r.type === 'memorial') {
      bodyText = t('b5.blessing_memorial', { name: r.display_name })
    } else {
      // custom / festival 暫不處理，靜默跳過
      return
    }

    // 先 reset（清 photo / err / loading），再 set 草稿（避免被 reset 清走）
    resetCompose()
    setComposeDraft(bodyText)
    // 記住呢次 compose 係為邊個 reminder 觸發，送出成功後才 mark blessedSet
    setBlessingContext({ key })
    setComposeOpen(true)
  }

  /* ── B5 mock（保留不動）── */
  const [modalOpen,     setModalOpen]     = useState(false)
  const [recoDismissed, setRecoDismissed] = useState(() => isRecoDismissed(RECO_ID))

  const handleTabChange   = (tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }
  const handleDismissReco = () => { dismissReco(RECO_ID); setRecoDismissed(true) }

  /* ── 重設 compose ── */
  const resetCompose = () => {
    setComposeDraft(''); setComposePhoto(null)
    setComposeErr('');   setComposeLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* ── i18n helpers：提醒卡標題 / 副標題 ── */
  const getReminderTitle = (item: ReminderItem): string => {
    const name = item.display_name
    if (item.type === 'memorial') {
      if (item.days_until === 0) return t('b5.memorial_today',    { name })
      if (item.days_until === 1) return t('b5.memorial_tomorrow', { name })
      return t('b5.memorial_in_n', { name, count: item.days_until })
    }
    // birthday（及其他 type 暫以 birthday 格式處理）
    if (item.days_until === 0) return t('b5.birthday_today',    { name })
    if (item.days_until === 1) return t('b5.birthday_tomorrow', { name })
    return t('b5.birthday_in_n', { name, count: item.days_until })
  }

  const getReminderSubtitle = (item: ReminderItem): string => {
    // date 格式 YYYY-MM-DD，拆月日
    const parts = item.date.split('-')
    const month = parseInt(parts[1] ?? '0', 10)
    const day   = parseInt(parts[2] ?? '0', 10)
    if (item.type === 'memorial') {
      return item.age != null
        ? t('b5.memorial_subtitle',        { month, day, age: item.age })
        : t('b5.memorial_subtitle_no_age', { month, day })
    }
    return item.age != null
      ? t('b5.birthday_subtitle',        { month, day, age: item.age })
      : t('b5.birthday_subtitle_no_age', { month, day })
  }

  /* ── 載入貼文 + 提醒（parallel，獨立 error 處理）── */
  const loadPosts = useCallback(async () => {
    setLoadState('loading'); setErrorMsg('')

    // Reminders：獨立 fetch，失敗只靜默清空，不阻塞貼文
    const remindersPromise = fetch('/api/reminders')
      .then(r => r.json() as Promise<{ ok: boolean; reminders?: ReminderItem[] }>)
      .then(d => d.ok ? (d.reminders ?? []) : [])
      .catch(() => [] as ReminderItem[])

    // Posts：主流程，失敗進入 error state
    const postsPromise = fetch('/api/posts')
      .then(async r => {
        const data = await r.json() as { ok: boolean; posts?: ApiPost[]; error?: string }
        if (!data.ok) {
          throw Object.assign(
            new Error(data.error ?? t('b4.error_generic')),
            { status: r.status }
          )
        }
        return data.posts ?? []
      })

    // 同時發出兩個請求
    const [reminderResult, postsResult] = await Promise.allSettled([
      remindersPromise,
      postsPromise,
    ])

    // 處理 reminders（失敗 = 空 array，貼文不受影響）
    setReminders(
      reminderResult.status === 'fulfilled' ? reminderResult.value : []
    )

    // 處理 posts
    if (postsResult.status === 'fulfilled') {
      setPosts(postsResult.value); setLoadState('ok')
    } else {
      const err = postsResult.reason as (Error & { status?: number })
      setErrorMsg(err.status === 409 ? t('b4.error_no_self') : (err.message || t('b4.error_generic')))
      setLoadState('error')
    }
  }, [t])

  useEffect(() => { loadPosts() }, [loadPosts])

  /* ── 貼文削除 ── */
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm(t('b4.delete_post_confirm'))) return
    setDeleteErrMsg('')
    try {
      const res  = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.status === 403) { setDeleteErrMsg(t('b4.delete_forbidden')); return }
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) { setDeleteErrMsg(t('b4.delete_failed')); return }
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch {
      setDeleteErrMsg(t('b4.delete_failed'))
    }
  }

  /* ── 留言削除 ── */
  const handleDeleteComment = async (post: ApiPost, commentId: string) => {
    if (!window.confirm(t('b4.delete_comment_confirm'))) return
    setDeleteErrMsg('')
    try {
      const res  = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ comment_id: commentId }),
      })
      if (res.status === 403) { setDeleteErrMsg(t('b4.delete_forbidden')); return }
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) { setDeleteErrMsg(t('b4.delete_failed')); return }
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : {
          ...p,
          comments: p.comments.filter(c => c.id !== commentId),
        }
      ))
    } catch {
      setDeleteErrMsg(t('b4.delete_failed'))
    }
  }

  /* ── 讚好 toggle ── */
  const handleToggleLike = async (post: ApiPost) => {
    const method = post.isLikedByMe ? 'DELETE' : 'POST'
    try {
      const res  = await fetch(`/api/posts/${post.id}/like`, { method })
      const data = await res.json() as { ok: boolean; like_count?: number; isLikedByMe?: boolean }
      if (!data.ok) return
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : {
          ...p,
          like_count:  data.like_count  ?? p.like_count,
          isLikedByMe: data.isLikedByMe ?? !p.isLikedByMe,
        }
      ))
    } catch { /* 靜默 */ }
  }

  /* ── 新增留言 ── */
  const handleAddComment = async (post: ApiPost, body: string) => {
    if (!body.trim()) return
    try {
      const res  = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ body: body.trim() }),
      })
      const data = await res.json() as {
        ok: boolean
        comment?: { id: string; author_name: string; body: string; created_at: string; author_member_id: string; author_avatar_url?: string | null }
      }
      if (!data.ok || !data.comment) return
      const c = data.comment
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : {
          ...p,
          comments: [...p.comments, {
            id: c.id, author_member_id: c.author_member_id,
            author_name: c.author_name, author_avatar_url: c.author_avatar_url ?? null,
            body: c.body, created_at: c.created_at,
          }],
        }
      ))
    } catch { /* 靜默 */ }
  }

  /* ── 揀相片（前端驗證）── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComposeErr('')
    const file = e.target.files?.[0] ?? null
    if (!file) { setComposePhoto(null); return }
    if (!file.type.startsWith('image/')) {
      setComposeErr(t('b4.compose_err_not_image'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setComposeErr(t('b4.compose_err_too_large'))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setComposePhoto(file)
  }

  /* ── 新增貼文（含相片上載流程）── */
  const handleComposeSubmit = async () => {
    const text = composeDraft.trim()

    // 至少文字或相片其一
    if (!text && !composePhoto) { setComposeErr(t('b4.compose_both_empty')); return }

    setComposeErr(''); setComposeLoading(true)
    try {
      let photoUrl: string | null = null

      if (composePhoto) {
        // Step 1：攞後端簽名
        const signRes  = await fetch('/api/cloudinary-sign', { method: 'POST' })
        const signData = await signRes.json() as SignResponse
        if (!signData.ok || !signData.signature || !signData.timestamp ||
            !signData.apiKey || !signData.cloudName || !signData.folder) {
          setComposeErr(t('b4.compose_err_sign_fail')); return
        }

        // Step 2：直接 POST 去 Cloudinary（只帶 B1 簽名嘅 5 個 field）
        try {
          photoUrl = await uploadToCloudinary(composePhoto, {
            signature: signData.signature, timestamp: signData.timestamp,
            apiKey: signData.apiKey, cloudName: signData.cloudName, folder: signData.folder,
          })
        } catch {
          setComposeErr(t('b4.compose_err_upload_fail')); return
        }
      }

      // Step 3：POST /api/posts { body_text, photo_url }
      const res  = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ body_text: text || null, photo_url: photoUrl }),
      })
      const data = await res.json() as { ok: boolean; post?: ApiPost; error?: string }
      if (!data.ok || !data.post) {
        setComposeErr(data.error ?? t('b4.error_generic')); return
      }
      setPosts(prev => [data.post!, ...prev])
      // 若係透過「送上祝福」觸發嘅 compose，送出成功後才標記為已送（防重複）
      if (blessingContext !== null) {
        setBlessedSet(prev => new Set(prev).add(blessingContext.key))
        setBlessingContext(null)
      }
      resetCompose(); setComposeOpen(false)
    } catch {
      setComposeErr(t('b4.error_generic'))
    } finally {
      setComposeLoading(false)
    }
  }

  /* ── 渲染單則貼文 ── */
  const renderPost = (p: ApiPost) => (
    <PostCard
      key={p.id}
      postId={p.id}
      authorName={p.author_name}
      authorAvatarUrl={avatarFor(p.author_name, p.author_avatar_url)}
      timeText={p.created_at.slice(0, 10)}
      aboutText=""
      photoUrl={p.photo_url ?? ''}
      photoAlt={t('b4.post_img_alt', { name: p.author_name })}
      bodyText={p.body_text ?? ''}
      likers={toLikers(p.like_count)}
      comments={toCommentItems(p.comments)}
      isLiked={p.isLikedByMe}
      onToggleLike={() => handleToggleLike(p)}
      onAddComment={(body) => handleAddComment(p, body)}
      onPhotoClick={p.photo_url ? () => setLightboxUrl(p.photo_url) : undefined}
      canDelete={true}
      onDelete={() => handleDeletePost(p.id)}
      onDeleteComment={(commentId) => handleDeleteComment(p, commentId)}
    />
  )

  /* ── 全屏 Lightbox overlay ── */
  const renderLightbox = () => (
    // 麮色半透明底幕（overlay 慣例用黑色，升 z-index 高於 compose sheet 200 及 tab bar）
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('b4.photo_close')}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      // 點擊遂幕背景關閉
      onClick={() => setLightboxUrl(null)}
    >
      {/* 關閉援（右上角，熱區 ≥44px）*/}
      <button
        type="button"
        aria-label={t('b4.photo_close')}
        onClick={() => setLightboxUrl(null)}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          minWidth: '44px', minHeight: '44px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', border: '1.5px solid rgba(255,255,255,0.35)',
          borderRadius: '50%', cursor: 'pointer',
          color: '#fff', fontSize: '22px', lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* 大相本體（點擊相片本體不關閉，避免誤觸）*/}
      {lightboxUrl && (
        <img
          src={lightboxUrl}
          alt={t('b4.post_img_alt', { name: '' }).trim()}
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', display: 'block',
            borderRadius: '4px',
          }}
        />
      )}
    </div>
  )

  /* ── Loading / Error / Empty 三態 ── */
  const renderFeedBody = () => {
    if (loadState === 'loading') return (
      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '40px 0' }}>
        {t('b4.loading')}
      </p>
    )
    if (loadState === 'error') return (
      <div style={{
        margin: '24px 0', padding: '16px', borderRadius: '12px',
        backgroundColor: 'var(--color-card)', border: '1.5px solid var(--color-danger, #dc2626)',
        color: 'var(--color-danger, #dc2626)', fontSize: '15px', lineHeight: 1.6,
      }}>
        {errorMsg}
      </div>
    )
    if (posts.length === 0) return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-secondary)' }}>
        <p style={{ fontSize: '32px', margin: '0 0 8px' }}>🌿</p>
        <p style={{ margin: '0 0 4px', fontWeight: 'bold', fontSize: '16px', color: 'var(--color-text)' }}>
          {t('b4.empty_title')}
        </p>
        <p style={{ margin: 0, fontSize: '14px' }}>{t('b4.empty_sub')}</p>
      </div>
    )
    // 計算生日 / 忌辰數量（用於摘要文案）
    const birthdayCount  = reminders.filter(r => r.type === 'birthday').length
    const memorialCount  = reminders.filter(r => r.type === 'memorial').length

    return (
      <>
        {/* ── 提醒摘要橫幅：有提醒時才顯示 ── */}
        {reminders.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            {/* 橫幅點擊按鈕（熱區 ≥44px）*/}
            <button
              onClick={() => setRemindersExpanded(prev => !prev)}
              style={{
                width:           '100%',
                minHeight:       '52px',
                display:         'flex',
                alignItems:      'center',
                gap:             '10px',
                padding:         '10px 16px',
                borderRadius:    remindersExpanded ? '12px 12px 0 0' : '12px',
                border:          '1.5px solid var(--color-primary)',
                backgroundColor: 'var(--color-card)',
                cursor:          'pointer',
                textAlign:       'left',
                fontFamily:      'inherit',
              }}
              aria-expanded={remindersExpanded}
            >
              {/* 摘要文案 */}
              <span style={{ flex: 1, fontSize: '16px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                {birthdayCount > 0 && (
                  <span style={{ display: 'block' }}>
                    {t('b5.summary_birthday', { count: birthdayCount })}
                  </span>
                )}
                {memorialCount > 0 && (
                  <span style={{ display: 'block', marginTop: birthdayCount > 0 ? '2px' : 0 }}>
                    {t('b5.summary_memorial', { count: memorialCount })}
                  </span>
                )}
              </span>
              {/* 展開/收合提示 */}
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontSize: '14px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {remindersExpanded ? t('b5.summary_collapse') : t('b5.summary_expand')}
                <span style={{
                  display:    'inline-block',
                  transition: 'transform 0.2s',
                  transform:  remindersExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  fontSize:   '12px',
                }}>▼</span>
              </span>
            </button>

            {/* 展開內容：順序列出所有 ReminderCard */}
            {remindersExpanded && (
              <div style={{
                border:          '1.5px solid var(--color-primary)',
                borderTop:       'none',
                borderRadius:    '0 0 12px 12px',
                overflow:        'hidden',
                backgroundColor: 'var(--color-bg)',
              }}>
                {reminders.map(r => {
                  const key      = `${r.member_id}-${r.type}`
                  const isSent   = blessedSet.has(key)
                  // birthday / memorial 才有送祝福功能；已送出 / custom / festival 則 no-op
                  const canBless = (r.type === 'birthday' || r.type === 'memorial') && !isSent
                  return (
                    <ReminderCard
                      key={key}
                      targetName={r.display_name}
                      icon={r.type === 'memorial' ? '🕯️' : '🎂'}
                      titleText={getReminderTitle(r)}
                      subtitleText={getReminderSubtitle(r)}
                      blessingLabel={isSent ? t('b5.blessing_sent') : undefined}
                      blessingDisabled={!canBless}
                      onBlessing={canBless ? () => handleBlessing(r) : undefined}
                      onArrange={undefined}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 貼文列表：摘要橫幅之後，推薦卡插於 posts[1] 之後 */}
        {posts[0] && renderPost(posts[0])}
        {posts[1] && renderPost(posts[1])}
        {!recoDismissed && (
          <RecommendationCard
            title={t('b4_reco.title1')} onCtaClick={() => undefined}
            onDismiss={handleDismissReco}
          />
        )}
        {posts.slice(2).map(p => renderPost(p))}
      </>
    )
  }

  /* ── Compose sheet UI ── */
  const renderCompose = () => (
    <div style={overlayStyle} onClick={() => { if (!composeLoading) { setBlessingContext(null); resetCompose(); setComposeOpen(false) } }}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t('b4.compose_title')}
        </h3>

        {/* 文字輸入 */}
        <textarea
          autoFocus
          value={composeDraft}
          onChange={e => { setComposeDraft(e.target.value); setComposeErr('') }}
          placeholder={t('b4.compose_placeholder')}
          rows={3}
          disabled={composeLoading}
          style={{
            width: '100%', fontSize: '16px', fontFamily: 'inherit',
            color: 'var(--color-text)', backgroundColor: 'var(--color-bg)',
            border: `1.5px solid ${composeErr ? 'var(--color-danger,#dc2626)' : 'var(--color-divider)'}`,
            borderRadius: '10px', padding: '10px 12px', resize: 'vertical',
            boxSizing: 'border-box', outline: 'none',
          }}
        />

        {/* 相片區域 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* 隱藏 file input，由按鈕觸發 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={composeLoading}
          />
          <button
            type="button"
            onClick={() => { setComposeErr(''); fileInputRef.current?.click() }}
            disabled={composeLoading}
            style={{
              minHeight: '40px', padding: '0 16px', borderRadius: '20px',
              border: '1.5px solid var(--color-divider)', background: 'var(--color-bg)',
              color: 'var(--color-text-secondary)', fontSize: '15px',
              fontFamily: 'inherit', cursor: composeLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {t('b4.compose_add_photo')}
          </button>

          {/* 已選相片顯示 */}
          {composePhoto && (
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {t('b4.compose_photo_selected', { name: composePhoto.name })}
              <button
                type="button"
                onClick={() => { setComposePhoto(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                disabled={composeLoading}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
                  color: 'var(--color-danger,#dc2626)', fontSize: '15px', lineHeight: 1,
                }}
                aria-label={t('b4.compose_photo_remove')}
              >
                ✕
              </button>
            </span>
          )}
        </div>

        {/* 錯誤訊息 */}
        {composeErr && (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-danger,#dc2626)' }}>
            {composeErr}
          </p>
        )}

        {/* 操作按鈕列 */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setBlessingContext(null); resetCompose(); setComposeOpen(false) }}
            disabled={composeLoading}
            style={{
              minHeight: '44px', padding: '0 20px', borderRadius: '10px',
              border: '1.5px solid var(--color-border)', background: 'var(--color-card)',
              color: 'var(--color-text)', fontSize: '16px', fontFamily: 'inherit',
              cursor: composeLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {t('b4.compose_cancel')}
          </button>
          <button
            onClick={handleComposeSubmit}
            disabled={composeLoading}
            style={{
              minHeight: '44px', padding: '0 24px', borderRadius: '10px',
              border: 'none', backgroundColor: 'var(--color-primary)',
              color: '#fff', fontSize: '16px', fontWeight: 'bold',
              fontFamily: 'inherit', cursor: composeLoading ? 'not-allowed' : 'pointer',
              opacity: composeLoading ? 0.7 : 1,
            }}
          >
            {composeLoading ? t('b4.compose_uploading') : t('b4.compose_submit')}
          </button>
        </div>
      </div>
    </div>
  )

  /* ── Main render ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', backgroundColor: 'var(--color-bg)' }}>
      <TopBar titleKey="b4.page_title" />

      <main role="main" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 96px' }}>
        {/* B5 mock 預覽掣（保留不動）*/}
        <button
          onClick={() => setModalOpen(true)}
          style={{
            width: '100%', minHeight: '44px', marginBottom: '12px', borderRadius: '12px',
            border: '1.5px dashed var(--color-primary)', background: 'var(--color-card)',
            color: 'var(--color-primary)', fontSize: '16px', fontFamily: 'inherit',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          🔔 {t('b5.preview_modal_btn')}
        </button>

        {/* \u524a\u9664\u932f\u8aa4\u63d0\u793a\u6a6b\u5e45\uff08\u5931\u6557 / 403\uff09*/}
        {deleteErrMsg && (
          <div
            role="alert"
            style={{
              margin: '0 0 12px', padding: '12px 16px',
              borderRadius: '12px', border: '1.5px solid var(--color-danger, #dc2626)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-danger, #dc2626)',
              fontSize: '16px', lineHeight: 1.5,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
            }}
          >
            <span>{deleteErrMsg}</span>
            <button
              type="button"
              onClick={() => setDeleteErrMsg('')}
              aria-label="\u95dc\u9589"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-danger, #dc2626)', fontSize: '18px',
                minHeight: '44px', minWidth: '44px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '6px', flexShrink: 0,
              }}
            >
              \u2715
            </button>
          </div>
        )}

        {renderFeedBody()}
      </main>

      {/* FAB ＋ 新動態 */}
      <button
        aria-label={t('b4.new_post_btn')}
        onClick={() => { resetCompose(); setComposeOpen(true) }}
        style={{
          position: 'fixed', bottom: '88px', right: '20px',
          width: '56px', height: '56px', borderRadius: '50%',
          backgroundColor: 'var(--color-primary)', color: 'var(--color-card)',
          border: 'none', cursor: 'pointer', fontSize: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-cta)', zIndex: 100,
        }}
      >
        ＋
      </button>

      <BottomTabBar current="family_circle" onTabChange={handleTabChange} />

      {/* Lightbox */}
      {lightboxUrl !== null && renderLightbox()}

      {/* Compose Sheet */}
      {composeOpen && renderCompose()}

      {/* B5 彈出提醒卡 mock（保留不動）*/}
      <ReminderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        avatarUrl="https://randomuser.me/api/portraits/men/68.jpg"
        targetName={t('b4.post3_author')}
        headline={t('b5.mock_modal_headline', { name: t('b4.post3_author') })}
        warmSub={t('b5.mock_modal_warm')}
        onOneClick={() => undefined}
        onArrange={() => undefined}
        onRemindLater={() => undefined}
      />
    </div>
  )
}
