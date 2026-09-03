/**
 * B1HomePage — 焦點式家庭樹主頁（細步 4g）
 *
 * 重寫要點：
 *   - focusId state：初始 = is_self=1 成員；無 is_self → 第一個 person
 *   - selectedIdx state：中層目前選中的 household index（決定下層）
 *   - 呼叫 buildFocusView(members, relationships, focusId, selectedIdx) 取得三層視圖
 *   - FocusTree component 負責渲染 + carousel + 連線
 *
 * 階段一：以 is_self=1 為焦點；將來 SSO 接入後改用登入者。
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

/* ── Shell ── */
function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const tabNav = (tab: TabId) => {
    const r: Record<TabId,string> = { family_tree:'#/', family_circle:'#/family-feed', family_gathering:'#/family-gather', my_recommendations:'#/my-recommend' }
    window.location.hash = r[tab]
  }
  return (
    <div style={{ minHeight:'100svh', backgroundColor:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
      <TopBar titleKey="top_bar.title" rightSlot={<TopBarRightSlot/>}/>
      <main role="main" aria-label={t('app_name')} style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingTop:'56px', paddingBottom:'80px' }}>
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
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    fetch('/api/tree')
      .then(r => r.ok ? r.json() : { members: [], relationships: [] })
      .then((d: TreeData) => {
        setTree(d)
        setLoading(false)
        // 初始焦點 = is_self=1；若無則取第一個 person
        const selfMember = d.members.find((m: ApiMember) => m.is_self === 1 && m.member_kind === 'person')
          ?? d.members.find((m: ApiMember) => m.member_kind === 'person')
        if (selfMember) setFocusId(selfMember.id)
      })
      .catch(() => { setTree({ members: [], relationships: [] }); setLoading(false) })
  }, [])

  // 換焦點時重設下層 selectedIdx
  const handleSetFocusId = (id: string) => {
    setFocusId(id)
    setSelectedIdx(0)
  }

  if (loading) {
    return (
      <Shell>
        <p style={{ padding:'40px 16px', fontSize:'18px', color:'var(--color-text-secondary)', textAlign:'center' }}>
          載入中⋯
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
          <h2 style={{ fontSize:'20px', fontWeight:'bold', color:'var(--color-text)', margin:0 }}>家庭樹尚無成員</h2>
          <p style={{ fontSize:'18px', color:'var(--color-text-secondary)', margin:0 }}>點擊右上角 ＋ 開始建立您的家庭樹</p>
          <button
            onClick={() => { window.location.hash='#/b3-add' }}
            style={{ marginTop:'8px', padding:'0 28px', minHeight:'56px', borderRadius:'28px', fontSize:'18px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'var(--color-primary)', color:'var(--color-card)' }}
          >{t('empty_state.cta_btn')}</button>
        </div>
      </Shell>
    )
  }

  return <FocusContent
    members={members}
    relationships={relationships}
    focusId={focusId}
    selectedIdx={selectedIdx}
    setFocusId={handleSetFocusId}
    setSelectedIdx={setSelectedIdx}
  />
}

/* ── FocusContent — 拆分以避免 hooks-in-conditional ── */
function FocusContent({
  members, relationships, focusId, selectedIdx, setFocusId, setSelectedIdx,
}: {
  members: ApiMember[]
  relationships: ApiRel[]
  focusId: string | null
  selectedIdx: number
  setFocusId: (id: string) => void
  setSelectedIdx: (idx: number) => void
}) {
  const selfMember = members.find(m => m.is_self === 1 && m.member_kind === 'person')
    ?? members.find(m => m.member_kind === 'person')

  const currentFocusId = focusId ?? selfMember?.id ?? ''

  const focusView = useMemo(
    () => buildFocusView(members, relationships, currentFocusId),
    [members, relationships, currentFocusId],
  )

  return (
    <Shell>
      <FocusTree
        focusView={focusView}
        selectedIdx={selectedIdx}
        selfId={selfMember?.id ?? null}
        setFocusId={setFocusId}
        setSelectedIdx={setSelectedIdx}
      />
    </Shell>
  )
}
