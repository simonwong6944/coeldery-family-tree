/**
 * MemberAddRelPanel — 補關係面板（子組件）
 * 在兩個現有成員之間建立新關係邊。
 * 句子式：「[當前成員名] 是 [對象] 的 ▢」
 * 面板 ≤ 200 行。
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApiMember } from '../../packages/family-tree-engine'
import { PANEL_RELATION_OPTIONS, UI_TO_BACKEND } from '../utils/relationMapping'
import type { RelationUiKey } from '../utils/relationMapping'

interface Props {
  currentMemberId: string
  allMembers: ApiMember[]
  onSuccess: () => void
}

export default function MemberAddRelPanel({ currentMemberId, allMembers, onSuccess }: Props) {
  const { t } = useTranslation()
  const [targetId, setTargetId]     = useState('')
  const [relationUi, setRelationUi] = useState<RelationUiKey | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg]               = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const otherMembers  = allMembers.filter(m => m.id !== currentMemberId && m.member_kind === 'person')
  const currentName   = allMembers.find(m => m.id === currentMemberId)?.display_name ?? currentMemberId
  const targetName    = otherMembers.find(m => m.id === targetId)?.display_name ?? t('member_detail.add_rel_target_placeholder')

  /* ── 樣式 ── */
  const btn: React.CSSProperties = {
    minHeight: '44px', padding: '0 20px', borderRadius: '22px', fontSize: '16px',
    fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', border: 'none',
    backgroundColor: 'var(--color-primary)', color: '#fff',
  }
  const selectBase: React.CSSProperties = {
    minHeight: '44px', padding: '0 12px', borderRadius: '8px',
    border: '1.5px solid var(--color-border)', fontSize: '16px', fontFamily: 'inherit',
    color: 'var(--color-text)', backgroundColor: 'var(--color-card)', boxSizing: 'border-box',
  }

  async function handleSubmit() {
    if (!targetId)    { setMsg({ type: 'err', text: t('member_detail.add_rel_no_target') }); return }
    if (!relationUi)  { setMsg({ type: 'err', text: t('member_detail.add_rel_no_type') });   return }
    setSubmitting(true); setMsg(null)
    try {
      const backendKey = UI_TO_BACKEND[relationUi]
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_member_id: currentMemberId, to_member_id: targetId, relation_key: backendKey }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) { setMsg({ type: 'err', text: data.error ?? t('member_detail.add_rel_fail') }) }
      else          { setMsg({ type: 'ok',  text: t('member_detail.add_rel_ok') }); setTargetId(''); setRelationUi(''); onSuccess() }
    } catch { setMsg({ type: 'err', text: t('member_detail.add_rel_fail') }) }
    finally { setSubmitting(false) }
  }

  return (
    <section style={{ backgroundColor: 'var(--color-bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--color-border)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text)' }}>
        {t('member_detail.add_rel_title')}
      </h3>

      {/* 對象選擇 */}
      <select
        value={targetId}
        onChange={e => setTargetId(e.target.value)}
        style={{ ...selectBase, width: '100%', marginBottom: '12px' }}
      >
        <option value="">{t('member_detail.add_rel_target_placeholder')}</option>
        {otherMembers.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
      </select>

      {/* 句子式：「[當前成員名] 是 [對象] 的 [▢]」 */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px',
        marginBottom: '16px', padding: '12px',
        backgroundColor: 'var(--color-card)', borderRadius: '12px', fontSize: '16px',
      }}>
        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{currentName}</span>
        <span>{t('b3.relation_sentence_is')}</span>
        <span style={{ fontWeight: 'bold' }}>{targetName}</span>
        <span>{t('b3.relation_sentence_of')}</span>
        <select
          value={relationUi}
          onChange={e => setRelationUi(e.target.value as RelationUiKey | '')}
          style={{
            fontSize: '16px', fontFamily: 'inherit', fontWeight: 'bold',
            border: '1.5px solid var(--color-divider)', borderRadius: '8px',
            padding: '4px 8px', backgroundColor: 'var(--color-bg)',
            color: relationUi ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="">▢</option>
          {PANEL_RELATION_OPTIONS.map(k => (
            <option key={k} value={k}>{t(`b3.${k}`)}</option>
          ))}
        </select>
      </div>

      {/* 成功 / 失敗訊息 */}
      {msg && (
        <p style={{ margin: '0 0 12px', fontSize: '14px', color: msg.type === 'ok' ? 'var(--color-success, #16a34a)' : 'var(--color-danger, #dc2626)' }}>
          {msg.text}
        </p>
      )}

      <button style={btn} disabled={submitting} onClick={handleSubmit}>
        {submitting ? t('b3.btn_submitting') : t('member_detail.add_rel_submit')}
      </button>
    </section>
  )
}
