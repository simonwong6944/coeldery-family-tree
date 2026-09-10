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
import GrowthAlbumPage from './pages/GrowthAlbumPage'
import AccountPage from './pages/AccountPage'
import EventDetail from '../packages/event-detail'
import Login from './pages/Login'

/**
 * App root — 全域桌面置中限寬容器 + 輕量 Hash Router + Auth Gate
 *
 * 桌面（>480px）：最大闊度 480px，水平置中，側邊留白。
 * 手機（≤480px）：滿版（width: 100%），無側邊留白。
 *
 * ── Handoff Token 流程（85AI → 家族樹）──
 *   mount 時，若 URL 帶 ?token=<signed_token>#/enter：
 *   1. 讀 token → POST /api/family/enter { token }（credentials:'include'）
 *   2. 成功後 history.replaceState 洗走 query（避免 token 留在 URL / 歷史）
 *   3. 按 needs_setup 路由：
 *      needs_setup:true  → Login（handoff setup 模式，唔需電話）
 *      needs_setup:false → 直接入樹（authed）
 *   4. 失敗（401 / 網絡錯）→ 回落現有 /api/family/me 流程
 *
 * ⚠️ 安全：完全唔讀、唔信任 ?member= 或其他明文身份參數。
 *    只有簽名通過嘅 token 才觸發 enter 流程。
 *
 * ── 現有 Auth Gate（無 token 時）──
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

/* handoff setup 模式：入嚟後需要設密碼，但唔需電話 */
type HandoffSetupState = false | 'needs_setup'

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
  const [authState, setAuthState]           = useState<AuthState>('checking')
  const [handoffSetup, setHandoffSetup]     = useState<HandoffSetupState>(false)

  /* ── mount 時：先嘗試 handoff token，否則走現有 /api/family/me flow ── */
  useEffect(() => {
    /* ══════════════════════════════════════════════════════
     * 安全：只讀 ?token= 簽名參數，完全唔讀 ?member= 或任何明文身份
     * ══════════════════════════════════════════════════════ */
    const searchParams = new URLSearchParams(window.location.search)
    const handoffToken = searchParams.get('token')

    if (handoffToken) {
      /* 有 token：POST /api/family/enter 驗證 */
      fetch('/api/family/enter', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ token: handoffToken }),
      })
        .then(async (res) => {
          /* 無論成功與否，先清走 URL 中的 token（避免留喺位址列 / 歷史）*/
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + (window.location.hash || ''),
          )

          if (!res.ok) {
            /* token 驗失敗（401）或 server 錯：回落現有 me flow */
            return fallbackToMeFlow()
          }

          const data = await res.json() as { ok?: boolean; needs_setup?: boolean }
          if (!data.ok) {
            return fallbackToMeFlow()
          }

          if (data.needs_setup) {
            /* 未 setup：進 Login handoff setup 模式（唔需電話）*/
            setHandoffSetup('needs_setup')
            setAuthState('guest')
            window.location.hash = '#/login'
          } else {
            /* 已 setup：直接入樹 */
            setAuthState('authed')
            if (!window.location.hash || window.location.hash === '#/enter') {
              window.location.hash = '#/'
            }
          }
        })
        .catch(() => {
          /* 網絡錯：清 URL + 回落 me flow */
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname + (window.location.hash || ''),
          )
          fallbackToMeFlow()
        })
      return
    }

    /* 無 token：走現有 me flow */
    fallbackToMeFlow()

    function fallbackToMeFlow() {
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
    }
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
        {/* handoffSetup='needs_setup' → Login 進入 setup 模式（唔需電話）*/}
        <Login handoffSetup={handoffSetup === 'needs_setup'} />
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
  } else if (hash.startsWith('#/album/')) {
    const memberId = hash.replace('#/album/', '')
    page = <GrowthAlbumPage memberId={memberId} />
  } else if (hash === '#/account') {
    page = <AccountPage />
  } else if (hash === '#/family-feed') {
    page = <FamilyFeed />
  } else if (hash.startsWith('#/family-gather')) {
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
