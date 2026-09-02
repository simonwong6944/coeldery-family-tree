/**
 * TreeBand — 家庭樹代層橫帶組件
 * 包含：HouseholdBlock（含本人標記 + 配偶各自可點）、LevelBand
 * 由 B1HomePage 使用。
 * module ≤ 250 行。
 */

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo, PetInfo } from '../../packages/household-card'
import { GenLabel } from '../../packages/gen-section'
import type { ApiMember, Household, TreeLevel } from '../../packages/family-tree-engine'

/* ── helpers ── */

export function toMemberInfo(m: ApiMember, relation: string): MemberInfo {
  return { name: m.display_name, relation, avatarUrl: m.avatar_url ?? undefined }
}

export function toPetInfo(p: ApiMember, ownerRelation: string): PetInfo {
  return { name: p.display_name, petType: '寵物', ownerRelation, avatarUrl: p.avatar_url ?? undefined }
}

export function levelLabelKey(level: number): string {
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

/* ── HouseholdBlock ──
 *  - 光身：整張卡可點入 primary
 *  - 配偶：透明左/右半按鈕各自可點
 *  - 本人標記：is_self=1 顯示「本人」細標籤
 *  - data-member-id / data-member-side：供 TreeConnectors SVG overlay 定位
 */
export function HouseholdBlock({ household, avatarSize }: { household: Household; avatarSize: number }) {
  const { t } = useTranslation()
  const primary = toMemberInfo(household.primary, t('gen.member_relation_person'))
  const secondary = household.spouse ? toMemberInfo(household.spouse, t('gen.member_relation_person')) : undefined
  const firstPet = household.pets[0]
  const petInfo: PetInfo | undefined = firstPet ? toPetInfo(firstPet, primary.name) : undefined
  const isSelf = household.primary.is_self === 1

  const variant = secondary
    ? (petInfo ? 'couple_with_pet' : 'couple')
    : 'single'

  const selfBadge = (
    <span style={{
      position:'absolute', top:'6px', left:'50%', transform:'translateX(-50%)',
      fontSize:'11px', fontWeight:'bold', color:'var(--color-primary)',
      backgroundColor:'var(--color-card)', border:'1.5px solid var(--color-primary)',
      borderRadius:'10px', padding:'1px 8px', pointerEvents:'none', whiteSpace:'nowrap',
      zIndex:1,
    }}>{t('gen.self_badge')}</span>
  )

  // 光身 / 無配偶
  // data-member-id 掛在外層 div，供 TreeConnectors 用無 side 查詢定位整個 block 中心
  if (!secondary) {
    return (
      <div
        data-member-id={household.primary.id}
        style={{ position:'relative', flexShrink:0 }}
      >
        <button
          aria-label={`${primary.name} 成員詳情`}
          onClick={() => { window.location.hash = `#/member/${household.primary.id}` }}
          style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'block' }}
        >
          <HouseholdCard variant={variant} primaryMember={primary}
            pet={petInfo} avatarSize={avatarSize} isFocused={false} width="auto"/>
        </button>
        {isSelf && selfBadge}
      </div>
    )
  }

  // 配偶模式：疊加透明左/右半按鈕
  // data-member-id + data-member-side 分別掛在左/右半按鈕上，供 TreeConnectors 精確定位各半邊
  return (
    <div style={{ position:'relative', flexShrink:0, display:'inline-block' }}>
      <HouseholdCard
        variant={variant} primaryMember={primary} secondaryMember={secondary}
        pet={petInfo} avatarSize={avatarSize} isFocused={false} width="auto"
      />
      {/* 左半：primary — data-member-side="primary" */}
      <button
        aria-label={`${primary.name} 成員詳情`}
        data-member-id={household.primary.id}
        data-member-side="primary"
        onClick={() => { window.location.hash = `#/member/${household.primary.id}` }}
        style={{
          position:'absolute', top:0, left:0, width:'48%', height:'100%',
          background:'transparent', border:'none', cursor:'pointer', padding:0,
        }}
      />
      {/* 右半：spouse — data-member-side="spouse" */}
      <button
        aria-label={`${secondary.name} 成員詳情`}
        data-member-id={household.spouse!.id}
        data-member-side="spouse"
        onClick={() => { window.location.hash = `#/member/${household.spouse!.id}` }}
        style={{
          position:'absolute', top:0, right:0, width:'52%', height:'100%',
          background:'transparent', border:'none', cursor:'pointer', padding:0,
        }}
      />
      {/* 本人標記（顯示在 primary 位置上方） */}
      {isSelf && (
        <span style={{
          position:'absolute', top:'6px', left:'24%', transform:'translateX(-50%)',
          fontSize:'11px', fontWeight:'bold', color:'var(--color-primary)',
          backgroundColor:'var(--color-card)', border:'1.5px solid var(--color-primary)',
          borderRadius:'10px', padding:'1px 8px', pointerEvents:'none', whiteSpace:'nowrap',
          zIndex:1,
        }}>{t('gen.self_badge')}</span>
      )}
    </div>
  )
}

/* ── LevelBand ── 渲染一個代層橫帶
 *
 * onScrollRef: 可選 callback，在 scrollWrapper div mount/unmount 時被呼叫，
 *   B1HomePage 用此收集各代 scrollWrapper 的 ref，傳給 TreeConnectors 監聽 scroll。
 */
export function LevelBand({ treeLevel, avatarSize, onScrollRef }: {
  treeLevel: TreeLevel
  avatarSize: number
  hasChildrenBelow?: boolean   // 保留 prop 但不再 render 舊 ConnectionLine
  onScrollRef?: (el: HTMLElement | null) => void
}) {
  const { t } = useTranslation()
  const labelKey = levelLabelKey(treeLevel.level)
  const labelText = labelKey === 'gen.layer_label_other'
    ? t(labelKey, { level: treeLevel.level })
    : t(labelKey)

  // scrollWrapper ref callback：mount 時回報元素，unmount 時回報 null
  const scrollWrapperRef = useRef<HTMLDivElement | null>(null)
  const scrollRefCallback = (el: HTMLDivElement | null) => {
    scrollWrapperRef.current = el
    onScrollRef?.(el)
  }

  return (
    <section
      aria-label={labelText}
      style={{ width:'100%', padding:'16px 16px 0', display:'flex', flexDirection:'column', alignItems:'center', boxSizing:'border-box', overflowX:'hidden' }}
    >
      <GenLabel labelKey={labelKey}/>
      {/* 外層負責橫捲；內層 inline-flex + min-width:100% 少量時置中，多量時可捲 */}
      <div ref={scrollRefCallback} style={{ overflowX:'auto', width:'100%', paddingBottom:'4px' }}>
        <div style={{ display:'inline-flex', flexWrap:'nowrap', gap:'12px', minWidth:'100%', justifyContent:'center', alignItems:'flex-start' }}>
          {treeLevel.households.map((hh, idx) => (
            <HouseholdBlock key={hh.primary.id + idx} household={hh} avatarSize={avatarSize}/>
          ))}
        </div>
      </div>
      {/* 舊 ConnectionLine 已移除，由 TreeConnectors SVG overlay 取代 */}
    </section>
  )
}
