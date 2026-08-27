/**
 * @coeldery/post-card
 * CoEldery 85 家庭圈 — 動態卡片組件
 * 規格：.coappery/design/B4_family_feed.md §二、§三
 * 顏色：只用 CSS var，禁止 hardcode hex / rgba
 * 文字：全部 via i18n t('key')
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface CommentItem {
  name: string
  avatarUrl: string
  body: string
}

export interface PostCardProps {
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
}

/* ── 讚好名單格式化（用名，以頓號連接）── */
function formatLikers(likers: string[], suffix: string): string {
  if (likers.length === 0) return ''
  return likers.join('、') + ' ' + suffix
}

export default function PostCard({
  authorName, authorAvatarUrl, timeText, aboutText,
  photoUrl, photoAlt, bodyText, likers, comments,
}: PostCardProps) {
  const { t } = useTranslation()
  const [liked, setLiked] = useState(false)

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

  return (
    <article
      aria-label={t('b4.post_img_alt', { name: authorName })}
      style={{
        backgroundColor: 'var(--color-card)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-subtle)',
        overflow: 'hidden',
        marginBottom: '16px',
      }}
    >
      {/* ── 頂部：頭像 + 名 + 時間 ── */}
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
        {/* 「關於：X」pill */}
        <span style={{
          fontSize: '18px', padding: '4px 12px', borderRadius: '20px',
          backgroundColor: 'var(--color-bg)',
          border: '1.5px solid var(--color-divider)',
          color: 'var(--color-text-secondary)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {t('b4.about_prefix')}{aboutText}
        </span>
      </div>

      {/* ── 大相（滿卡闊）── */}
      <img
        src={photoUrl}
        alt={photoAlt}
        style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'cover' }}
      />

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
          onClick={() => setLiked(l => !l)}
          aria-pressed={liked}
          style={{
            ...btnStyle,
            color: liked ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          }}
        >
          {liked ? '❤️' : '🤍'} {t('b4.like_btn').replace('❤️ ', '')}
        </button>
        <button style={btnStyle} aria-label={t('b4.comment_btn')}>
          {t('b4.comment_btn')}
        </button>
      </div>

      {/* ── 留言區 ── */}
      {comments.length > 0 && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <hr style={{ margin: '0 0 4px', border: 'none', borderTop: '1px solid var(--color-divider)' }} />
          {comments.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <img
                src={c.avatarUrl}
                alt={t('b4.comment_avatar_alt', { name: c.name })}
                style={{ ...avatarStyle, width: '36px', height: '36px' }}
              />
              <div style={{ flex: 1, backgroundColor: 'var(--color-bg)', borderRadius: '10px', padding: '8px 12px' }}>
                <p style={{ margin: '0 0 2px', fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                  {c.name}
                </p>
                <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)', lineHeight: 1.5 }}>
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
