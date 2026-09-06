/**
 * @coeldery/post-card
 * CoEldery 85 家庭圈 — 動態卡片組件
 * 規格：.coappery/design/B4_family_feed.md §二、§三
 * 顏色：只用 CSS var，禁止 hardcode hex / rgba
 * 文字：全部 via i18n t('key')
 * v1.1.0：接駁 feedRepository — 讚好/留言由頁面層持久化（rules.md §9）
 * v1.2.0：加 onPhotoClick prop — 撳相片時呼叫（由頁面層實現 lightbox）
 * v1.3.0：加 canDelete / onDelete / onDeleteComment — 刪除由頁面層確認並呼叫 API
 *         CommentItem 加 id + canDelete；掣本身唔彈對話框，由頁面層處理
 * v1.4.0：散開刪除掣 → 右上角「⋮」選單（只有本人內容才顯示）
 *         留言行同理：canDelete=true 才顯示「⋮」；選單目前只有「刪除」一項
 *         點擊選單外（透明全屏遮罩）收埋；選完一項後亦自動收埋
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface CommentItem {
  id: string
  name: string
  avatarUrl: string
  body: string
  canDelete?: boolean
}

export interface PostCardProps {
  /** 貼文 ID（feedRepository 對應鍵，用於讚好/留言回調）*/
  postId: string
  /** 發文人名 */
  authorName: string
  /** 發文人頭像 URL */
  authorAvatarUrl: string
  /** 時間文字（已格式化，如「2 小時前」） */
  timeText: string
  /** 「關於：X」標籤文字 */
  aboutText: string
  /** 相片 URL（mockup 支援一張，日後可擴充陣列） */
  photoUrl: string
  /** 相片 alt（i18n 已格式化） */
  photoAlt: string
  /** 動態內文 */
  bodyText: string
  /** 讚好名單（名字陣列） */
  likers: string[]
  /** 留言陣列 */
  comments: CommentItem[]
  /** 目前登入者是否已讚（由 feedRepository.isLikedByMe 計算）*/
  isLiked: boolean
  /** 切換讚好回調（頁面層呼叫 feedRepository.toggleLike 並更新 state）*/
  onToggleLike: () => void
  /** 新增留言回調（頁面層呼叫 feedRepository.addComment 並更新 state）*/
  onAddComment: (body: string) => void
  /** 撳相片回調（由頁面層實現 lightbox）；無傳入時相片不可點（向後兼容）*/
  onPhotoClick?: () => void
  /** 是否顯示貼文「⋮」掣（由頁面層根據 author_member_id === currentMemberId 決定）*/
  canDelete?: boolean
  /** 貼文刪除回調（掣本身唔彈對話框，由頁面層先確認再呼叫）*/
  onDelete?: () => void
  /** 留言刪除回調（頁面層先確認再呼叫）*/
  onDeleteComment?: (commentId: string) => void
}

/* ── 讚好名單格式化（用名，以頓號連接）── */
function formatLikers(likers: string[], suffix: string): string {
  if (likers.length === 0) return ''
  return likers.join('、') + ' ' + suffix
}

/* ──────────────────────────────────────────────────────────── */

