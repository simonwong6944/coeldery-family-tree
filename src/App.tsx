import './utils/i18n'
import './index.css'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import B1HomePage from './pages/B1HomePage'
import B2PersonDetail from './pages/B2PersonDetail'
import B2PetDetail from './pages/B2PetDetail'
import B3AddMember from './pages/B3AddMember'
import MemberDetail from './pages/MemberDetail'
import FamilyFeed from './pages/FamilyFeed'
import FamilyGather from './pages/FamilyGather'
import MyRecommend from './pages/MyRecommend'
import EventDetail from '../packages/event-detail'
import Login from './pages/Login'

/**
 * App root — 全域桌面置中限寬容器 + 輕量 Hash Router + Auth Gate
 *
 * 桌面（>480px）：最大闊度 480px，水平置中，側邊留白。
 * 手機（≤480px）：滿版（width: 100%），無側邊留白。
 *
 * Auth Gate（mount 時跑一次 GET /api/family/me）：
 *   checking → 顯示載入畫面
 *   authed   → 行現有 hash route（須 200 && ok && member_id 非 null）
 *   guest    → useEffect 導向 #/login（唔喺 render 同步改 hash）
 *
 * #/login 一律直通，唔受 gate 攔截（避免死循環）。
 *
 * Routes（hash-based，無需 npm package）：
 *   #/            → B1HomePage（家庭樹主頁，預設）
 *   #/b2-person   → B2PersonDetail（人版成員詳情）
 *   #/b2-pet      → B2PetDetail（寵物版成員詳情）
 *   #/b3-add      → B3AddMember（加入家人精靈）
 *   #/member/:id  → MemberDetail（成員詳情 + 管理）
 *   #/family-feed  → FamilyFeed（家庭圈 placeholder）
 *   #/family-gather → FamilyGather（家庭聚會 placeholder）
 *   #/my-recommend → MyRecommend（我的推薦 placeholder）
 *   #/event-celebration → EventDetail（慶祝版，陳大文生日）
 *   #/event-memorial    → EventDetail（忌辰莊重版，陳李秀英）
 *   #/login             → Login（登入 / 首次設定）
 */

type AuthState = 'checking' | 'authed' | 'guest'

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

/* ── 載入畫面（同 B1HomePage loading 同款 style）── */
function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div style={{
      minHeight: '100svh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text-secondary)',
      fontSize: '16px',
    }}>
      {t('common.loading')}
    </div>
  )
}

function App() {
  const hash = useHashRoute()
  const [authState, setAuthState] = useState<AuthState>('checking')

  /* ── mount 時查 session（跑一次）── */
  useEffect(() => {
    fetch('/api/family/me', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) { setAuthState('guest'); return }
        const body = await res.json() as Record<string, unknown>
        /* 須 ok:true 且 member_id 非 null → authed；其餘（未 setup）→ guest */
        if (body.ok === true && body.member_id != null) {
          setAuthState('authed')
        } else {
          setAuthState('guest')
        }
      })
      .catch(() => setAuthState('guest'))
  }, [])

  /* ── guest 時用 useEffect 導向 #/login（唔喺 render 同步改 hash）── */
  useEffect(() => {
    if (authState === 'guest' && hash !== '#/login') {
      window.location.hash = '#/login'
    }
  }, [authState, hash])

  /* ── #/login 一律直通，唔受 gate 攔截 ── */
  if (hash === '#/login') {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100svh',
        position: 'relative',
        backgroundColor: 'var(--color-bg)',
        boxShadow: 'var(--shadow-soft)',
      }}>
        <Login />
      </div>
    )
  }

  /* ── checking → 載入畫面 ── */
  if (authState === 'checking') {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100svh',
        position: 'relative',
        backgroundColor: 'var(--color-bg)',
        boxShadow: 'var(--shadow-soft)',
      }}>
        <LoadingScreen />
      </div>
    )
  }

  /* ── guest（非 #/login）→ 空畫面，useEffect 會導向 #/login ── */
  if (authState === 'guest') {
    return (
      <div style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100svh',
        position: 'relative',
        backgroundColor: 'var(--color-bg)',
        boxShadow: 'var(--shadow-soft)',
      }} />
    )
  }

  /* ── authed → 現有 hash route 判斷（完全不動）── */
  let page: React.ReactNode
  if (hash === '#/b2-person') {
    page = <B2PersonDetail />
  } else if (hash === '#/b2-pet') {
    page = <B2PetDetail />
  } else if (hash === '#/b3-add') {
    page = <B3AddMember />
  } else if (hash.startsWith('#/member/')) {
    const memberId = hash.replace('#/member/', '')
    page = <MemberDetail memberId={memberId} />
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
        boxShadow: 'var(--shadow-soft)',
      }}
    >
      {page}
    </div>
  )
}

export default App
