/**
 * AccountPage — 我的帳號（#/account）
 *   - 顯示會員編號 / 暱稱
 *   - 改暱稱（PATCH /api/family/profile）
 *   - 改密碼（POST /api/family/profile）
 * 顏色只用 CSS var；文字全 i18n。
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'

interface Me { member_no?: string | null; nickname?: string | null; display_name?: string | null }

const col = (v: string) => `var(${v})`
const page:  React.CSSProperties = { minHeight:'100svh', backgroundColor:col('--color-bg'), display:'flex', flexDirection:'column' }
const card:  React.CSSProperties = { backgroundColor:col('--color-card'), borderRadius:'12px', padding:'16px', margin:'12px 16px' }
const label: React.CSSProperties = { fontSize:'15px', fontWeight:600, color:col('--color-text'), display:'block', marginBottom:'6px' }
const input: React.CSSProperties = { width:'100%', minHeight:'48px', padding:'0 12px', borderRadius:'8px', border:`1.5px solid ${col('--color-divider')}`, fontSize:'18px', fontFamily:'inherit', color:col('--color-text'), backgroundColor:col('--color-bg'), boxSizing:'border-box' }
const btn:   React.CSSProperties = { minHeight:'48px', padding:'0 20px', borderRadius:'24px', fontSize:'16px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'none', backgroundColor:col('--color-primary'), color:col('--color-card') }
const okMsg: React.CSSProperties = { margin:'8px 0 0', fontSize:'15px', color:col('--color-primary') }
const badMsg:React.CSSProperties = { margin:'8px 0 0', fontSize:'15px', color:col('--color-accent') }

export default function AccountPage() {
  const { t } = useTranslation()
  const [me, setMe] = useState<Me | null>(null)
  const [treeName, setTreeName] = useState('')
  const [treeMsg, setTreeMsg] = useState(''); const [treeErr, setTreeErr] = useState(''); const [treeBusy, setTreeBusy] = useState(false)

  const [nickname, setNickname] = useState('')
  const [nickMsg, setNickMsg] = useState(''); const [nickErr, setNickErr] = useState(''); const [nickBusy, setNickBusy] = useState(false)

  const [oldPw, setOldPw] = useState(''); const [newPw, setNewPw] = useState(''); const [newPw2, setNewPw2] = useState('')
  const [pwMsg, setPwMsg] = useState(''); const [pwErr, setPwErr] = useState(''); const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    fetch('/api/family/me', { credentials:'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: Me | null) => { if (d) { setMe(d); setNickname(d.nickname ?? '') } })
      .catch(() => {})
    fetch('/api/tree', { credentials:'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: { family?: { name?: string } } | null) => { if (d?.family?.name) setTreeName(d.family.name) })
      .catch(() => {})
  }, [])

  async function saveTreeName() {
    setTreeMsg(''); setTreeErr('')
    if (!treeName.trim()) { setTreeErr(t('account.err_generic')); return }
    setTreeBusy(true)
    const res = await fetch('/api/tree', {
      method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: treeName.trim() }),
    })
    const d = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
    setTreeBusy(false)
    if (res.ok && d.ok) setTreeMsg(t('account.saved'))
    else setTreeErr(d.error ?? t('account.err_generic'))
  }

  async function saveNickname() {
    setNickMsg(''); setNickErr('')
    if (!nickname.trim()) { setNickErr(t('account.err_generic')); return }
    setNickBusy(true)
    const res = await fetch('/api/family/profile', {
      method:'PATCH', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ nickname: nickname.trim() }),
    })
    const d = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
    setNickBusy(false)
    if (res.ok && d.ok) setNickMsg(t('account.saved'))
    else setNickErr(d.error ?? t('account.err_generic'))
  }

  async function changePw() {
    setPwMsg(''); setPwErr('')
    if (newPw.trim().length < 8) { setPwErr(t('account.pw_too_short')); return }
    if (newPw !== newPw2)        { setPwErr(t('account.pw_mismatch')); return }
    setPwBusy(true)
    const res = await fetch('/api/family/profile', {
      method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ old_password: oldPw, new_password: newPw }),
    })
    const d = await res.json().catch(() => ({})) as { ok?: boolean; error?: string }
    setPwBusy(false)
    if (res.ok && d.ok) { setPwMsg(t('account.pw_changed')); setOldPw(''); setNewPw(''); setNewPw2('') }
    else setPwErr(d.error ?? t('account.err_generic'))
  }

  return (
    <div style={page}>
      <TopBar titleKey="account.title" onBack={() => { window.location.hash = '#/' }} />
      <main style={{ flex:1, overflowY:'auto', paddingTop:'56px', paddingBottom:'24px' }}>
        <section style={card}>
          <span style={label}>{t('account.member_no_label')}</span>
          <p style={{ margin:0, fontSize:'18px', color:col('--color-text') }}>{me?.member_no ?? '—'}</p>
        </section>

        <section style={card}>
          <span style={label}>{t('account.family_name_label')}</span>
          <input style={input} value={treeName} onChange={e => setTreeName(e.target.value)} placeholder={t('account.family_name_placeholder')} disabled={treeBusy} />
          {treeMsg && <p style={okMsg}>{treeMsg}</p>}
          {treeErr && <p style={badMsg} role="alert">{treeErr}</p>}
          <div style={{ marginTop:'10px' }}>
            <button style={{ ...btn, opacity: treeBusy ? 0.6 : 1 }} disabled={treeBusy} onClick={saveTreeName}>{t('account.save')}</button>
          </div>
        </section>

        <section style={card}>
          <span style={label}>{t('account.nickname_label')}</span>
          <input style={input} value={nickname} onChange={e => setNickname(e.target.value)} placeholder={t('account.nickname_placeholder')} disabled={nickBusy} />
          {nickMsg && <p style={okMsg}>{nickMsg}</p>}
          {nickErr && <p style={badMsg} role="alert">{nickErr}</p>}
          <div style={{ marginTop:'10px' }}>
            <button style={{ ...btn, opacity: nickBusy ? 0.6 : 1 }} disabled={nickBusy} onClick={saveNickname}>{t('account.save')}</button>
          </div>
        </section>

        <section style={card}>
          <h3 style={{ margin:'0 0 12px', fontSize:'16px', fontWeight:'bold', color:col('--color-text') }}>{t('account.change_pw_title')}</h3>
          <span style={label}>{t('account.old_pw_label')}</span>
          <input style={input} type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} autoComplete="current-password" disabled={pwBusy} />
          <span style={{ ...label, marginTop:'12px' }}>{t('account.new_pw_label')}</span>
          <input style={input} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" disabled={pwBusy} />
          <span style={{ ...label, marginTop:'12px' }}>{t('account.confirm_pw_label')}</span>
          <input style={input} type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} autoComplete="new-password" disabled={pwBusy} />
          {pwMsg && <p style={okMsg}>{pwMsg}</p>}
          {pwErr && <p style={badMsg} role="alert">{pwErr}</p>}
          <div style={{ marginTop:'10px' }}>
            <button style={{ ...btn, opacity: pwBusy ? 0.6 : 1 }} disabled={pwBusy} onClick={changePw}>{t('account.save')}</button>
          </div>
        </section>
      </main>
    </div>
  )
}
