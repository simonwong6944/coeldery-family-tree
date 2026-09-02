/**
 * B1HomePage — 家庭樹主頁
 * 細步 4b：完全移除 mock，改用 /api/tree 真實資料渲染分代家庭樹。
 * 空狀態 → 引導按鈕。有資料 → 按 marriage/parent_child 邊排代渲染。
 * SVG Icons 及 TopBarRightSlot 為 B1 專用，留在頁面層。
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo, PetInfo } from '../../packages/household-card'
import ConnectionLine from '../../packages/connection-line'
import { GenLabel, Gen3Member, GenSection } from '../../packages/gen-section'

interface ApiMember { id: string; display_name: string; member_kind: string; birth_date: string | null; avatar_url: string | null }
interface ApiRel { id: string; from_member: string; to_member: string; edge_type: string; status: string | null }
interface TreeData { members: ApiMember[]; relationships: ApiRel[] }

function toMemberInfo(m: ApiMember, relation: string): MemberInfo {
  return { name: m.display_name, relation, avatarUrl: m.avatar_url ?? undefined }
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

/** 從 tree 資料解析出各代成員 ID 集合 */
function buildGenerations(data: TreeData) {
  const byId = new Map(data.members.map(m => [m.id, m]))
  const marriages = data.relationships.filter(r => r.edge_type === 'marriage')
  const parentChild = data.relationships.filter(r => r.edge_type === 'parent_child')
  const petOwner = data.relationships.filter(r => r.edge_type === 'pet_owner')

  // Gen1：第一條 marriage 邊的兩人；若無 marriage 邊，Gen1 = 第一個人成員（單人）
  const firstMarriage = marriages[0]
  const gen1Ids: string[] = firstMarriage
    ? [firstMarriage.from_member, firstMarriage.to_member]
    : data.members.filter(m => m.member_kind === 'person').slice(0, 1).map(m => m.id)

  const gen1Set = new Set(gen1Ids)

  // Gen2：parent_child 中 from_member 在 Gen1 的子女 (to_member)
  const gen2Ids = [...new Set(parentChild.filter(r => gen1Set.has(r.from_member)).map(r => r.to_member))]
  const gen2Set = new Set(gen2Ids)

  // Gen3：parent_child 中 from_member 在 Gen2 的子女 (to_member)
  const gen3Ids = [...new Set(parentChild.filter(r => gen2Set.has(r.from_member)).map(r => r.to_member))]

  // 寵物：pet_owner 邊的 to_member
  const petIds = [...new Set(petOwner.map(r => r.to_member))]

  // 已分配 ID 集合（排除未分類）
  const assigned = new Set([...gen1Ids, ...gen2Ids, ...gen3Ids, ...petIds])
  // 未分類的 person（尚無關係邊）→ 加入 Gen1 顯示
  const unclassifiedPersons = data.members.filter(m => m.member_kind === 'person' && !assigned.has(m.id))

  return { byId, gen1Ids: [...gen1Ids, ...unclassifiedPersons.map(m => m.id)], gen2Ids, gen3Ids, petIds, firstMarriage }
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
  const hasMembers = members.length > 0

  // ── 空狀態 ──
  if (!hasMembers) return wrap(
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', padding:'48px 24px', textAlign:'center' }}>
      <span style={{ fontSize:'64px' }}>🌱</span>
      <h2 style={{ fontSize:'20px', fontWeight:'bold', color:'var(--color-text)', margin:0 }}>家庭樹尚無成員</h2>
      <p style={{ fontSize:'18px', color:'var(--color-text-secondary)', margin:0 }}>點擊右上角 ＋ 開始建立您的家庭樹</p>
      <button onClick={() => { window.location.hash='#/b3-add' }} style={{ marginTop:'8px', padding:'0 28px', minHeight:'56px', borderRadius:'28px', fontSize:'18px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'var(--color-primary)', color:'var(--color-card)' }}>
        加入第一位家人
      </button>
    </div>
  )

  // ── 有成員：解析並渲染 ──
  const { byId, gen1Ids, gen2Ids, gen3Ids, petIds } = buildGenerations({ members, relationships })

  const gen1Primary = byId.get(gen1Ids[0])
  const gen1Secondary = byId.get(gen1Ids[1])
  const gen2Members = gen2Ids.map(id => byId.get(id)).filter(Boolean) as ApiMember[]
  const gen3Members = gen3Ids.map(id => byId.get(id)).filter(Boolean) as ApiMember[]
  const petMembers = petIds.map(id => byId.get(id)).filter(Boolean) as ApiMember[]

  // 配合 Gen2 的第一個 household（含可能的 marriage 邊配對）
  const gen2Marriages = relationships.filter(r => r.edge_type === 'marriage' && gen2Ids.includes(r.from_member) && gen2Ids.includes(r.to_member))
  const gen2Couple = gen2Marriages[0] ? [gen2Marriages[0].from_member, gen2Marriages[0].to_member] : []
  const gen2FocPrimary: MemberInfo | undefined = gen2Members[0] ? toMemberInfo(gen2Members[0], gen2Couple.includes(gen2Members[0].id) ? t('gen2.member_eldest_son_relation') : '') : undefined
  const gen2FocSecondary: MemberInfo | undefined = gen2Members[1] && gen2Couple.length > 0 ? toMemberInfo(gen2Members[1], t('gen2.member_eldest_daughter_in_law_relation')) : undefined
  const firstPet = petMembers[0]
  const petInfo: PetInfo | undefined = firstPet ? { name: firstPet.display_name, petType: '寵物', ownerRelation: '', avatarUrl: firstPet.avatar_url ?? undefined } : undefined

  const gen2Variant = gen2FocSecondary ? (petInfo ? 'couple_with_pet' : 'couple') : 'single'

  return wrap(<>
    {/* ─── GEN 1 ─── */}
    {gen1Primary && <section aria-label={t('gen1.layer_label')} style={{ width:'100%', padding:'24px 16px 0', display:'flex', flexDirection:'column', alignItems:'center', boxSizing:'border-box' }}>
      <GenLabel labelKey="gen1.layer_label"/>
      <HouseholdCard variant={gen1Secondary ? 'couple' : 'single'} primaryMember={toMemberInfo(gen1Primary, t('gen1.member_self_relation'))} secondaryMember={gen1Secondary ? toMemberInfo(gen1Secondary, t('gen1.member_spouse_relation')) : undefined} avatarSize={80} isFocused={false} width="100%"/>
      {(gen2Members.length > 0 || petMembers.length > 0) && <ConnectionLine height={24}/>}
    </section>}

    {/* ─── GEN 2 ─── */}
    {gen2FocPrimary && <section aria-label={t('gen2.layer_label')} style={{ width:'100%', padding:'0 16px', display:'flex', flexDirection:'column', alignItems:'center', boxSizing:'border-box' }}>
      <GenLabel labelKey="gen2.layer_label"/>
      <HouseholdCard variant={gen2Variant} primaryMember={gen2FocPrimary} secondaryMember={gen2FocSecondary} pet={petInfo} avatarSize={64} isFocused={false} width="100%"/>
      {gen3Members.length > 0 && <><div style={{ marginTop:'8px' }}><ConnectionLine height={24}/></div></>}
    </section>}

    {/* ─── GEN 3 ─── */}
    {gen3Members.length > 0 && <GenSection labelKey="gen3.layer_label" dotsTotal={gen3Members.length} dotsActive={0} bottomSpacer={32}>
      {gen3Members.map(m => <Gen3Member key={m.id} member={toMemberInfo(m, t('gen3.member_grandson_relation'))} size={64}/>)}
    </GenSection>}

    {/* ─── 孤立成員（有成員但無關係邊）─── */}
    {!gen2FocPrimary && !gen1Primary && members.filter(m=>m.member_kind==='person').length > 0 && (
      <section style={{ width:'100%', padding:'24px 16px 0', boxSizing:'border-box' }}>
        <GenLabel labelKey="gen1.layer_label"/>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'12px', justifyContent:'center' }}>
          {members.filter(m=>m.member_kind==='person').map(m => (
            <HouseholdCard key={m.id} variant="single" primaryMember={toMemberInfo(m, '')} avatarSize={72} isFocused={false} width="160px"/>
          ))}
        </div>
      </section>
    )}
  </>)
}
