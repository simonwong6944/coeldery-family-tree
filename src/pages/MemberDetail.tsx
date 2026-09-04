/**
 * MemberDetail — 成員詳情頁
 * 路由：#/member/:id
 *
 * 4r Task 4：按刪除掣彈 modal dialog 警告（含成員名、關係警告），二次確認才執行刪除。
 * 頁面 ≤ 200 行。
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import type { ApiMember, ApiRel } from '../../packages/family-tree-engine'
import MemberAddRelPanel from './MemberAddRelPanel'

interface TreeData { members: ApiMember[]; relationships: ApiRel[] }

function edgeLabel(edge_type: string, status: string | null, t: (k:string)=>string): string {
  if (edge_type === 'marriage') return `${t('member_detail.edge_marriage')}（${t(`member_detail.status_${status ?? 'current'}`)}）`
  if (edge_type === 'parent_child') return t('member_detail.edge_parent_child')
  if (edge_type === 'pet_owner') return t('member_detail.edge_pet_owner')
  return edge_type
}

export default function MemberDetail({ memberId }: { memberId: string }) {
  const { t } = useTranslation()
  const [tree, setTree] = useState<TreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deceasedInput, setDeceasedInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusBusy, setStatusBusy] = useState('')
  const [selfBusy, setSelfBusy] = useState(false)

  const fetchTree = useCallback(() => {
    setLoading(true)
    fetch('/api/tree').then(r => r.ok ? r.json() : { members:[], relationships:[] })
      .then((d: TreeData) => { setTree(d); setLoading(false) })
      .catch(() => { setTree({ members:[], relationships:[] }); setLoading(false) })
  }, [])

  useEffect(() => { fetchTree() }, [fetchTree])

  const member = tree?.members.find(m => m.id === memberId)
  const myRels = (tree?.relationships ?? []).filter(r => r.from_member === memberId || r.to_member === memberId)

  function getPeerName(rel: ApiRel): string {
    const peerId = rel.from_member === memberId ? rel.to_member : rel.from_member
    return tree?.members.find(m => m.id === peerId)?.display_name ?? peerId
  }

  async function handleStatusChange(relId: string, newStatus: string) {
    setStatusBusy(relId)
    await fetch(`/api/relationships/${relId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status:newStatus }) })
    setStatusBusy(''); fetchTree()
  }

  async function handleSetDeceased() {
    if (!deceasedInput) return
    setSaving(true)
    await fetch(`/api/members/${memberId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ deceased_date:deceasedInput }) })
    setSaving(false); fetchTree()
  }

  async function handleSetSelf() {
    setSelfBusy(true)
    await fetch(`/api/members/${memberId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ is_self:1 }) })
    setSelfBusy(false); fetchTree()
  }

  async function handleDelete() {
    await fetch(`/api/members/${memberId}`, { method:'DELETE' })
    window.location.hash = '#/'
  }

  const goHome = () => { window.location.hash = '#/' }

  // ── Styles ──
  const card: React.CSSProperties = { backgroundColor:'var(--color-card)', borderRadius:'12px', padding:'16px', marginBottom:'12px' }
  const label: React.CSSProperties = { fontSize:'13px', color:'var(--color-text-secondary)', marginBottom:'4px', display:'block' }
  const val: React.CSSProperties = { fontSize:'16px', color:'var(--color-text)', fontWeight:'500' }
  const dangerBtn: React.CSSProperties = { minHeight:'44px', padding:'0 20px', borderRadius:'22px', fontSize:'15px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'#ef4444', color:'#fff' }
  const smallBtn: React.CSSProperties = { minHeight:'36px', padding:'0 14px', borderRadius:'18px', fontSize:'14px', fontFamily:'inherit', cursor:'pointer', border:'1.5px solid var(--color-primary)', backgroundColor:'transparent', color:'var(--color-primary)' }
  const primaryBtn: React.CSSProperties = { minHeight:'44px', padding:'0 20px', borderRadius:'22px', fontSize:'15px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'var(--color-primary)', color:'var(--color-card)' }
  const select: React.CSSProperties = { minHeight:'36px', padding:'0 8px', borderRadius:'8px', border:'1.5px solid var(--color-border)', fontSize:'14px', fontFamily:'inherit', color:'var(--color-text)', backgroundColor:'var(--color-card)' }

  // ── 4r Task 4：刪除警告 modal dialog ──
  const DeleteDialog = member && (
    <div role="dialog" aria-modal="true" aria-label={t('member_detail.delete_dialog_title')}
      onClick={(e) => { if (e.target === e.currentTarget) setDeleteDialogOpen(false) }}
      style={{ position:'fixed', inset:0, zIndex:999, display:deleteDialogOpen?'flex':'none', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.55)', padding:'24px' }}>
      <div style={{ backgroundColor:'var(--color-card)', borderRadius:'16px', padding:'24px', maxWidth:'340px', width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <h2 style={{ margin:'0 0 12px', fontSize:'17px', fontWeight:'bold', color:'#ef4444' }}>{t('member_detail.delete_dialog_title')}</h2>
        <p style={{ margin:'0 0 20px', fontSize:'15px', lineHeight:'1.6', color:'var(--color-text)' }}>
          {t('member_detail.delete_dialog_body', { name: member.display_name })}
        </p>
        <div style={{ display:'flex', gap:'12px', flexDirection:'column' }}>
          <button style={dangerBtn} onClick={handleDelete}>{t('member_detail.delete_dialog_confirm')}</button>
          <button style={{ minHeight:'44px', padding:'0 20px', borderRadius:'22px', fontSize:'15px', fontFamily:'inherit', cursor:'pointer', border:'1.5px solid var(--color-border)', backgroundColor:'transparent', color:'var(--color-text-secondary)' }}
            onClick={() => setDeleteDialogOpen(false)}>{t('member_detail.delete_dialog_cancel')}</button>
        </div>
      </div>
    </div>
  )

  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight:'100svh', backgroundColor:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
      <TopBar titleKey="member_detail.page_title" onBack={goHome}/>
      {DeleteDialog}
      <main style={{ flex:1, overflowY:'auto', padding:'72px 16px 40px' }}>
        <button onClick={goHome} style={{ ...smallBtn, marginBottom:'16px', display:'flex', alignItems:'center', gap:'6px' }}>‹ {t('member_detail.back_to_tree')}</button>
        {children}
      </main>
    </div>
  )

  if (loading) return wrap(<p style={{ color:'var(--color-text-secondary)' }}>載入中⋯</p>)
  if (!member) return wrap(<p style={{ color:'var(--color-danger,#dc2626)' }}>找不到此成員</p>)

  const isSelf = member.is_self === 1
  const statusOpts = ['current','divorced','separated','widowed']

  return wrap(<>
    <section style={card}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', flexWrap:'wrap', marginBottom:'12px' }}>
        <div>
          <span style={label}>{t('member_detail.name_label')}</span>
          <p style={{ ...val, fontSize:'20px', margin:0 }}>{member.display_name}</p>
        </div>
        {isSelf && <span style={{ fontSize:'12px', fontWeight:'bold', color:'var(--color-primary)', border:'1.5px solid var(--color-primary)', borderRadius:'12px', padding:'2px 10px', whiteSpace:'nowrap', alignSelf:'flex-start' }}>{t('member_detail.is_self_label')}</span>}
      </div>
      <span style={label}>{t('member_detail.birth_label')}</span>
      <p style={{ ...val, margin:'0 0 12px' }}>{member.birth_date ?? '—'}</p>
      <span style={label}>{t('member_detail.deceased_label')}</span>
      <p style={{ ...val, margin:'0 0 8px' }}>{member.deceased_date ?? '—'}</p>
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginBottom:'12px' }}>
        <input type="date" value={deceasedInput} onChange={e => setDeceasedInput(e.target.value)}
          style={{ minHeight:'36px', padding:'0 8px', borderRadius:'8px', border:'1.5px solid var(--color-border)', fontSize:'14px', fontFamily:'inherit', color:'var(--color-text)' }}/>
        <button style={smallBtn} disabled={saving || !deceasedInput} onClick={handleSetDeceased}>{saving ? t('b3.btn_submitting') : t('member_detail.set_deceased_btn')}</button>
      </div>
      {member.member_kind === 'person' && !isSelf && (
        <button style={primaryBtn} disabled={selfBusy} onClick={handleSetSelf}>{selfBusy ? t('b3.btn_submitting') : t('member_detail.set_self_btn')}</button>
      )}
    </section>

    <section style={card}>
      <h3 style={{ margin:'0 0 12px', fontSize:'16px', fontWeight:'bold', color:'var(--color-text)' }}>{t('member_detail.rels_title')}</h3>
      {myRels.length === 0 && <p style={{ color:'var(--color-text-secondary)', margin:0 }}>{t('member_detail.no_rels')}</p>}
      {myRels.map(rel => (
        <div key={rel.id} style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', padding:'8px 0', borderBottom:'1px solid var(--color-border)' }}>
          <span style={{ fontSize:'15px', color:'var(--color-text)', fontWeight:'500', flex:1, minWidth:'80px' }}>{getPeerName(rel)}</span>
          <span style={{ fontSize:'13px', color:'var(--color-text-secondary)' }}>{edgeLabel(rel.edge_type, rel.status, t)}</span>
          {rel.edge_type === 'marriage' && (
            <select value={rel.status ?? 'current'} disabled={statusBusy === rel.id} onChange={e => handleStatusChange(rel.id, e.target.value)} style={select}>
              {statusOpts.map(s => <option key={s} value={s}>{t(`member_detail.status_${s}`)}</option>)}
            </select>
          )}
        </div>
      ))}
    </section>

    <MemberAddRelPanel currentMemberId={memberId} allMembers={tree?.members ?? []} onSuccess={fetchTree}/>

    {/* 刪除區 — 4r Task 4：按掣開 modal dialog */}
    <section style={{ ...card, marginTop:'24px', border:'1.5px solid #ef4444' }}>
      <h3 style={{ margin:'0 0 8px', fontSize:'15px', fontWeight:'bold', color:'#ef4444' }}>{t('member_detail.delete_zone_title')}</h3>
      <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--color-text-secondary)' }}>{t('member_detail.delete_warning')}</p>
      <button style={dangerBtn} onClick={() => setDeleteDialogOpen(true)}>{t('member_detail.delete_btn')}</button>
    </section>
  </>)
}
