/**
 * FamilyFeed — 家庭圈動態 feed（B4 靜態 mockup + B5 提醒卡）
 * 規格：.coappery/design/B4_family_feed.md + B5_reminder_cards.md
 * 行數上限：≤170 行
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import PostCard from '../../packages/post-card'
import type { PostCardProps } from '../../packages/post-card'
import ReminderCard from '../../packages/reminder-card'
import ReminderModal from '../../packages/reminder-modal'

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
}

export default function FamilyFeed() {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const handleTabChange = (tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }

  const posts: PostCardProps[] = [
    {
      authorName: t('b4.post1_author'),
      authorAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      timeText: t('b4.post1_time'), aboutText: t('b4.post1_about'),
      photoUrl: 'https://images.dog.ceo/breeds/retriever-golden/n02099601_7771.jpg',
      photoAlt: t('b4.post_img_alt', { name: t('b4.post1_author') }),
      bodyText: t('b4.post1_body'), likers: [t('b4.post1_liker1')],
      comments: [{ name: t('b4.post1_comment1_author'), avatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg', body: t('b4.post1_comment1_body') }],
    },
    {
      authorName: t('b4.post2_author'),
      authorAvatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
      timeText: t('b4.post2_time'), aboutText: t('b4.post2_about'),
      photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      photoAlt: t('b4.post_img_alt', { name: t('b4.post2_author') }),
      bodyText: t('b4.post2_body'), likers: [t('b4.post2_liker1'), t('b4.post2_liker2')], comments: [],
    },
    {
      authorName: t('b4.post3_author'),
      authorAvatarUrl: 'https://randomuser.me/api/portraits/men/68.jpg',
      timeText: t('b4.post3_time'), aboutText: t('b4.post3_about'),
      photoUrl: 'https://randomuser.me/api/portraits/men/41.jpg',
      photoAlt: t('b4.post_img_alt', { name: t('b4.post3_author') }),
      bodyText: t('b4.post3_body'), likers: [t('b4.post3_liker1')],
      comments: [{ name: t('b4.post3_comment1_author'), avatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg', body: t('b4.post3_comment1_body') }],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', backgroundColor: 'var(--color-bg)' }}>
      <TopBar titleKey="b4.page_title" />

      <main role="main" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 96px' }}>
        {/* 臨時預覽掣（正式版由觸發邏輯控制）*/}
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

        {/* posts[0] */}
        <PostCard {...posts[0]} />

        {/* ── B5 提醒卡 A（夾喺 post[0] 和 post[1] 之間）── */}
        <ReminderCard
          targetName="陳大文"
          icon="🎂"
          titleText={t('b5.mock_title', { name: t('b4.post3_author') })}
          subtitleText={t('b5.mock_subtitle')}
          onBlessing={() => undefined}
          onArrange={() => undefined}
        />

        {/* posts[1] + posts[2] */}
        {posts.slice(1).map((p, i) => <PostCard key={i + 1} {...p} />)}
      </main>

      {/* FAB ＋ 新動態（§四：fixed 右下角，≥56px）*/}
      <button
        aria-label={t('b4.new_post_btn')}
        onClick={() => undefined}
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

      {/* ── B5 彈出提醒卡 B（臨時 mock 預覽，正式版由觸發邏輯控制）── */}
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
