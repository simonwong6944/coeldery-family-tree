/**
 * Login — 家族樹登入 / 首次設定頁  (#/login)
 *
 * 流程：登入版 → POST /api/family/login
 *   needs_setup:false → #/（熟客）
 *   needs_setup:true  → 切換首次設定版（phone/password 沿用）
 *   首次設定版 → POST /api/family/setup → #/
 *
 * 風格：內聯 style + CSS variable，同 B1HomePage.tsx 慣例。頁 ≤ 200 行。
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const col = (v: string) => `var(${v})`
const page:  React.CSSProperties = { minHeight:'100svh', backgroundColor:col('--color-bg'), display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px' }
const card:  React.CSSProperties = { width:'100%', maxWidth:'400px', backgroundColor:col('--color-card'), borderRadius:'16px', padding:'32px 24px', boxShadow:col('--shadow-soft'), display:'flex', flexDirection:'column', gap:'20px' }
const title: React.CSSProperties = { fontSize:'22px', fontWeight:700, color:col('--color-text'), margin:0, textAlign:'center' }
const hint:  React.CSSProperties = { fontSize:'15px', color:col('--color-text-secondary'), textAlign:'center', margin:0, lineHeight:1.5 }
const lbl:   React.CSSProperties = { fontSize:'15px', fontWeight:600, color:col('--color-text'), display:'block', marginBottom:'6px' }
const inp:   React.CSSProperties = { width:'100%', fontSize:'18px', padding:'14px 16px', borderRadius:'10px', border:`1.5px solid ${col('--color-text-secondary')}`, backgroundColor:col('--color-bg'), color:col('--color-text'), boxSizing:'border-box', fontFamily:'inherit', outline:'none' }
const btn:   React.CSSProperties = { width:'100%', minHeight:'56px', fontSize:'18px', fontWeight:700, color:'#fff', backgroundColor:col('--color-primary'), border:'none', borderRadius:'12px', cursor:'pointer', fontFamily:'inherit' }
const err:   React.CSSProperties = { fontSize:'15px', color:'var(--color-accent)', textAlign:'center', margin:0 }

function Field({ id, label, type='text', placeholder='', value, onChange, autoComplete='' }:
  { id:string; label:string; type?:string; placeholder?:string; value:string; onChange:(v:string)=>void; autoComplete?:string }) {
  return (
    <div>
      <label style={lbl} htmlFor={id}>{label}</label>
      <input id={id} style={inp} type={type} placeholder={placeholder} value={value}
        autoComplete={autoComplete} inputMode={type==='tel'?'numeric':undefined}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

export default function Login() {
  const { t } = useTranslation()
  const [mode, setMode]           = useState<'login'|'setup'>('login')
  const [phone, setPhone]         = useState('')
  const [password, setPassword]   = useState('')
  const [nickname, setNickname]   = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const btnStyle: React.CSSProperties = { ...btn, ...(loading ? { opacity:0.55, cursor:'not-allowed' } : {}) }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!phone.trim())  { setError(t('login.error_phone_format'));  return }
    if (!password)      { setError(t('login.error_password_empty')); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/family/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'include', body:JSON.stringify({ phone:phone.trim(), password }),
      })
      const data = await res.json() as Record<string,unknown>
      if (res.ok && data.needs_setup === false) { window.location.hash='#/'; return }
      if (res.ok && data.needs_setup === true)  { setMode('setup'); return }
      if (res.status===401) { setError(t('login.error_credentials')); return }
      if (res.status===400) { setError(String(data.error ?? t('login.error_phone_format'))); return }
      setError(t('login.error_generic'))
    } catch { setError(t('login.error_generic')) }
    finally  { setLoading(false) }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!nickname.trim())                        { setError(t('login.error_nickname_empty')); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) { setError(t('login.error_birth_date'));    return }
    setLoading(true)
    try {
      const res  = await fetch('/api/family/setup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'include',
        body:JSON.stringify({ phone:phone.trim(), password, nickname:nickname.trim(), birth_date:birthDate }),
      })
      const data = await res.json() as Record<string,unknown>
      if (res.ok && data.ok) { window.location.hash='#/'; return }
      setError(String(data.error ?? t('login.error_generic')))
    } catch { setError(t('login.error_generic')) }
    finally  { setLoading(false) }
  }

  if (mode === 'login') return (
    <div style={page}>
      <form style={card} onSubmit={handleLogin} noValidate>
        <h1 style={title}>{t('login.title')}</h1>
        <Field id="lg-phone" label={t('login.phone_label')}    type="tel"      placeholder={t('login.phone_placeholder')}    value={phone}    onChange={setPhone}    autoComplete="tel" />
        <Field id="lg-pw"    label={t('login.password_label')} type="password" placeholder={t('login.password_placeholder')} value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p style={err} role="alert">{error}</p>}
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? t('login.loading') : t('login.submit')}
        </button>
      </form>
    </div>
  )

  return (
    <div style={page}>
      <form style={card} onSubmit={handleSetup} noValidate>
        <h1 style={title}>{t('login.setup_title')}</h1>
        <p  style={hint}>{t('login.setup_hint')}</p>
        <Field id="su-nick" label={t('login.nickname_label')}   type="text" placeholder={t('login.nickname_placeholder')} value={nickname}  onChange={setNickname}  autoComplete="nickname" />
        <Field id="su-bd"   label={t('login.birth_date_label')} type="date" value={birthDate} onChange={setBirthDate} />
        {error && <p style={err} role="alert">{error}</p>}
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? t('login.loading') : t('login.setup_submit')}
        </button>
      </form>
    </div>
  )
}
