/**
 * FamilyFeed — 家庭圈動態 feed（B4 + B5 提醒卡 + B4 推薦卡）
 * 規格：.coappery/design/B4_family_feed.md + B5_reminder_cards.md + B4_recommendation_card.md
 * 行數上限：≤170 行
 * v1.1.0：接駁 feedRepository — 讚好/留言/推薦卡 dismiss 持久化至 localStorage
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import PostCard from '../../packages/post-card'
import ReminderCard from '../../packages/reminder-card'
import ReminderModal from '../../packages/reminder-modal'
import RecommendationCard from '../../packages/recommendation-card'
import {
  getPosts, toggleLike, addComment, isLikedByMe,
  isRecoDismissed, dismissReco, CURRENT_USER_NAME,
} from '../utils/feedRepository'
import type { FeedPost } from '../utils/feedRepository'

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
}

/* 穩定的推薦卡識別鍵（feedRepository dismiss 持久化用）*/
const RECO_ID = 'reco-family-gathering-v1'

/* FeedComment.authorName → CommentItem.name 映射（介面對齊）*/
function mapComments(p: FeedPost) {
  return p.comments.map(c => ({ name: c.authorName, avatarUrl: c.avatarUrl, body: c.body }))
}

export default function FamilyFeed() {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  /* 貼文資料由 feedRepository 初始化，讚好/留言後即時更新並持久化 */
  const [posts, setPosts] = useState<FeedPost[]>(() => getPosts())
  /* 推薦卡 dismiss 狀態由 feedRepository 持久化，refresh 後仍記得 */
  const [recoDismissed, setRecoDismissed] = useState(() => isRecoDismissed(RECO_ID))

  const handleTabChange = (tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }
  const handleDismissReco = () => { dismissReco(RECO_ID); setRecoDismissed(true) }

  /* 渲染單則貼文（postId/isLiked/onToggleLike/onAddComment 均接駁 feedRepository）*/
  const renderPost = (p: FeedPost) => (
    <PostCard
      key={p.id}
      postId={p.id}
      authorName={p.authorName}
      authorAvatarUrl={p.authorAvatarUrl}
      timeText={p.timeText}
      aboutText={p.aboutText}
      photoUrl={p.photoUrl}
      photoAlt={t('b4.post_img_alt', { name: p.authorName })}
      bodyText={p.bodyText}
      likers={p.likers}
      comments={mapComments(p)}
      isLiked={isLikedByMe(p)}
      onToggleLike={() => setPosts(toggleLike(p.id))}
      onAddComment={(body) => setPosts(addComment(p.id, body))}
    />
  )

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
        {posts[0] && renderPost(posts[0])}

        {/* ── B5 提醒卡 A（夾喺 post[0] 和 post[1] 之間）── */}
        <ReminderCard
          targetName={CURRENT_USER_NAME}
          icon="🎂"
          titleText={t('b5.mock_title', { name: t('b4.post3_author') })}
          subtitleText={t('b5.mock_subtitle')}
          onBlessing={() => undefined}
          onArrange={() => undefined}
        />

        {/* posts[1] */}
        {posts[1] && renderPost(posts[1])}

        {/* ── B4 推薦卡（插於 posts[1] 之後、posts[2] 之前；dismiss 持久化至 feedRepository）── */}
        {!recoDismissed && (
          <RecommendationCard
            title={t('b4_reco.title1')}
            onCtaClick={() => undefined}
            onDismiss={handleDismissReco}
          />
        )}

        {/* posts[2] 及後續（支援動態貼文數量，索引 2 以後均渲染）*/}
        {posts.slice(2).map(p => renderPost(p))}
      </main>

      {/* FAB ＋ 新動態（§四，fixed 右下角，≥56px）*/}
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
