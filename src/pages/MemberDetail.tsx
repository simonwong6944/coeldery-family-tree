/**
 * MemberDetail — 成員詳情頁
 * 路由：#/member/:id
 *
 * 功能：
 *   - 顯示姓名、生日（唯讀）、deceased_date（可設定）
 *   - 列出所有關係邊（對象姓名 + 類型 + status）
 *   - 婚姻邊可改 status（current / divorced / separated / widowed）
 *   - 真・刪除成員（二次確認，Rule 19）
 *   - 補關係面板（MemberAddRelPanel）
 *
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
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deceasedInput, setDeceasedInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusBusy, setStatusBusy] = useState('')

  const fetchTree = useCallback(() => {
    setLoading(true)
    fetch('/api/tree').then(r => r.ok ? r.json() : { members:[], relationships:[] })
      .then((d: TreeData) => { setTree(d); setLoading(false) })
      .catch(() => { setTree({ members:[], relationships:[] }); setLoading(false) })
  }, [])

  useEffect(() => { fetchTree() }, [fetchTree])

  const member = tree?.members.find(m => m.id === memberId)
  const allRels = tree?.relationships ?? []

  // 找此成員的所有關係邊
  const myRels = allRels.filter(r => r.from_member === memberId || r.to_member === memberId)

  function getPeerName(rel: ApiRel): string {
    const peerId = rel.from_member === memberId ? rel.to_member : rel.from_member
    return tree?.members.find(m => m.id === peerId)?.display_name ?? peerId
  }

  async function handleStatusChange(relId: string, newStatus: string) {
    setStatusBusy(relId)
    await fetch(`/api/relationships/${relId}`, {
      method: 'PATCH', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setStatusBusy(''); fetchTree()
  }

  async function handleSetDeceased() {
    if (!deceasedInput) return
    setSaving(true)
    await fetch(`/api/members/${memberId}`, {
      method: 'PATCH', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ deceased_date: deceasedInput }),
    })
    setSaving(false); fetchTree()
  }

  async function handleDelete() {
    await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
    window.location.hash = '#/'
  }

  const card: React.CSSProperties = { backgroundColor:'var(--color-card)', borderRadius:'12px', padding:'16px', marginBottom:'12px' }
  const label: React.CSSProperties = { fontSize:'13px', color:'var(--color-text-secondary)', marginBottom:'4px', display:'block' }
  const val: React.CSSProperties = { fontSize:'16px', color:'var(--color-text)', fontWeight:'500' }
  const dangerBtn: React.CSSProperties = { minHeight:'44px', padding:'0 20px', borderRadius:'22px', fontSize:'15px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:'#ef4444', color:'#fff' }
  const smallBtn: React.CSSProperties = { minHeight:'36px', padding:'0 14px', borderRadius:'18px', fontSize:'14px', fontFamily:'inherit', cursor:'pointer', border:'1.5px solid var(--color-primary)', backgroundColor:'transparent', color:'var(--color-primary)' }
  const select: React.CSSProperties = { minHeight:'36px', padding:'0 8px', borderRadius:'8px', border:'1.5px solid var(--color-border)', fontSize:'14px', fontFamily:'inherit', color:'var(--color-text)', backgroundColor:'var(--color-card)' }

  const wrap = (children: React.ReactNode) => (
    <div style={{ minHeight:'100svh', backgroundColor:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
      <TopBar titleKey="member_detail.page_title" onBack={() => { window.location.hash='#/' }}/>
      <main style={{ flex:1, overflowY:'auto', paddingTop:'56px', paddingBottom:'40px', padding:'72px 16px 40px' }}>
        {children}
      </main>
    </div>
  )

  if (loading) return wrap(<p style={{ color:'var(--color-text-secondary)' }}>載入中⋯</p>)
  if (!member) return wrap(<p style={{ color:'var(--color-danger,#dc2626)' }}>找不到此成員</p>)

  const statusOpts = ['current','divorced','separated','widowed']

  return wrap(<>
    {/* 基本資料 */}
    <section style={card}>
      <span style={label}>{t('member_detail.name_label')}</span>
      <p style={{ ...val, fontSize:'20px', margin:'0 0 12px' }}>{member.display_name}</p>
      <span style={label}>{t('member_detail.birth_label')}</span>
      <p style={{ ...val, margin:'0 0 12px' }}>{member.birth_date ?? '—'}</p>
      <span style={label}>{t('member_detail.deceased_label')}</span>
      <p style={{ ...val, margin:'0 0 8px' }}>{member.deceased_date ?? '—'}</p>
      <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <input type="date" value={deceasedInput} onChange={e => setDeceasedInput(e.target.value)}
          style={{ minHeight:'36px', padding:'0 8px', borderRadius:'8px', border:'1.5px solid var(--color-border)', fontSize:'14px', fontFamily:'inherit', color:'var(--color-text)' }}/>
        <button style={smallBtn} disabled={saving || !deceasedInput} onClick={handleSetDeceased}>
          {saving ? t('b3.btn_submitting') : t('member_detail.set_deceased_btn')}
        </button>
      </div>
    </section>

    {/* 關係邊 */}
    <section style={card}>
      <h3 style={{ margin:'0 0 12px', fontSize:'16px', fontWeight:'bold', color:'var(--color-text)' }}>{t('member_detail.rels_title')}</h3>
      {myRels.length === 0 && <p style={{ color:'var(--color-text-secondary)', margin:0 }}>{t('member_detail.no_rels')}</p>}
      {myRels.map(rel => (
        <div key={rel.id} style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', padding:'8px 0', borderBottom:'1px solid var(--color-border)' }}>
          <span style={{ fontSize:'15px', color:'var(--color-text)', fontWeight:'500', flex:1, minWidth:'80px' }}>{getPeerName(rel)}</span>
          <span style={{ fontSize:'13px', color:'var(--color-text-secondary)' }}>{edgeLabel(rel.edge_type, rel.status, t)}</span>
          {rel.edge_type === 'marriage' && (
            <select value={rel.status ?? 'current'} disabled={statusBusy === rel.id}
              onChange={e => handleStatusChange(rel.id, e.target.value)} style={select}>
              {statusOpts.map(s => <option key={s} value={s}>{t(`member_detail.status_${s}`)}</option>)}
            </select>
          )}
        </div>
      ))}
    </section>

    {/* 補關係面板 */}
    <MemberAddRelPanel currentMemberId={memberId} allMembers={tree?.members ?? []} onSuccess={fetchTree}/>

    {/* 刪除成員 */}
    <section style={{ ...card, marginTop:'24px', border:'1.5px solid #ef4444' }}>
      <h3 style={{ margin:'0 0 8px', fontSize:'15px', fontWeight:'bold', color:'#ef4444' }}>{t('member_detail.delete_zone_title')}</h3>
      {!deleteConfirm ? (
        <button style={dangerBtn} onClick={() => setDeleteConfirm(true)}>{t('member_detail.delete_btn')}</button>
      ) : (
        <div>
          <p style={{ margin:'0 0 12px', fontSize:'14px', color:'#ef4444', fontWeight:'bold' }}>{t('member_detail.delete_warning')}</p>
          <div style={{ display:'flex', gap:'12px' }}>
            <button style={dangerBtn} onClick={handleDelete}>{t('member_detail.delete_confirm_btn')}</button>
            <button style={{ ...smallBtn, borderColor:'var(--color-text-secondary)', color:'var(--color-text-secondary)' }} onClick={() => setDeleteConfirm(false)}>{t('member_detail.delete_cancel_btn')}</button>
          </div>
        </div>
      )}
    </section>
  </>)
}
