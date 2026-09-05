/**
 * B3AddMember — 加入家人精靈（4 步人版 / 3 步寵物版）
 * 路由：#/b3-add  規格：.coappery/design/B2_B3.md §3–§7
 * Phase 3：性別揀擇 + 句子式關係描述（「[新成員] 是 [對象] 的 ____」）
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'
import WizardStepIndicator from '../../packages/wizard-step-indicator'

type MemberType = 'person' | 'pet' | null
type Gender = 'male' | 'female' | null
type SubmitStatus = 'idle' | 'submitting' | 'done' | 'error'
interface ExistingMember { id: string; display_name: string; member_kind: string }

// UI relation key 清單（父親/母親等）→ 後端 relation_key 映射，方向邏輯不變
const RELATION_OPTIONS = ['relation_father','relation_mother','relation_son','relation_daughter','relation_spouse','relation_sibling','relation_grandchild','relation_other'] as const
type RelationUiKey = typeof RELATION_OPTIONS[number]
const UI_TO_BACKEND: Record<RelationUiKey, string> = {
  relation_father:'relation_parent', relation_mother:'relation_parent',
  relation_son:'relation_child',     relation_daughter:'relation_child',
  relation_spouse:'relation_spouse', relation_sibling:'relation_sibling',
  relation_grandchild:'relation_grandchild', relation_other:'relation_other',
}

export default function B3AddMember() {
  const { t } = useTranslation()
  const [memberType, setMemberType] = useState<MemberType>(null)
  const [step, setStep] = useState(1)
  const [relationUi, setRelationUi] = useState<RelationUiKey | ''>('')
  const [targetId, setTargetId] = useState<string | null>(null)
  const [gender, setGender] = useState<Gender>(null)
  const [petOwnerIds, setPetOwnerIds] = useState<Set<string>>(new Set())
  const [petName, setPetName] = useState('')
  const [personName, setPersonName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [existingPersons, setExistingPersons] = useState<ExistingMember[]>([])

  useEffect(() => {
    fetch('/api/tree').then(r => r.ok ? r.json() : { members: [] })
      .then((d: { members?: ExistingMember[] }) => setExistingPersons((d.members ?? []).filter(m => m.member_kind === 'person')))
      .catch(() => {})
  }, [])

  const isPet = memberType === 'pet'
  const totalDots = isPet ? 3 : 4
  const dotStep   = isPet && step === 4 ? 3 : step
  const isFirstMember = existingPersons.length === 0
  const subjectName = personName.trim() || t('b3.relation_subject_placeholder')
  const targetName  = existingPersons.find(m => m.id === targetId)?.display_name ?? t('b3.relation_object_placeholder')

  async function submitMember(): Promise<void> {
    setSubmitStatus('submitting')
    try {
      const backendRelation = relationUi ? UI_TO_BACKEND[relationUi] : undefined
      const body: Record<string, unknown> = { member_kind: memberType, display_name: isPet ? petName.trim() : personName.trim(), birth_date: birthDate || undefined, gender: gender ?? undefined }
      if (!isPet && backendRelation) { body.relation_key = backendRelation; if (targetId) body.target_member_id = targetId }
      if (isPet) body.owner_member_ids = Array.from(petOwnerIds)
      const res = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSubmitStatus('done')
    } catch { setSubmitStatus('error') }
  }

  /* ── 樣式 ── */
  const pill = (dis?: boolean): React.CSSProperties => ({ display:'inline-flex', alignItems:'center', justifyContent:'center', minHeight:'56px', borderRadius:'28px', fontSize:'18px', fontWeight:'bold', fontFamily:'inherit', cursor:dis?'not-allowed':'pointer', border:'none', padding:'0 28px', backgroundColor:dis?'var(--color-divider)':'var(--color-primary)', color:dis?'var(--color-text-secondary)':'var(--color-card)' })
  const pillGhost: React.CSSProperties = { ...pill(), backgroundColor:'transparent', color:'var(--color-primary)', border:'2px solid var(--color-primary)' }
  const input: React.CSSProperties = { width:'100%', boxSizing:'border-box', padding:'16px', fontSize:'18px', border:'1.5px solid var(--color-divider)', borderRadius:'12px', fontFamily:'inherit', color:'var(--color-text)', backgroundColor:'var(--color-card)', outline:'none' }
  const lbl = (key: string) => <label style={{ display:'block', fontSize:'18px', fontWeight:'bold', marginBottom:'8px' }}>{t(key)}</label>
  const nav2 = (back:()=>void, next:()=>void, dis?:boolean) => (
    <div style={{ display:'flex', gap:'12px' }}>
      <button onClick={back} style={{ ...pillGhost, flex:1 }}>{t('b3.btn_prev')}</button>
      <button onClick={next} disabled={dis} style={{ ...pill(dis), flex:2 }}>{t('b3.btn_next')}</button>
    </div>
  )

  /* 性別揀擇（人版專屬） */
  const GENDER_OPTS: { key: string; val: Gender }[] = [{ key:'b3.gender_male', val:'male' }, { key:'b3.gender_female', val:'female' }, { key:'b3.gender_unset', val:null }]
  const genderPicker = (
    <div style={{ marginBottom:'16px' }}>
      {lbl('b3.gender_label')}
      <div style={{ display:'flex', gap:'8px' }}>
        {GENDER_OPTS.map(o => { const a = gender===o.val; return (
          <button key={o.key} onClick={()=>setGender(o.val)} style={{ flex:1, minHeight:'48px', borderRadius:'24px', fontSize:'18px', fontFamily:'inherit', fontWeight:a?'bold':'normal', cursor:'pointer', backgroundColor:a?'var(--color-primary)':'var(--color-card)', color:a?'var(--color-card)':'var(--color-text)', border:a?'none':'1.5px solid var(--color-divider)' }}>{t(o.key)}</button>
        )})}
      </div>
    </div>
  )

  const step2PersonValid = !!personName.trim() && (isFirstMember || !!targetId)

  /* ─── Step 1 ─── */
  if (step === 1) return <Shell onBack={()=>{ window.location.hash='#/' }} totalDots={totalDots} dotStep={dotStep}>
    <h2 style={{ fontSize:'20px', fontWeight:'bold', margin:'0 0 20px' }}>{t('b3.step1_title')}</h2>
    {(['person','pet'] as const).map(type => (
      <button key={type} onClick={()=>setMemberType(type)} style={{ display:'flex', flexDirection:'column', gap:'8px', width:'100%', textAlign:'left', padding:'20px', marginBottom:'16px', borderRadius:'16px', fontSize:'18px', fontFamily:'inherit', cursor:'pointer', backgroundColor:'var(--color-card)', boxShadow:'var(--shadow-subtle)', border:memberType===type?'2.5px solid var(--color-primary)':'2px solid var(--color-divider)' }}>
        <span style={{ fontSize:'22px', fontWeight:'bold', color:memberType===type?'var(--color-primary)':'var(--color-text)' }}>{type==='person'?'👤 ':'🐾 '}{t(`b3.type_card_${type}_title`)}</span>
        <span style={{ fontSize:'18px', color:'var(--color-text-secondary)' }}>{t(`b3.type_card_${type}_desc`)}</span>
      </button>
    ))}
    <button onClick={()=>setStep(2)} disabled={!memberType} style={{ ...pill(!memberType), width:'100%' }}>{t('b3.btn_next')}</button>
  </Shell>

  /* ─── Step 2 Person ─── */
  if (step === 2 && !isPet) return <Shell onBack={()=>setStep(1)} totalDots={totalDots} dotStep={dotStep}>
    <h2 style={{ fontSize:'20px', fontWeight:'bold', margin:'0 0 16px' }}>{t('b3.step2_person_title')}</h2>
    {lbl('b3.label_name')}
    <input type="text" placeholder={t('b3.placeholder_name')} value={personName} onChange={e=>setPersonName(e.target.value)} style={{ ...input, marginBottom:'16px' }} />
    {genderPicker}
    <label style={{ display:'block', fontSize:'18px', fontWeight:'bold', marginBottom:'8px' }}>{t('b3.relation_sentence_label')}</label>
    {/* 對象選擇 */}
    {!isFirstMember && <select value={targetId??''} onChange={e=>setTargetId(e.target.value||null)} style={{ ...input, marginBottom:'12px', appearance:'auto' }}><option value="">{t('b3.target_placeholder')}</option>{existingPersons.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}</select>}
    {isFirstMember && <p style={{ fontSize:'18px', color:'var(--color-text-secondary)', margin:'0 0 12px', padding:'12px', backgroundColor:'var(--color-card)', borderRadius:'12px' }}>{t('b3.target_first_member')}</p>}
    {/* 句子：[主語] 是 [對象] 的 [下拉] */}
    {!isFirstMember && (
      <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'6px', marginBottom:'16px', padding:'12px', backgroundColor:'var(--color-card)', borderRadius:'12px', fontSize:'18px' }}>
        <span style={{ fontWeight:'bold', color:'var(--color-primary)' }}>{subjectName}</span>
        <span>是</span>
        <span style={{ fontWeight:'bold' }}>{targetName}</span>
        <span>{t('b3.relation_sentence_of')}</span>
        <select value={relationUi} onChange={e=>setRelationUi(e.target.value as RelationUiKey|'')} style={{ fontSize:'18px', fontFamily:'inherit', fontWeight:'bold', border:'1.5px solid var(--color-divider)', borderRadius:'8px', padding:'4px 8px', backgroundColor:'var(--color-bg)', color:relationUi?'var(--color-primary)':'var(--color-text-secondary)', cursor:'pointer', outline:'none' }}>
          <option value="">▢</option>
          {RELATION_OPTIONS.map(k=><option key={k} value={k}>{t(`b3.${k}`)}</option>)}
        </select>
      </div>
    )}
    {isFirstMember && <div style={{ marginBottom:'16px' }} />}
    <input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} style={{ ...input, marginBottom:'8px' }} />
    <p style={{ margin:'0 0 20px', fontSize:'18px', color:'var(--color-text-secondary)' }}>{t('b3.birthdate_helper')}</p>
    {nav2(()=>setStep(1), ()=>setStep(3), !step2PersonValid)}
  </Shell>

  /* ─── Step 2 Pet ─── */
  if (step === 2 && isPet) return <Shell onBack={()=>setStep(1)} totalDots={totalDots} dotStep={dotStep}>
    <h2 style={{ fontSize:'20px', fontWeight:'bold', margin:'0 0 16px' }}>{t('b3.step2_pet_title')}</h2>
    {lbl('b3.label_pet_name')}
    <div style={{ position:'relative', marginBottom:'16px' }}>
      <span style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', fontSize:'20px' }}>🐾</span>
      <input type="text" value={petName} onChange={e=>setPetName(e.target.value)} style={{ ...input, paddingLeft:'44px' }} />
    </div>
    <input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} style={{ ...input, marginBottom:'8px' }} />
    <p style={{ margin:'0 0 16px', fontSize:'18px', color:'var(--color-text-secondary)' }}>{t('b3.pet_birthdate_helper')}</p>
    {lbl('b3.label_pet_owners_real')}
    {existingPersons.length===0
      ? <p style={{ fontSize:'18px', color:'var(--color-text-secondary)', margin:'0 0 16px' }}>{t('b3.pet_no_members')}</p>
      : <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'8px' }}>
          {existingPersons.map(m=>{ const sel=petOwnerIds.has(m.id); return <button key={m.id} onClick={()=>setPetOwnerIds(p=>{ const n=new Set(p); sel?n.delete(m.id):n.add(m.id); return n })} style={{ minHeight:'52px', padding:'0 20px', borderRadius:'26px', fontSize:'18px', fontFamily:'inherit', fontWeight:'bold', cursor:'pointer', backgroundColor:sel?'var(--color-primary)':'var(--color-card)', color:sel?'var(--color-card)':'var(--color-primary)', border:sel?'none':'2px solid var(--color-primary)' }}>{m.display_name}</button> })}
        </div>}
    <p style={{ margin:'0 0 20px', fontSize:'18px', color:'var(--color-text-secondary)' }}>{t('b3.pet_owners_hint')}</p>
    <div style={{ display:'flex', gap:'12px' }}>
      <button onClick={()=>setStep(1)} style={{ ...pillGhost, flex:1 }}>{t('b3.btn_prev')}</button>
      <button disabled={!petName.trim()||petOwnerIds.size===0||submitStatus==='submitting'} onClick={async()=>{ await submitMember(); setStep(4) }} style={{ ...pill(!petName.trim()||petOwnerIds.size===0||submitStatus==='submitting'), flex:2 }}>{submitStatus==='submitting'?t('b3.btn_submitting'):t('b3.btn_finish')}</button>
    </div>
  </Shell>

  /* ─── Step 3 Invite ─── */
  if (step === 3) return <Shell onBack={()=>setStep(2)} totalDots={totalDots} dotStep={dotStep}>
    <h2 style={{ fontSize:'20px', fontWeight:'bold', margin:'0 0 20px' }}>{t('b3.step3_invite_title')}</h2>
    <div aria-label={t('b3.qr_placeholder_label')} style={{ width:'180px', height:'180px', margin:'0 auto 12px', display:'grid', gridTemplateColumns:'repeat(9,1fr)', gridTemplateRows:'repeat(9,1fr)', borderRadius:'12px', overflow:'hidden', border:'3px solid var(--color-primary)' }}>
      {Array.from({length:81},(_,i)=><div key={i} style={{ backgroundColor:((i+Math.floor(i/9))%2===0)?'var(--color-primary)':'var(--color-bg)' }} />)}
    </div>
    <p style={{ textAlign:'center', margin:'0 0 20px', fontSize:'18px', color:'var(--color-text-secondary)' }}>{t('b3.qr_helper')}</p>
    <button style={{ ...pill(), width:'100%', marginBottom:'16px' }}>{t('b3.whatsapp_invite_btn')}</button>
    <p style={{ textAlign:'center', margin:'0 0 20px', fontSize:'18px', color:'var(--color-text-secondary)' }}>{t('b3.invite_footnote')}</p>
    <div style={{ display:'flex', gap:'12px' }}>
      <button onClick={()=>setStep(2)} style={{ ...pillGhost, flex:1 }}>{t('b3.btn_prev')}</button>
      <button disabled={submitStatus==='submitting'} onClick={async()=>{ await submitMember(); setStep(4) }} style={{ ...pill(submitStatus==='submitting'), flex:2 }}>{submitStatus==='submitting'?t('b3.btn_submitting'):t('b3.btn_finish')}</button>
    </div>
  </Shell>

  /* ─── Step 4 Done ─── */
  const isErr = submitStatus==='error'
  const circle = (bg:string, content:React.ReactNode) => <div style={{ width:'96px', height:'96px', borderRadius:'50%', backgroundColor:bg, display:'flex', alignItems:'center', justifyContent:'center' }}>{content}</div>
  return <Shell onBack={()=>{ window.location.hash='#/' }} totalDots={totalDots} dotStep={dotStep}>
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px', paddingTop:'24px' }}>
      {isErr ? circle('var(--color-accent)',<span style={{ fontSize:'40px', color:'var(--color-card)' }}>！</span>) : circle('var(--color-primary)',<svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true"><path d="M10 28L22 40L42 14" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>)}
      <h2 style={{ fontSize:'22px', fontWeight:'bold', color:isErr?'var(--color-accent)':'var(--color-primary)', margin:0 }}>{t(isErr?'b3.error_heading':'b3.success_heading')}</h2>
      <p style={{ fontSize:'18px', color:'var(--color-text-secondary)', margin:0, textAlign:'center' }}>{isErr?t('b3.error_sub'):t('b3.success_sub',{name:isPet?petName:personName})}</p>
      {isErr ? <button onClick={()=>{ setSubmitStatus('idle'); setStep(isPet?2:3) }} style={{ ...pillGhost, marginTop:'8px' }}>{t('b3.btn_retry')}</button>
             : <button onClick={()=>{ window.location.hash='#/' }} style={{ ...pill(), marginTop:'8px' }}>{t('b3.btn_back_home')}</button>}
    </div>
  </Shell>
}

/* ── 共用頁面殼 ── */
function Shell({ onBack, totalDots, dotStep, children }:{ onBack:()=>void; totalDots:number; dotStep:number; children:React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100svh', backgroundColor:'var(--color-bg)' }}>
      <style>{`@keyframes b3fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <TopBar titleKey="b3.page_title" onBack={onBack} />
      <div style={{ paddingTop:'56px', paddingBottom:'80px', flex:1, overflowY:'auto' }}>
        <WizardStepIndicator totalSteps={totalDots} currentStep={dotStep} />
        <div style={{ padding:'20px 16px', animation:'b3fade 0.25s ease' }}>{children}</div>
      </div>
      <BottomTabBar current="family_tree" onTabChange={(tab:TabId)=>{ const r:Record<TabId,string>={ family_tree:'#/', family_circle:'#/family-feed', family_gathering:'#/family-gather', my_recommendations:'#/my-recommend' }; window.location.hash=r[tab] }} />
    </div>
  )
}
