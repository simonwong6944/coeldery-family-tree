/**
 * FamilyFeed — 家庭圈動態 feed（B4 + B5 提醒卡 + B4 推薦卡）
 * 規格：.coappery/design/B4_family_feed.md + B5_reminder_cards.md
 * 行數上限：≤220 行
 * v2.0.0：接駁真 D1 API（posts/likes/comments），移除 feedRepository 貼文邏輯
 *          B5 提醒卡 / 推薦卡 mock 保留不動（不屬本階段範圍）
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import PostCard from '../../packages/post-card'
import type { CommentItem } from '../../packages/post-card'
import ReminderCard from '../../packages/reminder-card'
import ReminderModal from '../../packages/reminder-modal'
import RecommendationCard from '../../packages/recommendation-card'
import { isRecoDismissed, dismissReco, CURRENT_USER_NAME } from '../utils/feedRepository'

/* ── API 回應型別 ── */
interface ApiComment {
  id: string
  author_member_id: string
  author_name: string
  body: string
  created_at: string
}

interface ApiPost {
  id: string
  family_id: string
  author_member_id: string
  author_name: string
  body_text: string | null
  photo_url: string | null
  created_at: string
  comments: ApiComment[]
  like_count: number
  isLikedByMe: boolean
}

/* ── PostCard 橋接：API post → PostCard props 所需格式 ── */
function toCommentItems(comments: ApiComment[]): CommentItem[] {
  return comments.map(c => ({
    name:      c.author_name,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.author_name)}`,
    body:      c.body,
  }))
}

function toLikers(likeCount: number): string[] {
  // PostCard 用 likers.length 顯示讚好數；API 只回 like_count（不含名單）
  // 用佔位字串陣列填充數量，顯示「N 個讚」
  return Array.from({ length: likeCount }, (_, i) => String(i))
}

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
}

const RECO_ID = 'reco-family-gathering-v1'

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

/* ─────────────────────────────────────────────────────── */

export default function FamilyFeed() {
  const { t } = useTranslation()

  /* ── 貼文狀態 ── */
  const [posts,      setPosts]      = useState<ApiPost[]>([])
  const [loadState,  setLoadState]  = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg,   setErrorMsg]   = useState('')

  /* ── Compose sheet ── */
  const [composeOpen,    setComposeOpen]    = useState(false)
  const [composeDraft,   setComposeDraft]   = useState('')
  const [composeErr,     setComposeErr]     = useState('')
  const [composeLoading, setComposeLoading] = useState(false)

  /* ── B5 mock（保留不動）── */
  const [modalOpen,     setModalOpen]     = useState(false)
  const [recoDismissed, setRecoDismissed] = useState(() => isRecoDismissed(RECO_ID))

  const handleTabChange    = (tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }
  const handleDismissReco  = () => { dismissReco(RECO_ID); setRecoDismissed(true) }

  /* ── 載入貼文 ── */
  const loadPosts = useCallback(async () => {
    setLoadState('loading')
    setErrorMsg('')
    try {
      const res  = await fetch('/api/posts')
      const data = await res.json() as { ok: boolean; posts?: ApiPost[]; error?: string }
      if (!data.ok) {
        setErrorMsg(
          res.status === 409
            ? t('b4.error_no_self')
            : (data.error ?? t('b4.error_generic'))
        )
        setLoadState('error')
        return
      }
      setPosts(data.posts ?? [])
      setLoadState('ok')
    } catch {
      setErrorMsg(t('b4.error_generic'))
      setLoadState('error')
    }
  }, [t])

  useEffect(() => { loadPosts() }, [loadPosts])

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
    } catch { /* 網絡錯誤靜默，唔阻 UI */ }
  }

  /* ── 新增留言 ── */
  const handleAddComment = async (post: ApiPost, body: string) => {
    if (!body.trim()) return
    try {
      const res  = await fetch(`/api/posts/${post.id}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: body.trim() }),
      })
      const data = await res.json() as {
        ok: boolean
        comment?: { id: string; author_name: string; body: string; created_at: string; author_member_id: string }
      }
      if (!data.ok || !data.comment) return
      const c = data.comment
      setPosts(prev => prev.map(p =>
        p.id !== post.id ? p : {
          ...p,
          comments: [...p.comments, {
            id: c.id, author_member_id: c.author_member_id,
            author_name: c.author_name, body: c.body, created_at: c.created_at,
          }],
        }
      ))
    } catch { /* 靜默 */ }
  }

  /* ── 新增貼文（compose sheet submit）── */
  const handleComposeSubmit = async () => {
    const text = composeDraft.trim()
    if (!text) { setComposeErr(t('b4.compose_empty_err')); return }
    setComposeErr('')
    setComposeLoading(true)
    try {
      const res  = await fetch('/api/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body_text: text }),
      })
      const data = await res.json() as { ok: boolean; post?: ApiPost; error?: string }
      if (!data.ok || !data.post) {
        setComposeErr(data.error ?? t('b4.error_generic'))
        return
      }
      setPosts(prev => [data.post!, ...prev])
      setComposeDraft('')
      setComposeOpen(false)
    } catch {
      setComposeErr(t('b4.error_generic'))
    } finally {
      setComposeLoading(false)
    }
  }

  /* ── 渲染單則貼文（橋接 API 型別 → PostCard props）── */
  const renderPost = (p: ApiPost) => (
    <PostCard
      key={p.id}
      postId={p.id}
      authorName={p.author_name}
      authorAvatarUrl={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.author_name)}`}
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
    />
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
    return (
      <>
        {posts[0] && renderPost(posts[0])}
        <ReminderCard
          targetName={CURRENT_USER_NAME}
          icon="🎂"
          titleText={t('b5.mock_title', { name: t('b4.post3_author') })}
          subtitleText={t('b5.mock_subtitle')}
          onBlessing={() => undefined}
          onArrange={() => undefined}
        />
        {posts[1] && renderPost(posts[1])}
        {!recoDismissed && (
          <RecommendationCard
            title={t('b4_reco.title1')}
            onCtaClick={() => undefined}
            onDismiss={handleDismissReco}
          />
        )}
        {posts.slice(2).map(p => renderPost(p))}
      </>
    )
  }

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

        {renderFeedBody()}
      </main>

      {/* FAB ＋ 新動態 */}
      <button
        aria-label={t('b4.new_post_btn')}
        onClick={() => { setComposeOpen(true); setComposeErr(''); setComposeDraft('') }}
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

      {/* ── Compose Sheet ── */}
      {composeOpen && (
        <div style={overlayStyle} onClick={() => setComposeOpen(false)}>
          <div style={sheetStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
              {t('b4.compose_title')}
            </h3>
            <textarea
              autoFocus
              value={composeDraft}
              onChange={e => { setComposeDraft(e.target.value); setComposeErr('') }}
              placeholder={t('b4.compose_placeholder')}
              rows={4}
              style={{
                width: '100%', fontSize: '16px', fontFamily: 'inherit',
                color: 'var(--color-text)', backgroundColor: 'var(--color-bg)',
                border: `1.5px solid ${composeErr ? 'var(--color-danger,#dc2626)' : 'var(--color-divider)'}`,
                borderRadius: '10px', padding: '10px 12px', resize: 'vertical',
                boxSizing: 'border-box', outline: 'none',
              }}
            />
            {composeErr && (
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-danger,#dc2626)' }}>
                {composeErr}
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setComposeOpen(false)}
                disabled={composeLoading}
                style={{
                  minHeight: '44px', padding: '0 20px', borderRadius: '10px',
                  border: '1.5px solid var(--color-border)', background: 'var(--color-card)',
                  color: 'var(--color-text)', fontSize: '16px', fontFamily: 'inherit', cursor: 'pointer',
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
                {composeLoading ? t('b4.submitting') : t('b4.compose_submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── B5 彈出提醒卡 mock（保留不動）── */}
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
