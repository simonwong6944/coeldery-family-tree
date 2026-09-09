/**
 * Login — 家族樹登入 / 首次設定頁  (#/login)
 *
 * 流程 A（普通登入）：
 *   登入版 → POST /api/family/login
 *     needs_setup:false → #/（熟客，已種 cookie）
 *     needs_setup:true  → 切換首次設定版（帶 phone，清 password）
 *     401              → 電話或密碼錯誤
 *   首次設定版（普通）→ POST /api/family/setup（需電話 + 密碼 + 暱稱 + 生日）
 *     → #/；403 非會員；409 電話已設定；400 欄位錯
 *
 * 流程 B（handoff 入嚟，handoffSetup=true）：
 *   直接顯示 setup 版，唔需電話（member_no 已由 handoff token 帶入並種喺 session）
 *   首次設定版（handoff）→ POST /api/family/setup-with-session（只需密碼 + 暱稱 + 生日）
 *     → #/；401 session 失效；403 未加入任何樹；409 已設定；400 欄位錯
 *
 * 風格：inline style + CSS variable，同 B1HomePage.tsx 慣例。頁 ≤ 220 行。
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
const err:   React.CSSProperties = { fontSize:'15px', color:col('--color-accent'), textAlign:'center', margin:0 }

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

interface LoginProps {
  /** true = 從 handoff token 入嚟，session 已種，直接顯示 setup 版（唔需電話）*/
  handoffSetup?: boolean
}

export default function Login({ handoffSetup = false }: LoginProps) {
  const { t } = useTranslation()
  /* handoffSetup=true → 直接進 setup 模式 */
  const [mode, setMode]                   = useState<'login'|'setup'>(handoffSetup ? 'setup' : 'login')
  const [phone, setPhone]                 = useState('')
  const [password, setPassword]           = useState('')
  const [passwordConfirm, setPwConfirm]   = useState('')
  const [nickname, setNickname]           = useState('')
  const [birthDate, setBirthDate]         = useState('')
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)

  const btnStyle: React.CSSProperties = { ...btn, ...(loading ? { opacity:0.55, cursor:'not-allowed' } : {}) }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!phone.trim())  { setError(t('login.error_phone_format'));   return }
    if (!password)      { setError(t('login.error_password_empty')); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/family/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        credentials:'include', body:JSON.stringify({ phone:phone.trim(), password }),
      })
      const data = await res.json() as Record<string,unknown>
      // 強制整頁重載確保新 family_session cookie 在 /api/family/me 生效，消除 race condition
      if (res.ok && data.needs_setup === false) { window.location.assign('/'); return }
      if (res.ok && data.needs_setup === true)  {
        // 帶電話去 setup 版，密碼清空（setup 版重新設定）
        setPassword(''); setPwConfirm('')
        setMode('setup'); return
      }
      if (res.status===401) { setError(t('login.error_credentials')); return }
      if (res.status===400) { setError(String(data.error ?? t('login.error_phone_format'))); return }
      setError(t('login.error_generic'))
    } catch { setError(t('login.error_generic')) }
    finally  { setLoading(false) }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault(); setError('')
    // 前端驗證
    if (password.length < 8)          { setError(t('login.setup_pwd_too_short')); return }
    if (password !== passwordConfirm) { setError(t('login.setup_pwd_mismatch'));  return }
    if (!nickname.trim())             { setError(t('login.error_nickname_empty')); return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) { setError(t('login.error_birth_date')); return }
    setLoading(true)
    try {
      if (handoffSetup) {
        /* ── Handoff 路徑：靠 session cookie 認人，唔傳電話 ── */
        const res  = await fetch('/api/family/setup-with-session', {
          method:'POST', headers:{'Content-Type':'application/json'},
          credentials:'include',
          body:JSON.stringify({ password, nickname:nickname.trim(), birth_date:birthDate }),
        })
        const data = await res.json() as Record<string,unknown>
        // 強制整頁重載（同 handleLogin），確保 cookie 在 /api/family/me 生效
        if (res.ok && data.ok)    { window.location.assign('/'); return }
        if (res.status===401)     { setError(t('login.error_generic')); return }  // session 失效
        if (res.status===403)     { setError(t('login.setup_not_member'));  return }
        if (res.status===409)     { setError(t('login.setup_node_exists')); return }
        setError(String(data.error ?? t('login.error_generic')))
      } else {
        /* ── 普通路徑：電話 + 85AI lookup ── */
        const res  = await fetch('/api/family/setup', {
          method:'POST', headers:{'Content-Type':'application/json'},
          credentials:'include',
          body:JSON.stringify({ phone:phone.trim(), password, nickname:nickname.trim(), birth_date:birthDate }),
        })
        const data = await res.json() as Record<string,unknown>
        // 強制整頁重載（同 handleLogin），確保 cookie 在 /api/family/me 生效
        if (res.ok && data.ok)    { window.location.assign('/'); return }
        if (res.status===403)     { setError(t('login.setup_not_member'));  return }
        if (res.status===409)     { setError(t('login.setup_node_exists')); return }
        setError(String(data.error ?? t('login.error_generic')))
      }
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
        {/* handoffSetup=true：唔顯示電話欄（member_no 已由 token 帶入，種咗 session）*/}
        {!handoffSetup && (
          <Field id="su-phone" label={t('login.phone_label')} type="tel" placeholder={t('login.phone_placeholder')} value={phone} onChange={setPhone} autoComplete="tel" />
        )}
        <Field id="su-pw"   label={t('login.setup_pwd_label')}         type="password" placeholder={t('login.password_placeholder')} value={password}        onChange={setPassword}  autoComplete="new-password" />
        <Field id="su-pw2"  label={t('login.setup_pwd_confirm_label')} type="password" placeholder={t('login.password_placeholder')} value={passwordConfirm} onChange={setPwConfirm} autoComplete="new-password" />
        <Field id="su-nick" label={t('login.nickname_label')}          type="text"     placeholder={t('login.nickname_placeholder')} value={nickname}        onChange={setNickname}  autoComplete="nickname" />
        <Field id="su-bd"   label={t('login.birth_date_label')}        type="date"     value={birthDate} onChange={setBirthDate} />
        {error && <p style={err} role="alert">{error}</p>}
        <button type="submit" style={btnStyle} disabled={loading}>
          {loading ? t('login.loading') : t('login.setup_submit')}
        </button>
      </form>
    </div>
  )
}
