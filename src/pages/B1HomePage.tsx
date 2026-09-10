/**
 * B1HomePage — 焦點式家庭樹主頁（4h-fix-2）
 *
 * 問題一修正：
 *   - TopBar/BottomTabBar 已是 position:fixed，<main> 用 marginTop/marginBottom
 *     而非 paddingTop/paddingBottom，確保 overflowY:auto 可正常 scroll
 *   - Shell 外層 height:100svh + overflow:hidden，<main flex:1 overflowY:auto>
 *
 * 頁面 ≤ 200 行。
 */

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import { buildFocusView } from '../../packages/family-tree-engine'
import type { ApiMember, ApiRel } from '../../packages/family-tree-engine'
import FocusTree from '../components/FocusTree'

interface TreeData { members: ApiMember[]; relationships: ApiRel[] }

/* ── TopBar icons ── */
function IconAddMember({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="7" r="3.5"/><path d="M3 19c0-3.314 3.134-6 7-6s7 2.686 7 6"/><line x1="19" y1="9" x2="19" y2="15"/><line x1="16" y1="12" x2="22" y2="12"/></svg>
}
function IconShare({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="3" x2="12" y2="15"/><polyline points="8 7 12 3 16 7"/><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"/></svg>
}
function IconBell({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}

function TopBarRightSlot() {
  const { t } = useTranslation()
  const btn: React.CSSProperties = {
    display:'flex', alignItems:'center', justifyContent:'center',
    width:'44px', height:'44px', padding:0, background:'none', border:'none',
    cursor:'pointer', color:'var(--color-text)', fontFamily:'inherit',
    outline:'none', position:'relative', flexShrink:0,
  }
  const fo = (e: React.FocusEvent<HTMLButtonElement>) => { e.currentTarget.style.outline='3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset='2px' }
  const fb = (e: React.FocusEvent<HTMLButtonElement>) => { e.currentTarget.style.outline='none' }
  return <>
    <button aria-label={t('top_bar.add_member')} style={btn} onFocus={fo} onBlur={fb}
      onClick={() => { window.location.hash='#/b3-add' }}><IconAddMember size={22}/></button>
    <button aria-label={t('top_bar.share')} style={btn} onFocus={fo} onBlur={fb}><IconShare size={22}/></button>
    <button aria-label={t('top_bar.notifications')} style={btn} onFocus={fo} onBlur={fb}>
      <span style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <IconBell size={22}/>
        <span aria-hidden="true" style={{ position:'absolute', top:'-3px', right:'-3px', width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'var(--color-accent)', border:'2px solid var(--color-card)', display:'block' }}/>
      </span>
    </button>
  </>
}

/* ── Shell ──
 * 問題一修正：TopBar(56px fixed) + BottomTabBar(80px fixed) 已 fixed 定位，
 * <main> 用 marginTop:56px / marginBottom:80px 留出空間，
 * 不用 padding（padding 不計入 scrollHeight，會令 overflowY:auto 誤判無需 scroll）
 */
function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const tabNav = (tab: TabId) => {
    const r: Record<TabId,string> = { family_tree:'#/', family_circle:'#/family-feed', family_gathering:'#/family-gather', my_recommendations:'#/my-recommend' }
    window.location.hash = r[tab]
  }
  return (
    <div style={{ height:'100svh', backgroundColor:'var(--color-bg)', position:'relative' }}>
      <TopBar titleKey="top_bar.title" rightSlot={<TopBarRightSlot/>}/>
      <main
        role="main"
        aria-label={t('app_name')}
        style={{
          position: 'absolute',
          top: '56px',          /* TopBar 高度 */
          bottom: '80px',       /* BottomTabBar 高度 */
          left: 0,
          right: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </main>
      <BottomTabBar current="family_tree" onTabChange={tabNav}/>
    </div>
  )
}

/* ── B1HomePage ── */
export default function B1HomePage() {
  const { t } = useTranslation()
  const [tree, setTree] = useState<TreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    fetch('/api/tree', { credentials: 'include' })
      .then(res => {
        if (res.status === 401) { window.location.hash = '#/login'; return null }
        if (res.ok) return res.json()
        return { members: [], relationships: [] }
      })
      .then(async (d: TreeData | null) => {
        if (d === null) return   /* 已導向登入，唔 setTree，避免空樹一閃 */
        setTree(d)
        setLoading(false)

        /* ── 焦點 = 登入者本人（/api/family/me 之 member_id），
         *    唔再用 is_self / 最早建立者，避免以他人為中心 ── */
        let meId: string | null = null
        try {
          const meRes = await fetch('/api/family/me', { credentials: 'include' })
          if (meRes.ok) {
            const me = await meRes.json() as { member_id?: string | null }
            meId = me.member_id ?? null
          }
        } catch { /* 靜默：落返下面 fallback */ }
        setSelfId(meId)

        const focus =
          (meId && d.members.some((m: ApiMember) => m.id === meId) ? meId : null)
          ?? d.members.find((m: ApiMember) => m.is_self === 1 && m.member_kind === 'person')?.id
          ?? d.members.find((m: ApiMember) => m.member_kind === 'person')?.id
          ?? null
        if (focus) setFocusId(focus)
      })
      .catch(() => { setTree({ members: [], relationships: [] }); setLoading(false) })
  }, [])

  const handleSetFocusId = (id: string) => {
    setFocusId(id)
    setSelectedIdx(0)
  }

  if (loading) {
    return (
      <Shell>
        <p style={{ padding:'40px 16px', fontSize:'18px', color:'var(--color-text-secondary)', textAlign:'center' }}>
          {t('common.loading')}
        </p>
      </Shell>
    )
  }

  const members = tree?.members ?? []
  const relationships = tree?.relationships ?? []
  const hasPersons = members.some(m => m.member_kind === 'person')

  if (!hasPersons) {
    return (
      <Shell>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', padding:'48px 24px', textAlign:'center' }}>
          <span style={{ fontSize:'64px' }}>🌱</span>
          <h2 style={{ fontSize:'20px', fontWeight:'bold', color:'var(--color-text)', margin:0 }}>{t('empty_state.heading')}</h2>
          <p style={{ fontSize:'18px', color:'var(--color-text-secondary)', margin:0 }}>{t('empty_state.subtext')}</p>
          <button
            onClick={() => { window.location.hash='#/b3-add' }}
            style={{ marginTop:'8px', padding:'0 28px', minHeight:'56px', borderRadius:'28px', fontSize:'18px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'var(--color-primary)', color:'var(--color-card)' }}
          >{t('empty_state.cta')}</button>
        </div>
      </Shell>
    )
  }

  return <FocusContent
    members={members}
    relationships={relationships}
    focusId={focusId}
    selfId={selfId}
    selectedIdx={selectedIdx}
    setFocusId={handleSetFocusId}
    setSelectedIdx={setSelectedIdx}
  />
}

/* ── FocusContent ── */
function FocusContent({
  members, relationships, focusId, selfId, selectedIdx, setFocusId, setSelectedIdx,
}: {
  members: ApiMember[]
  relationships: ApiRel[]
  focusId: string | null
  selfId: string | null
  selectedIdx: number
  setFocusId: (id: string) => void
  setSelectedIdx: (idx: number) => void
}) {
  /* 本人 = 登入者 member_id（/api/family/me）；冇就 fallback 第一個 person */
  const resolvedSelfId = (selfId && members.some(m => m.id === selfId))
    ? selfId
    : (members.find(m => m.member_kind === 'person')?.id ?? null)

  const currentFocusId = focusId ?? resolvedSelfId ?? ''

  const focusView = useMemo(
    () => buildFocusView(members, relationships, currentFocusId),
    [members, relationships, currentFocusId],
  )

  return (
    <Shell>
      <FocusTree
        focusView={focusView}
        selectedIdx={selectedIdx}
        selfId={resolvedSelfId}
        setFocusId={setFocusId}
        setSelectedIdx={setSelectedIdx}
      />
    </Shell>
  )
}
