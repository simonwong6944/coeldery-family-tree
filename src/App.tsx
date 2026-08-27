import './utils/i18n'
import './index.css'
import { useState, useEffect } from 'react'
import B1HomePage from './pages/B1HomePage'
import B2PersonDetail from './pages/B2PersonDetail'
import B2PetDetail from './pages/B2PetDetail'
import B3AddMember from './pages/B3AddMember'
import FamilyFeed from './pages/FamilyFeed'
import FamilyGather from './pages/FamilyGather'
import MyRecommend from './pages/MyRecommend'
import EventDetail from '../packages/event-detail'

/**
 * App root — 全域桌面置中限寬容器 + 輕量 Hash Router
 *
 * 桌面（>480px）：最大闊度 480px，水平置中，側邊留白。
 * 手機（≤480px）：滿版（width: 100%），無側邊留白。
 * backgroundColor 與 --color-bg 一致，令側邊留白區域色調融合。
 *
 * Routes（hash-based，無需 npm package）：
 *   #/            → B1HomePage（家庭樹主頁，預設）
 *   #/b2-person   → B2PersonDetail（人版成員詳情）
 *   #/b2-pet      → B2PetDetail（寵物版成員詳情）
 *   #/b3-add      → B3AddMember（加入家人精靈）
 *   #/family-feed  → FamilyFeed（家庭圈 placeholder）
 *   #/family-gather → FamilyGather（家庭聚會 placeholder）
 *   #/my-recommend → MyRecommend（我的推薦 placeholder）
 *   #/event-celebration → EventDetail（慶祝版，陳大文生日）
 *   #/event-memorial    → EventDetail（忌辰莊重版，陳李秀英）
 */

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

function App() {
  const hash = useHashRoute()

  let page: React.ReactNode
  if (hash === '#/b2-person') {
    page = <B2PersonDetail />
  } else if (hash === '#/b2-pet') {
    page = <B2PetDetail />
  } else if (hash === '#/b3-add') {
    page = <B3AddMember />
  } else if (hash === '#/family-feed') {
    page = <FamilyFeed />
  } else if (hash === '#/family-gather') {
    page = <FamilyGather />
  } else if (hash === '#/my-recommend') {
    page = <MyRecommend />
  } else if (hash === '#/event-celebration') {
    page = <EventDetail variant="celebration" />
  } else if (hash === '#/event-memorial') {
    page = <EventDetail variant="memorial" />
  } else {
    page = <B1HomePage />
  }

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100svh',
        position: 'relative',
        backgroundColor: 'var(--color-bg)',
        /* 桌面下令容器有輕微陰影，令「手機居中」視覺更突出 */
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      {page}
    </div>
  )
}

export default App
