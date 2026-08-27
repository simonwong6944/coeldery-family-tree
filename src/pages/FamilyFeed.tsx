/**
 * FamilyFeed — 家庭圈 placeholder 頁
 * 路由：#/family-feed  規格：細步 3e
 */
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/',
  family_circle: '#/family-feed',
  family_gathering: '#/family-gather',
  my_recommendations: '#/my-recommend',
}

export default function FamilyFeed() {
  const { t } = useTranslation()
  const handleTabChange = (tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', backgroundColor: 'var(--color-bg)' }}>
      <TopBar titleKey="placeholder.family_feed_title" onBack={() => { window.location.hash = '#/' }} />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 32px',
          paddingTop: '80px',
          paddingBottom: '100px',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '56px', lineHeight: 1 }}>🌳</span>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t('placeholder.coming_soon')}
        </h2>
        <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {t('placeholder.family_feed_msg')}
        </p>
      </main>
      <BottomTabBar current="family_circle" onTabChange={handleTabChange} />
    </div>
  )
}
