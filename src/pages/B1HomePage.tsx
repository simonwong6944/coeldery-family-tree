/**
 * B1HomePage — 家庭樹主頁
 * 細步 4c：通用分代演算法（BFS），支援多子女、向上長輩代、任意結構。
 * 使用 packages/family-tree-engine 計算 level，渲染每代全部成員。
 * 頁面 ≤ 200 行。
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo, PetInfo } from '../../packages/household-card'
import ConnectionLine from '../../packages/connection-line'
import { GenLabel } from '../../packages/gen-section'
import { buildLevels, buildTreeLevels } from '../../packages/family-tree-engine'
import type { ApiMember, ApiRel, Household, TreeLevel } from '../../packages/family-tree-engine'

interface TreeData { members: ApiMember[]; relationships: ApiRel[] }

function toMemberInfo(m: ApiMember, relation: string): MemberInfo {
  return { name: m.display_name, relation, avatarUrl: m.avatar_url ?? undefined }
}

function toPetInfo(p: ApiMember, ownerRelation: string): PetInfo {
  return { name: p.display_name, petType: '寵物', ownerRelation, avatarUrl: p.avatar_url ?? undefined }
}

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

/** 根據 level 數值返回對應的 i18n label key */
function levelLabelKey(level: number): string {
  const map: Record<number, string> = {
    [-3]: 'gen.layer_label_minus3',
    [-2]: 'gen.layer_label_minus2',
    [-1]: 'gen.layer_label_minus1',
    [0]:  'gen.layer_label_0',
    [1]:  'gen.layer_label_1',
    [2]:  'gen.layer_label_2',
    [3]:  'gen.layer_label_3',
  }
  return map[level] ?? 'gen.layer_label_other'
}

/** 渲染單一 Household Card，點擊進入成員詳情頁 */
function HouseholdBlock({ household, avatarSize }: { household: Household; avatarSize: number }) {
  const { t } = useTranslation()
  const primary = toMemberInfo(household.primary, t('gen.member_relation_person'))
  const secondary = household.spouse ? toMemberInfo(household.spouse, t('gen.member_relation_person')) : undefined
  const firstPet = household.pets[0]
  const petInfo: PetInfo | undefined = firstPet ? toPetInfo(firstPet, primary.name) : undefined

  const variant = secondary
    ? (petInfo ? 'couple_with_pet' : 'couple')
    : 'single'

  return (
    <button
      aria-label={`${primary.name} 成員詳情`}
      onClick={() => { window.location.hash = `#/member/${household.primary.id}` }}
      style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'block', flexShrink:0 }}
    >
      <HouseholdCard
        variant={variant}
        primaryMember={primary}
        secondaryMember={secondary}
        pet={petInfo}
        avatarSize={avatarSize}
        isFocused={false}
        width="auto"
      />
    </button>
  )
}

/** 渲染一個代層橫帶 */
function LevelBand({ treeLevel, avatarSize, hasChildrenBelow }: { treeLevel: TreeLevel; avatarSize: number; hasChildrenBelow: boolean }) {
  const { t } = useTranslation()
  const labelKey = levelLabelKey(treeLevel.level)
  const labelText = labelKey === 'gen.layer_label_other'
    ? t(labelKey, { level: treeLevel.level })
    : t(labelKey)

  return (
    <section
      aria-label={labelText}
      style={{ width:'100%', padding:'16px 16px 0', display:'flex', flexDirection:'column', alignItems:'center', boxSizing:'border-box', overflowX:'hidden' }}
    >
      <GenLabel labelKey={labelKey}/>
      {/* 每代恆定一行，可左右橫向捲動，不換行 */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div style={{ display:'flex', flexWrap:'nowrap', overflowX:'auto', gap:'12px', paddingBottom:'4px', width:'100%' } as any}>
        {treeLevel.households.map((hh, idx) => (
          <HouseholdBlock key={hh.primary.id + idx} household={hh} avatarSize={avatarSize}/>
        ))}
      </div>
      {hasChildrenBelow && <div style={{ marginTop:'8px' }}><ConnectionLine height={24}/></div>}
    </section>
  )
}

export default function B1HomePage() {
  const { t } = useTranslation()
  const [tree, setTree] = useState<TreeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tree').then(r => r.ok ? r.json() : { members: [], relationships: [] })
      .then((d: TreeData) => { setTree(d); setLoading(false) })
      .catch(() => { setTree({ members: [], relationships: [] }); setLoading(false) })
  }, [])

  const tabNav = (tab: TabId) => {
    const r: Record<TabId,string> = { family_tree:'#/', family_circle:'#/family-feed', family_gathering:'#/family-gather', my_recommendations:'#/my-recommend' }
    window.location.hash = r[tab]
  }

  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight:'100svh', backgroundColor:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
      <TopBar titleKey="top_bar.title" rightSlot={<TopBarRightSlot/>}/>
      <main role="main" aria-label={t('app_name')} style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingTop:'56px', paddingBottom:'80px', display:'flex', flexDirection:'column', alignItems:'center' }}>
        {children}
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

  // 判斷每個 level 是否在下方有子代（用於是否顯示 ConnectionLine）
  const levelSet = new Set(treeLevels.map(tl => tl.level))

  return wrap(<>
    {treeLevels.map((tl, idx) => {
      const hasChildrenBelow = levelSet.has(tl.level + 1)
      // 下一層距目前層 level 差是否恰好 1（連接線只在直接父子代之間）
      const nextLevel = treeLevels[idx + 1]
      const isDirectParent = nextLevel !== undefined && nextLevel.level === tl.level + 1
      const avatarSize = tl.level === 0 ? 80 : 64
      return (
        <LevelBand
          key={tl.level}
          treeLevel={tl}
          avatarSize={avatarSize}
          hasChildrenBelow={hasChildrenBelow && isDirectParent}
        />
      )
    })}
  </>)
}
