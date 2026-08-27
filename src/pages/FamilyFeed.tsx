/**
 * FamilyFeed — 家庭圈動態 feed（B4 靜態 mockup）
 * 規格：.coappery/design/B4_family_feed.md
 * 行數上限：≤150 行
 */

import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import PostCard from '../../packages/post-card'
import type { PostCardProps } from '../../packages/post-card'

/* ── 路由表（Task 3e 保留）── */
const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/',
  family_circle: '#/family-feed',
  family_gathering: '#/family-gather',
  my_recommendations: '#/my-recommend',
}

export default function FamilyFeed() {
  const { t } = useTranslation()

  const handleTabChange = (tab: TabId) => {
    window.location.hash = TAB_ROUTES[tab]
  }

  /* ── Mock post 資料（§五）── */
  const posts: PostCardProps[] = [
    {
      authorName: t('b4.post1_author'),
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      timeText: t('b4.post1_time'),
      aboutText: t('b4.post1_about'),
      photoUrl: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_7771.jpg',
      photoAlt: t('b4.post_img_alt', { name: t('b4.post1_author') }),
      bodyText: t('b4.post1_body'),
      likers: [t('b4.post1_liker1')],
      comments: [
        {
          name: t('b4.post1_comment1_author'),
          avatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg',
          body: t('b4.post1_comment1_body'),
        },
      ],
    },
    {
      authorName: t('b4.post2_author'),
      authorAvatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
      timeText: t('b4.post2_time'),
      aboutText: t('b4.post2_about'),
      photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      photoAlt: t('b4.post_img_alt', { name: t('b4.post2_author') }),
      bodyText: t('b4.post2_body'),
      likers: [t('b4.post2_liker1'), t('b4.post2_liker2')],
      comments: [],
    },
    {
      authorName: t('b4.post3_author'),
      authorAvatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg',
      timeText: t('b4.post3_time'),
      aboutText: t('b4.post3_about'),
      photoUrl: 'https://randomuser.me/api/portraits/men/41.jpg',
      photoAlt: t('b4.post_img_alt', { name: t('b4.post3_author') }),
      bodyText: t('b4.post3_body'),
      likers: [t('b4.post3_liker1')],
      comments: [
        {
          name: t('b4.post3_comment1_author'),
          avatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
          body: t('b4.post3_comment1_body'),
        },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', backgroundColor: 'var(--color-bg)' }}>
      {/* 頂欄 */}
      <TopBar titleKey="b4.page_title" />

      {/* 主內容 */}
      <main
        role="main"
        style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 96px' }}
      >
        {posts.map((p, i) => (
          <PostCard key={i} {...p} />
        ))}
      </main>

      {/* 浮動 ＋ FAB（§四：fixed，右下角，≥56px，primary 色）*/}
      <button
        aria-label={t('b4.new_post_btn')}
        onClick={() => undefined}
        style={{
          position: 'fixed',
          bottom: '88px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-card)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-cta)',
          zIndex: 100,
        }}
      >
        ＋
      </button>

      {/* 底欄 */}
      <BottomTabBar current="family_circle" onTabChange={handleTabChange} />
    </div>
  )
}
