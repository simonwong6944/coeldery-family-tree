/**
 * MemberAddRelPanel — 補關係面板（子組件）
 * 在兩個現有成員之間建立新關係邊。
 * 頁面 ≤ 200 行。
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiMember } from '../../packages/family-tree-engine'

interface Props {
  currentMemberId: string
  allMembers: ApiMember[]
  onSuccess: () => void
}

export default function MemberAddRelPanel({ currentMemberId, allMembers, onSuccess }: Props) {
  const { t } = useTranslation()
  const [targetId, setTargetId] = useState('')
  const [relKey, setRelKey] = useState('relation_spouse')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const otherMembers = allMembers.filter(m => m.id !== currentMemberId && m.member_kind === 'person')

  const relOptions = [
    { key: 'relation_spouse',  label: t('b3.relation_spouse') },
    { key: 'relation_child',   label: t('b3.relation_child') },
    { key: 'relation_parent',  label: t('b3.relation_parent') },
  ]

  const btn: React.CSSProperties = { minHeight:'44px', padding:'0 20px', borderRadius:'22px', fontSize:'16px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'var(--color-primary)', color:'#fff' }
  const select: React.CSSProperties = { width:'100%', minHeight:'44px', padding:'0 12px', borderRadius:'8px', border:'1.5px solid var(--color-border)', fontSize:'16px', fontFamily:'inherit', color:'var(--color-text)', backgroundColor:'var(--color-card)', boxSizing:'border-box' }
  const label: React.CSSProperties = { fontSize:'14px', color:'var(--color-text-secondary)', display:'block', marginBottom:'4px' }

  async function handleSubmit() {
    if (!targetId) { setMsg({ type:'err', text: t('member_detail.add_rel_no_target') }); return }
    setSubmitting(true); setMsg(null)
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_member_id: currentMemberId, to_member_id: targetId, relation_key: relKey }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) { setMsg({ type:'err', text: data.error ?? t('member_detail.add_rel_fail') }) }
      else { setMsg({ type:'ok', text: t('member_detail.add_rel_ok') }); setTargetId(''); onSuccess() }
    } catch { setMsg({ type:'err', text: t('member_detail.add_rel_fail') }) }
    finally { setSubmitting(false) }
  }

  return (
    <section style={{ backgroundColor:'var(--color-bg)', borderRadius:'12px', padding:'16px', border:'1px solid var(--color-border)' }}>
      <h3 style={{ margin:'0 0 12px', fontSize:'16px', fontWeight:'bold', color:'var(--color-text)' }}>{t('member_detail.add_rel_title')}</h3>
      <div style={{ marginBottom:'12px' }}>
        <label style={label}>{t('member_detail.add_rel_target')}</label>
        <select value={targetId} onChange={e => setTargetId(e.target.value)} style={select}>
          <option value="">{t('member_detail.add_rel_target_placeholder')}</option>
          {otherMembers.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom:'16px' }}>
        <label style={label}>{t('member_detail.add_rel_type')}</label>
        <select value={relKey} onChange={e => setRelKey(e.target.value)} style={select}>
          {relOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
      {msg && (
        <p style={{ margin:'0 0 12px', fontSize:'14px', color: msg.type === 'ok' ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)' }}>{msg.text}</p>
      )}
      <button style={btn} disabled={submitting} onClick={handleSubmit}>
        {submitting ? t('b3.btn_submitting') : t('member_detail.add_rel_submit')}
      </button>
    </section>
  )
}
