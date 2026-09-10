/**
 * MemberBasicsSection — 成員基本資料編輯（性別 / 生日 / 離世日期 / 設為本人）
 * 供 MemberDetail.tsx 使用；獨立管理自身 state。
 * endpoint: PATCH /api/members/:id
 * 顏色只用 CSS var；文字全 i18n。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiMember } from '../../packages/family-tree-engine'

interface Props {
  member: ApiMember
  memberId: string
  isSelf: boolean
  onChanged: () => void
}

const label: React.CSSProperties = { fontSize:'13px', color:'var(--color-text-secondary)', marginBottom:'4px', display:'block' }
const dateInput: React.CSSProperties = { minHeight:'36px', padding:'0 8px', borderRadius:'8px', border:'1.5px solid var(--color-border)', fontSize:'14px', fontFamily:'inherit', color:'var(--color-text)' }
const smallBtn: React.CSSProperties = { minHeight:'36px', padding:'0 14px', borderRadius:'18px', fontSize:'14px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'2px solid var(--color-primary)', backgroundColor:'var(--color-card)', color:'var(--color-primary)' }
const primaryBtn: React.CSSProperties = { width:'100%', minHeight:'48px', borderRadius:'24px', fontSize:'16px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'var(--color-primary)', color:'var(--color-card)' }

export default function MemberBasicsSection({ member, memberId, isSelf, onChanged }: Props) {
  const { t } = useTranslation()
  const [birthInput, setBirthInput]       = useState(member.birth_date ?? '')
  const [deceasedInput, setDeceasedInput] = useState(member.deceased_date ?? '')
  const [busy, setBusy]                   = useState(false)
  const [selfBusy, setSelfBusy]           = useState(false)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    await fetch(`/api/members/${memberId}`, {
      method:'PATCH', credentials:'include',
      headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body),
    })
    setBusy(false); onChanged()
  }

  async function handleSetSelf() {
    setSelfBusy(true)
    await fetch(`/api/members/${memberId}`, {
      method:'PATCH', credentials:'include',
      headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ is_self: 1 }),
    })
    setSelfBusy(false); onChanged()
  }

  return (
    <>
      {/* 性別（影響親屬稱謂：父／母、子／女）*/}
      <span style={label}>{t('member_detail.gender_label')}</span>
      <div style={{ display:'flex', gap:'8px', margin:'0 0 12px', flexWrap:'wrap' }}>
        {([['male','gender_male'],['female','gender_female'],[null,'gender_unset']] as const).map(([g, k]) => (
          <button key={String(g)} disabled={busy}
            style={{ ...smallBtn, ...(member.gender === g ? { backgroundColor:'var(--color-primary)', color:'var(--color-card)' } : {}) }}
            onClick={() => patch({ gender: g })}
          >{t(`member_detail.${k}`)}</button>
        ))}
      </div>

      {/* 生日（可修改；首次輸入常有錯）*/}
      <span style={label}>{t('member_detail.birth_label')}</span>
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginBottom:'12px' }}>
        <input type="date" value={birthInput} onChange={e => setBirthInput(e.target.value)} style={dateInput} />
        <button style={smallBtn} disabled={busy || !birthInput} onClick={() => patch({ birth_date: birthInput })}>
          {busy ? t('b3.btn_submitting') : t('member_detail.set_birth_btn')}
        </button>
      </div>

      {/* 離世日期（系統永不自行推斷，需家人手動輸入）*/}
      <span style={label}>{t('member_detail.deceased_label')}</span>
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginBottom:'12px' }}>
        <input type="date" value={deceasedInput} onChange={e => setDeceasedInput(e.target.value)} style={dateInput} />
        <button style={smallBtn} disabled={busy || !deceasedInput} onClick={() => patch({ deceased_date: deceasedInput })}>
          {busy ? t('b3.btn_submitting') : t('member_detail.set_deceased_btn')}
        </button>
      </div>

      {member.member_kind === 'person' && !isSelf && (
        <button style={primaryBtn} disabled={selfBusy} onClick={handleSetSelf}>
          {selfBusy ? t('b3.btn_submitting') : t('member_detail.set_self_btn')}
        </button>
      )}
    </>
  )
}