export default function PostCard({
  postId: _postId,
  authorName, authorAvatarUrl, timeText, aboutText,
  photoUrl, photoAlt, bodyText, likers, comments,
  isLiked, onToggleLike, onAddComment, onPhotoClick,
  canDelete, onDelete, onDeleteComment,
}: PostCardProps) {
  const { t } = useTranslation()

  /* 留言輸入展開狀態（本地 UI state，非持久資料）*/
  const [commentOpen, setCommentOpen] = useState(false)
  /* 留言草稿（本地 UI state，送出後清空）*/
  const [draft, setDraft] = useState('')

  /* ── ⋮ 選單狀態：'post' | commentId | null ── */
  /* null = 全收埋；'post' = 貼文選單開；字串 = 對應 commentId 選單開 */
  const [menuOpen, setMenuOpen] = useState<'post' | string | null>(null)

  /* ── 送出留言 ── */
  const handleSubmitComment = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onAddComment(trimmed)
    setDraft('')
    setCommentOpen(false)
  }

  /* ── 關閉所有選單 ── */
  const closeMenu = () => setMenuOpen(null)

  /* ── 共用樣式 token ── */
  const avatarStyle: React.CSSProperties = {
    width: '48px', height: '48px', borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0,
    border: '2px solid var(--color-divider)',
  }
  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '6px', minHeight: '44px', flex: 1,
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '18px', fontWeight: 'bold', fontFamily: 'inherit',
    color: 'var(--color-text-secondary)',
    borderRadius: '8px',
  }

  /* ── ⋮ 掣樣式（貼文 / 留言共用，尺寸略有別）── */
  const morePostBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '44px', minHeight: '44px',
    padding: '0 8px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '22px', lineHeight: 1, fontFamily: 'inherit',
    color: 'var(--color-text-secondary)',
    borderRadius: '8px', flexShrink: 0,
  }
  const moreCommentBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '44px', minHeight: '44px',
    padding: '0 6px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '18px', lineHeight: 1, fontFamily: 'inherit',
    color: 'var(--color-text-secondary)',
    borderRadius: '6px', flexShrink: 0,
  }

  /* ── 選單浮層（inline，right 對齊，z-index 50）── */
  const menuDropStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', right: 0, zIndex: 50,
    minWidth: '140px',
    backgroundColor: 'var(--color-card)',
    border: '1.5px solid var(--color-divider)',
    borderRadius: '10px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
    overflow: 'hidden',
    marginTop: '4px',
  }
  const menuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', minHeight: '44px',
    padding: '0 16px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '16px', fontFamily: 'inherit', textAlign: 'left',
    color: 'var(--color-danger, #dc2626)',
  }

  return (
    <>
      {/* ── 透明全屏遮罩：任何選單開啟時覆蓋在卡片下方，點擊收埋 ── */}
      {menuOpen !== null && (
        <div
          onClick={closeMenu}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'transparent',
          }}
          aria-hidden="true"
        />
      )}

      <article
        aria-label={t('b4.post_img_alt', { name: authorName })}
        style={{
          position: 'relative',   /* 讓選單可用 position: absolute 定位 */
          backgroundColor: 'var(--color-card)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-subtle)',
          overflow: 'visible',    /* 允許選單浮出卡片邊界 */
          marginBottom: '16px',
        }}
      >
        {/* ── 頂部：頭像 + 名 + 時間 + 「關於」pill + ⋮ 掣 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 16px 8px' }}>
          <img
            src={authorAvatarUrl}
            alt={t('b4.avatar_alt', { name: authorName })}
            style={avatarStyle}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)', lineHeight: 1.2 }}>
              {authorName}
            </p>
            <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-secondary)', lineHeight: 1.2 }}>
              {timeText}
            </p>
          </div>
          {/* 「關於：X」pill（aboutText 為空時唔顯示）*/}
          {aboutText && (
            <span style={{
              fontSize: '18px', padding: '4px 12px', borderRadius: '20px',
              backgroundColor: 'var(--color-bg)',
              border: '1.5px solid var(--color-divider)',
              color: 'var(--color-text-secondary)',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {t('b4.about_prefix')}{aboutText}
            </span>
          )}

          {/* ── 貼文「⋮」掣 + 選單（canDelete=true 才顯示）── */}
          {canDelete && onDelete && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => prev === 'post' ? null : 'post') }}
                aria-label={t('b4.more_actions')}
                aria-expanded={menuOpen === 'post'}
                aria-haspopup="menu"
                style={morePostBtnStyle}
              >
                &#8942;
              </button>
              {menuOpen === 'post' && (
                <div role="menu" style={menuDropStyle}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { closeMenu(); onDelete() }}
                    style={menuItemStyle}
                  >
                    &#128465; {t('b4.post_delete')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 大相（滿卡闊；冇相時唔 render，避免 broken image）── */}
        {/* overflow: visible 下需自行 clip 相片，用 borderRadius + overflow hidden 包 */}
        {photoUrl && (
          <div style={{ overflow: 'hidden' }}>
            {onPhotoClick ? (
              <button
                type="button"
                onClick={onPhotoClick}
                aria-label={photoAlt}
                style={{
                  display: 'block', width: '100%', padding: 0,
                  border: 'none', background: 'none', cursor: 'zoom-in',
                }}
              >
                <img
                  src={photoUrl}
                  alt={photoAlt}
                  style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'cover' }}
                />
              </button>
            ) : (
              <img
                src={photoUrl}
                alt={photoAlt}
                style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'cover' }}
              />
            )}
          </div>
        )}

        {/* ── 內文 ── */}
        <p style={{ margin: 0, padding: '12px 16px', fontSize: '18px', color: 'var(--color-text)', lineHeight: 1.6 }}>
          {bodyText}
        </p>

        {/* ── 讚好名單 ── */}
        {likers.length > 0 && (
          <p style={{ margin: 0, padding: '0 16px 8px', fontSize: '18px', color: 'var(--color-text-secondary)' }}>
            {formatLikers(likers, t('b4.likes_suffix'))}
          </p>
        )}

        {/* ── 分隔線 ── */}
        <hr style={{ margin: '0 16px', border: 'none', borderTop: '1px solid var(--color-divider)' }} />

        {/* ── 互動列 ── */}
        <div style={{ display: 'flex', padding: '4px 8px' }}>
          <button
            onClick={onToggleLike}
            aria-pressed={isLiked}
            style={{
              ...btnStyle,
              color: isLiked ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            {isLiked ? '❤️' : '🤍'} {t('b4.like_btn').replace('❤️ ', '')}
          </button>
          <button
            onClick={() => setCommentOpen(o => !o)}
            aria-expanded={commentOpen}
            style={btnStyle}
          >
            {t('b4.comment_btn')}
          </button>
        </div>

        {/* ── 留言輸入區 ── */}
        {commentOpen && (
          <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={t('b4.comment_placeholder')}
              rows={2}
              style={{
                width: '100%',
                minHeight: '52px',
                fontSize: '18px',
                fontFamily: 'inherit',
                color: 'var(--color-text)',
                backgroundColor: 'var(--color-bg)',
                border: '1.5px solid var(--color-divider)',
                borderRadius: '10px',
                padding: '10px 12px',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSubmitComment}
              style={{
                alignSelf: 'flex-end',
                minHeight: '44px',
                minWidth: '120px',
                padding: '0 20px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-card)',
                fontSize: '18px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {t('b4.comment_submit')}
            </button>
          </div>
        )}

        {/* ── 留言區 ── */}
        {comments.length > 0 && (
          <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <hr style={{ margin: '0 0 4px', border: 'none', borderTop: '1px solid var(--color-divider)' }} />
            {comments.map((c, i) => (
              <div key={c.id || i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <img
                  src={c.avatarUrl}
                  alt={t('b4.comment_avatar_alt', { name: c.name })}
                  style={{ ...avatarStyle, width: '36px', height: '36px' }}
                />
                <div style={{ flex: 1, backgroundColor: 'var(--color-bg)', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                      {c.name}
                    </p>
                    {/* ── 留言「⋮」掣 + 選單（c.canDelete=true 才顯示）── */}
                    {c.canDelete && onDeleteComment && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => prev === c.id ? null : c.id) }}
                          aria-label={t('b4.more_actions')}
                          aria-expanded={menuOpen === c.id}
                          aria-haspopup="menu"
                          style={moreCommentBtnStyle}
                        >
                          &#8942;
                        </button>
                        {menuOpen === c.id && (
                          <div role="menu" style={menuDropStyle}>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => { closeMenu(); onDeleteComment(c.id) }}
                              style={menuItemStyle}
                            >
                              &#128465; {t('b4.comment_delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '18px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </>
  )
}
