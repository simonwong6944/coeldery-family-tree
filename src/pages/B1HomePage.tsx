/**
 * B1HomePage — 家庭樹主頁
 * 細步 4c/4e：通用分代演算法（BFS），支援多子女、向上長輩代、任意結構。
 * 細步 4f：整合 TreeConnectors SVG overlay（動態父子連線）。
 * 頁面 ≤ 200 行。
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import { buildLevels, buildTreeLevels } from '../../packages/family-tree-engine'
import type { ApiMember, ApiRel, TreeLevel } from '../../packages/family-tree-engine'
import { LevelBand } from '../components/TreeBand'
import TreeConnectors, { buildConnectorEdges } from '../components/TreeConnectors'
import type { ConnectorEdge } from '../components/TreeConnectors'

interface TreeData { members: ApiMember[]; relationships: ApiRel[] }

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
  const btn: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'center', width:'44px', height:'44px', padding:0, background:'none', border:'none', cursor:'pointer', color:'var(--color-text)', fontFamily:'inherit', outline:'none', position:'relative', flexShrink:0 }
  const fo = (e: React.FocusEvent<HTMLButtonElement>) => { e.currentTarget.style.outline='3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset='2px' }
  const fb = (e: React.FocusEvent<HTMLButtonElement>) => { e.currentTarget.style.outline='none' }
  return <>
    <button aria-label={t('top_bar.add_member')} style={btn} onFocus={fo} onBlur={fb} onClick={() => { window.location.hash='#/b3-add' }}><IconAddMember size={22}/></button>
    <button aria-label={t('top_bar.share')} style={btn} onFocus={fo} onBlur={fb}><IconShare size={22}/></button>
    <button aria-label={t('top_bar.notifications')} style={btn} onFocus={fo} onBlur={fb}>
      <span style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <IconBell size={22}/>
        <span aria-hidden="true" style={{ position:'absolute', top:'-3px', right:'-3px', width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'var(--color-accent)', border:'2px solid var(--color-card)', display:'block' }}/>
      </span>
    </button>
  </>
}

export default function B1HomePage() {
  const { t } = useTranslation()
  const [tree, setTree] = useState<TreeData | null>(null)
  const [loading, setLoading] = useState(true)

  // 整棵樹容器 ref（TreeConnectors SVG overlay 的定位基準）
  const treeContainerRef = useRef<HTMLDivElement | null>(null)

  // 各代 scrollWrapper 的 ref 陣列（每個代的橫捲容器）
  // 用 Map<level, HTMLElement> 確保同一代的 ref 只保留最新
  const scrollRefMap = useRef<Map<number, HTMLElement>>(new Map())
  const scrollRefList = useRef<React.RefObject<HTMLElement | null>[]>([])

  useEffect(() => {
    fetch('/api/tree').then(r => r.ok ? r.json() : { members: [], relationships: [] })
      .then((d: TreeData) => { setTree(d); setLoading(false) })
      .catch(() => { setTree({ members: [], relationships: [] }); setLoading(false) })
  }, [])

  const tabNav = (tab: TabId) => {
    const r: Record<TabId,string> = { family_tree:'#/', family_circle:'#/family-feed', family_gathering:'#/family-gather', my_recommendations:'#/my-recommend' }
    window.location.hash = r[tab]
  }

  const wrap = (children: React.ReactNode, withTree = false) => (
    <div style={{ minHeight:'100svh', backgroundColor:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
      <TopBar titleKey="top_bar.title" rightSlot={<TopBarRightSlot/>}/>
      <main role="main" aria-label={t('app_name')} style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingTop:'56px', paddingBottom:'80px', display:'flex', flexDirection:'column', alignItems:'center' }}>
        {withTree
          ? <div ref={treeContainerRef} style={{ position:'relative', width:'100%', display:'flex', flexDirection:'column', alignItems:'center' }}>{children}</div>
          : children
        }
      </main>
      <BottomTabBar current="family_tree" onTabChange={tabNav}/>
    </div>
  )

  if (loading) return wrap(<p style={{ padding:'40px 16px', fontSize:'18px', color:'var(--color-text-secondary)' }}>載入中⋯</p>)

  const members = tree?.members ?? []
  const relationships = tree?.relationships ?? []
  const hasPersons = members.some(m => m.member_kind === 'person')

  // ── 空狀態 ──
  if (!hasPersons) return wrap(
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', padding:'48px 24px', textAlign:'center' }}>
      <span style={{ fontSize:'64px' }}>🌱</span>
      <h2 style={{ fontSize:'20px', fontWeight:'bold', color:'var(--color-text)', margin:0 }}>家庭樹尚無成員</h2>
      <p style={{ fontSize:'18px', color:'var(--color-text-secondary)', margin:0 }}>點擊右上角 ＋ 開始建立您的家庭樹</p>
      <button onClick={() => { window.location.hash='#/b3-add' }} style={{ marginTop:'8px', padding:'0 28px', minHeight:'56px', borderRadius:'28px', fontSize:'18px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'var(--color-primary)', color:'var(--color-card)' }}>
        加入第一位家人
      </button>
    </div>
  )

  // ── BFS 分代 ──
  const levelMap = buildLevels(members, relationships)
  const treeLevels: TreeLevel[] = buildTreeLevels(members, relationships, levelMap)
  const levelSet = new Set(treeLevels.map(tl => tl.level))

  return <TreeContent
    treeLevels={treeLevels}
    levelSet={levelSet}
    relationships={relationships}
    treeContainerRef={treeContainerRef}
    scrollRefMap={scrollRefMap}
    scrollRefList={scrollRefList}
    wrap={wrap}
    t={t}
  />
}

/* ── TreeContent — 分離以避免 hooks-in-conditional 問題 ── */
function TreeContent({
  treeLevels, levelSet, relationships, treeContainerRef, scrollRefMap, scrollRefList, wrap,
}: {
  treeLevels: TreeLevel[]
  levelSet: Set<number>
  relationships: ApiRel[]
  treeContainerRef: React.RefObject<HTMLDivElement | null>
  scrollRefMap: React.MutableRefObject<Map<number, HTMLElement>>
  scrollRefList: React.MutableRefObject<React.RefObject<HTMLElement | null>[]>
  wrap: (children: React.ReactNode, withTree?: boolean) => React.ReactNode
  t: ReturnType<typeof useTranslation>['t']
}) {
  // 建立 householdMemberRoles Map（memberId → 'primary' | 'spouse'）
  // 只有配偶模式的成員才進 Map；光身成員不在 Map，side=undefined
  const householdMemberRoles = useMemo(() => {
    const map = new Map<string, 'primary' | 'spouse'>()
    for (const tl of treeLevels) {
      for (const hh of tl.households) {
        if (hh.spouse) {
          map.set(hh.primary.id, 'primary')
          map.set(hh.spouse.id, 'spouse')
        }
        // 光身 primary 不加入 map → side=undefined → getMemberCenter 用整塊 div
      }
    }
    return map
  }, [treeLevels])

  // 建立 ConnectorEdge[]
  const edges: ConnectorEdge[] = useMemo(
    () => buildConnectorEdges(relationships, householdMemberRoles),
    [relationships, householdMemberRoles],
  )

  // 收集各代 scrollWrapper ref：每次 LevelBand mount/unmount 時更新
  const handleScrollRef = useCallback((level: number, el: HTMLElement | null) => {
    if (el) {
      scrollRefMap.current.set(level, el)
    } else {
      scrollRefMap.current.delete(level)
    }
    // 重建 scrollRefList（ref 物件陣列）
    scrollRefList.current = Array.from(scrollRefMap.current.values()).map(dom => ({
      current: dom,
    }))
  }, [scrollRefMap, scrollRefList])

  return wrap(<>
    {treeLevels.map((tl, idx) => {
      const hasChildrenBelow = levelSet.has(tl.level + 1)
      const nextLevel = treeLevels[idx + 1]
      const isDirectParent = nextLevel !== undefined && nextLevel.level === tl.level + 1
      const avatarSize = tl.level === 0 ? 80 : 64
      return (
        <LevelBand
          key={tl.level}
          treeLevel={tl}
          avatarSize={avatarSize}
          hasChildrenBelow={hasChildrenBelow && isDirectParent}
          onScrollRef={(el) => handleScrollRef(tl.level, el)}
        />
      )
    })}
    <TreeConnectors
      containerRef={treeContainerRef}
      edges={edges}
      scrollRefs={scrollRefList.current}
    />
  </>, true)
}
