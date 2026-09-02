/**
 * B1HomePage — 家庭樹主頁
 * 依 .coappery/design/B1.md 規範實作。細步 3c：抽出三個 module 後的精簡版。
 * 細步 4a：useEffect 讀取 /api/tree；若有真實成員則顯示已加入列表；否則顯示 mock UI。
 * SVG Icons 及 TopBarRightSlot 為 B1 專用，留在頁面層。
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo } from '../../packages/household-card'
import ConnectionLine from '../../packages/connection-line'
import GenCarousel from '../../packages/gen-carousel'
import { GenLabel, Gen3Member, GenSection } from '../../packages/gen-section'

interface ApiMember { id: string; display_name: string; member_kind: string; birth_date: string | null; avatar_url: string | null }

function IconAddMember({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="7" r="3.5" /><path d="M3 19c0-3.314 3.134-6 7-6s7 2.686 7 6" /><line x1="19" y1="9" x2="19" y2="15" /><line x1="16" y1="12" x2="22" y2="12" /></svg>
}
function IconShare({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="3" x2="12" y2="15" /><polyline points="8 7 12 3 16 7" /><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></svg>
}
function IconBell({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}

function TopBarRightSlot() {
  const { t } = useTranslation()
  const btn: React.CSSProperties = { display:'flex', alignItems:'center', justifyContent:'center', width:'44px', height:'44px', padding:0, background:'none', border:'none', cursor:'pointer', color:'var(--color-text)', fontFamily:'inherit', outline:'none', position:'relative', flexShrink:0 }
  const fo = (e: React.FocusEvent<HTMLButtonElement>) => { e.currentTarget.style.outline='3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset='2px' }
  const fb = (e: React.FocusEvent<HTMLButtonElement>) => { e.currentTarget.style.outline='none' }
  return <>
    <button aria-label={t('top_bar.add_member')} style={btn} onFocus={fo} onBlur={fb} onClick={() => { window.location.hash='#/b3-add' }}><IconAddMember size={22} /></button>
    <button aria-label={t('top_bar.share')} style={btn} onFocus={fo} onBlur={fb}><IconShare size={22} /></button>
    <button aria-label={t('top_bar.notifications')} style={btn} onFocus={fo} onBlur={fb}>
      <span style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <IconBell size={22} />
        <span aria-hidden="true" style={{ position:'absolute', top:'-3px', right:'-3px', width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'var(--color-accent)', border:'2px solid var(--color-card)', display:'block' }} />
      </span>
    </button>
  </>
}

export default function B1HomePage() {
  const { t } = useTranslation()
  const [apiMembers, setApiMembers] = useState<ApiMember[]>([])

  useEffect(() => {
    fetch('/api/tree')
      .then(r => r.ok ? r.json() : { members: [] })
      .then((data: { members?: ApiMember[] }) => { if (data.members?.length) setApiMembers(data.members) })
      .catch(() => { /* network error — keep mock UI */ })
  }, [])

  // mockup placeholder 外部圖 URL，正式版須替換為使用者實際上載圖片
  const AVATAR_SELF='https://randomuser.me/api/portraits/men/72.jpg', AVATAR_SPOUSE='https://randomuser.me/api/portraits/women/68.jpg'
  const AVATAR_SON='https://randomuser.me/api/portraits/men/32.jpg', AVATAR_DIL='https://randomuser.me/api/portraits/women/44.jpg'
  const AVATAR_GRANDSON='https://randomuser.me/api/portraits/men/85.jpg', AVATAR_GRANDDAUGHTER='https://randomuser.me/api/portraits/women/90.jpg'
  const AVATAR_DOG='https://images.dog.ceo/breeds/retriever-golden/n02099601_3004.jpg'

  const gen1Primary: MemberInfo    = { name:t('gen1.member_self_name'),                    relation:t('gen1.member_self_relation'),                    avatarUrl:AVATAR_SELF }
  const gen1Secondary: MemberInfo  = { name:t('gen1.member_spouse_name'),                   relation:t('gen1.member_spouse_relation'),                   avatarUrl:AVATAR_SPOUSE }
  const gen2FocPrimary: MemberInfo = { name:t('gen2.member_eldest_son_name'),               relation:t('gen2.member_eldest_son_relation'),               avatarUrl:AVATAR_SON }
  const gen2FocSecondary: MemberInfo = { name:t('gen2.member_eldest_daughter_in_law_name'), relation:t('gen2.member_eldest_daughter_in_law_relation'),   showNotificationDot:true, avatarUrl:AVATAR_DIL }
  const gen2PeekLeft: MemberInfo   = { name:t('gen2.member_daughter'),                      relation:t('gen2.member_daughter_relation') }
  const gen2PeekRight: MemberInfo  = { name:t('gen2.member_youngest_son'),                  relation:t('gen2.member_youngest_son_relation') }
  const gen3Grandson: MemberInfo   = { name:t('gen3.member_grandson_name'),                 relation:t('gen3.member_grandson_relation'),                 avatarUrl:AVATAR_GRANDSON }
  const gen3Granddaughter: MemberInfo = { name:t('gen3.member_granddaughter_name'),         relation:t('gen3.member_granddaughter_relation'),            avatarUrl:AVATAR_GRANDDAUGHTER }

  return (
    <div style={{ minHeight:'100svh', backgroundColor:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
      <TopBar titleKey="top_bar.title" rightSlot={<TopBarRightSlot />} />
      <main role="main" aria-label={t('app_name')} style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingTop:'56px', paddingBottom:'80px', display:'flex', flexDirection:'column', alignItems:'center' }}>

        {/* ─── 真實成員列表（API 有數據時顯示）─── */}
        {apiMembers.length > 0 && (
          <section aria-label="已加入成員" style={{ width:'100%', padding:'16px 16px 0', boxSizing:'border-box' }}>
            <p style={{ fontSize:'18px', fontWeight:'bold', color:'var(--color-primary)', margin:'0 0 10px' }}>已加入 {apiMembers.length} 位成員</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', marginBottom:'16px' }}>
              {apiMembers.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', borderRadius:'24px', backgroundColor:'var(--color-card)', boxShadow:'var(--shadow-subtle)', fontSize:'18px' }}>
                  <span>{m.member_kind==='pet'?'🐾':'👤'}</span>
                  <span style={{ color:'var(--color-text)', fontWeight:'bold' }}>{m.display_name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── GEN 1 ─── */}
        <section aria-label={t('gen1.layer_label')} style={{ width:'100%', padding:'24px 16px 0', display:'flex', flexDirection:'column', alignItems:'center', boxSizing:'border-box' }}>
          <GenLabel labelKey="gen1.layer_label" />
          <HouseholdCard variant="couple" primaryMember={gen1Primary} secondaryMember={gen1Secondary} avatarSize={80} isFocused={false} width="100%" />
          <ConnectionLine height={24} />
        </section>

        {/* ─── GEN 2 ─── */}
        <section aria-label={t('gen2.layer_label')} style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center', boxSizing:'border-box' }}>
          <GenLabel labelKey="gen2.layer_label" />
          <GenCarousel ariaLabelKey="gen2.layer_label" focusedPrimary={gen2FocPrimary} focusedSecondary={gen2FocSecondary}
            focusedPet={{ name:t('gen2.pet_name'), petType:t('gen2.pet_type'), ownerRelation:t('gen2.pet_owner_relation'), avatarUrl:AVATAR_DOG }}
            focusedAvatarSize={64} leftPeekPrimary={gen2PeekLeft} rightPeekPrimary={gen2PeekRight} dotsTotal={3} dotsActive={0} />
          <div style={{ marginTop:'8px' }}><ConnectionLine height={24} /></div>
        </section>

        {/* ─── GEN 3 ─── */}
        <GenSection labelKey="gen3.layer_label" dotsTotal={2} dotsActive={0} bottomSpacer={32}>
          <Gen3Member member={gen3Grandson} size={64} />
          <Gen3Member member={gen3Granddaughter} size={64} />
        </GenSection>

      </main>
      <BottomTabBar current="family_tree" onTabChange={(tab: TabId) => {
        const r: Record<TabId,string> = { family_tree:'#/', family_circle:'#/family-feed', family_gathering:'#/family-gather', my_recommendations:'#/my-recommend' }
        window.location.hash = r[tab]
      }} />
    </div>
  )
}
