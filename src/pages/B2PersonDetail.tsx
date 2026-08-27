/**
 * B2PersonDetail — 成員詳情頁（人版）
 * Route: /b2-person
 *
 * 依 .coappery/design/B2_B3.md §2.1 規範實作（靜態 UI + mock data）。
 * 佈局：TopBar → MemberHeader(person) → PhotoAlbumGrid → UploadPanel
 *       → EntryCard(activity) → EntryCard(growth) → BottomTabBar
 *
 * SOP 規則 B：≤200 行。顏色全用 CSS var。文字全 t('key')。
 * Mock 圖片：randomuser.me placeholder（正式版替換為使用者實際上載圖片）。
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import MemberHeader from '../../packages/member-header'
import PhotoAlbumGrid from '../../packages/photo-album-grid'
import UploadPanel from '../../packages/upload-panel'
import EntryCard from '../../packages/entry-card'

/* ── 右側編輯 Icon（rules.md Rule 16：純 icon，需 aria-label + ≥44px 觸控區）── */
function EditIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

/* ── mock 相簿縮圖（randomuser.me 同源 placeholder）── */
// mockup placeholder 外部圖 URL，正式版須替換為使用者實際上載圖片
const MOCK_PHOTOS = [
  { thumbnailUrl: 'https://randomuser.me/api/portraits/men/32.jpg', isNew: false },
  { thumbnailUrl: 'https://randomuser.me/api/portraits/men/33.jpg', isNew: true },
  { thumbnailUrl: 'https://randomuser.me/api/portraits/men/34.jpg', isNew: false },
  { thumbnailUrl: 'https://randomuser.me/api/portraits/men/35.jpg', isNew: false },
  { thumbnailUrl: 'https://randomuser.me/api/portraits/men/36.jpg', isNew: false },
  { thumbnailUrl: 'https://randomuser.me/api/portraits/men/37.jpg', isNew: false },
]

/* ── Main Component ── */

export default function B2PersonDetail() {
  const { t } = useTranslation()
  const [uploadOpen, setUploadOpen] = useState(false)

  // mockup placeholder 外部圖 URL，正式版須替換為使用者實際上載圖片
  const AVATAR_SON = 'https://randomuser.me/api/portraits/men/32.jpg'

  return (
    <div style={{
      minHeight: '100svh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── TopBar：返回 + 「成員詳情」+ 編輯 icon ── */}
      <TopBar
        titleKey="b2.page_title"
        onBack={() => { /* 靜態 UI，暫留空 */ }}
        rightSlot={
          <button
            aria-label={t('b2.edit_label')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '44px', height: '44px', padding: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text)', outline: 'none', flexShrink: 0,
            }}
            onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
          >
            <EditIcon size={22} />
          </button>
        }
      />

      {/* ── 主體 scroll 區域（56px top padding + 80px bottom padding）── */}
      <main
        role="main"
        aria-label={t('b2.page_title')}
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          paddingTop: '56px', paddingBottom: '80px',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* ── 身份區：MemberHeader(person / 長子)── */}
        <section
          aria-label={t('member_header.section_label', { name: t('gen2.member_eldest_son_name') })}
          style={{ padding: '24px 16px 0', boxSizing: 'border-box' }}
        >
          <MemberHeader
            variant="person"
            avatarUrl={AVATAR_SON}
            name={t('gen2.member_eldest_son_name')}
            relationLabel={t('gen2.member_eldest_son_relation')}
          />
        </section>

        {/* 分隔線 */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-divider)', margin: '20px 0 0' }} />

        {/* ── 相簿區：PhotoAlbumGrid ── */}
        <section style={{ padding: '20px 16px 0', boxSizing: 'border-box' }}>
          <PhotoAlbumGrid
            titleKey="photo_album_grid.default_title"
            quotaText={t('photo_album_grid.quota_label', { quota: '6 / 50' })}
            photos={MOCK_PHOTOS}
            onPhotoClick={(i) => console.log('photo clicked', i)}
            onQuotaClick={() => console.log('quota clicked')}
          />
        </section>

        {/* ── 上傳按鈕：UploadPanel（白底綠框設計詳見 upload-panel props）── */}
        <div style={{ padding: '20px 16px 0', boxSizing: 'border-box', display: 'flex', justifyContent: 'center' }}>
          <UploadPanel
            isOpen={uploadOpen}
            onOpen={() => setUploadOpen(true)}
            onClose={() => setUploadOpen(false)}
            onSelectSource={(src) => { console.log('source', src); setUploadOpen(false) }}
          />
        </div>

        {/* 分隔線 */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-divider)', margin: '20px 16px 0', boxSizing: 'border-box' }} />

        {/* ── 入口卡：查閱動態（activity）── */}
        <section style={{ padding: '20px 16px 0', boxSizing: 'border-box' }}>
          <EntryCard
            titleKey="entry_card.activity_title"
            subtitleKey="entry_card.activity_subtitle"
            iconType="activity"
            onClick={() => console.log('activity clicked')}
          />
        </section>

        {/* ── 入口卡：成長相簿（growth）── */}
        <section style={{ padding: '16px 16px 0', boxSizing: 'border-box' }}>
          <EntryCard
            titleKey="entry_card.growth_title"
            subtitleKey="entry_card.growth_subtitle_zhiming"
            iconType="growth"
            onClick={() => console.log('growth clicked')}
          />
        </section>

        {/* 底部緩衝 */}
        <div style={{ height: '24px' }} />
      </main>

      {/* ── BottomTabBar：家庭樹 active ── */}
      <BottomTabBar current="family_tree" onTabChange={(tab: TabId) => {
        const r: Record<TabId,string> = { family_tree:'#/', family_circle:'#/family-feed', family_gathering:'#/family-gather', my_recommendations:'#/my-recommend' }
        window.location.hash = r[tab]
      }} />
    </div>
  )
}
