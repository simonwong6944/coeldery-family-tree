/**
 * GrowthAlbumSection — 成長相簿區（每位成員含寵物一個；月曆式時間軸）
 * 供 MemberDetail.tsx 使用。
 *   GET    /api/growth-album?subject_member_id=<id>
 *   POST   /api/growth-album { subject_member_id, media_kind, url, year, month }
 *   DELETE /api/growth-album/:id
 * 依 product_decisions §二 / v1.6：人人皆有、一視同仁、不設動態 tab。
 * 上傳：先 Cloudinary 簽名上載（rules §9），成功攞到 URL 才寫 DB。
 * 顏色只用 CSS var；文字全 i18n；長者友善。
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadPhotoToCloudinary, MAX_PHOTO_BYTES } from '../utils/cloudinaryUpload'

interface AlbumItem {
  id: string; media_kind: string; url: string; poster_url: string | null
  year: number; month: number; duration_seconds: number | null
  caption: string | null; created_at: string
}
interface AlbumMonth { year: number; month: number; items: AlbumItem[] }
interface AlbumData { months: AlbumMonth[]; limits: { photo: number; video: number } }

function ymNow(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export default function GrowthAlbumSection({ memberId }: { memberId: string }) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<AlbumData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const now = ymNow()
  const [target, setTarget] = useState(`${now.year}-${String(now.month).padStart(2, '0')}`)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/growth-album?subject_member_id=${encodeURIComponent(memberId)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: AlbumData | null) => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [memberId])

  useEffect(() => { load() }, [load])

  const thisMonth  = data?.months.find(m => m.year === now.year && m.month === now.month)
  const photoUsed  = thisMonth?.items.filter(i => i.media_kind === 'photo').length ?? 0
  const videoUsed  = thisMonth?.items.filter(i => i.media_kind === 'video').length ?? 0
  const photoLimit = data?.limits.photo ?? 5
  const videoLimit = data?.limits.video ?? 2

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    const file = e.target.files?.[0] ?? null
    if (!file) return
    const clear = () => { if (fileRef.current) fileRef.current.value = '' }
    if (!file.type.startsWith('image/')) { setError(t('b4.compose_err_not_image')); clear(); return }
    if (file.size > MAX_PHOTO_BYTES)      { setError(t('b4.compose_err_too_large')); clear(); return }

    const [y, m] = target.split('-').map(Number)
    if (!y || !m) { setError(t('growth_album.upload_failed')); return }

    setUploading(true)
    try {
      const url = await uploadPhotoToCloudinary(file)
      const res = await fetch('/api/growth-album', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_member_id: memberId, media_kind: 'photo', url, year: y, month: m }),
      })
      const d = await res.json() as { ok: boolean; error?: string }
      if (!d.ok) { setError(d.error ?? t('growth_album.upload_failed')); return }
      load()
    } catch { setError(t('growth_album.upload_failed')) }
    finally { setUploading(false); clear() }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('growth_album.delete_confirm'))) return
    await fetch(`/api/growth-album/${id}`, { method: 'DELETE', credentials: 'include' })
    load()
  }

  const months = data?.months ?? []

  return (
    <section style={card} aria-label={t('growth_album.title')}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
        <h3 style={{ margin:0, fontSize:'18px', fontWeight:'bold', color:'var(--color-text)' }}>{t('growth_album.title')}</h3>
        <span style={{ fontSize:'16px', color:'var(--color-text-secondary)' }}>
          {t('growth_album.quota', { photo: photoUsed, photoLimit, video: videoUsed, videoLimit })}
        </span>
      </div>

      <button
        onClick={() => { window.location.hash = `#/album/${memberId}` }}
        style={{ width:'100%', minHeight:'48px', marginBottom:'12px', borderRadius:'12px', fontSize:'16px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:'2px solid var(--color-primary)', backgroundColor:'var(--color-card)', color:'var(--color-primary)' }}
      >
        {t('growth_album.view_all')} ›
      </button>

      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
        <label htmlFor="ga-month" style={{ fontSize:'16px', color:'var(--color-text)' }}>{t('growth_album.month_pick')}</label>
        <input id="ga-month" type="month" value={target} onChange={e => setTarget(e.target.value)} style={monthInput} />
        <button onClick={() => { setError(''); fileRef.current?.click() }} disabled={uploading} style={uploadBtn(uploading)}>
          {uploading ? t('growth_album.uploading') : t('growth_album.upload_btn')}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }} />
      </div>

      {error && <p role="alert" style={{ margin:'0 0 12px', fontSize:'15px', color:'var(--color-accent)' }}>{error}</p>}

      {loading ? (
        <p style={muted}>{t('common.loading')}</p>
      ) : months.length === 0 ? (
        <p style={muted}>{t('growth_album.empty')}</p>
      ) : (
        months.map(mo => (
          <div key={`${mo.year}-${mo.month}`} style={{ marginBottom:'16px' }}>
            <p style={{ margin:'0 0 8px', fontSize:'16px', fontWeight:'bold', color:'var(--color-primary)' }}>
              {t('growth_album.month_label', { year: mo.year, month: mo.month })}
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {mo.items.map(it => (
                <div key={it.id} style={thumb}>
                  <img
                    src={it.media_kind === 'photo' ? it.url : (it.poster_url ?? it.url)}
                    alt=""
                    style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                  />
                  <button onClick={() => handleDelete(it.id)} aria-label={t('growth_album.delete_confirm')} style={delBtn}>✕</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  )
}

/* ── styles ── */
const card: React.CSSProperties = { backgroundColor:'var(--color-card)', borderRadius:'12px', padding:'16px' }
const muted: React.CSSProperties = { margin:0, fontSize:'16px', color:'var(--color-text-secondary)', lineHeight:1.5 }
const thumb: React.CSSProperties = { position:'relative', width:'96px', height:'96px', borderRadius:'8px', overflow:'hidden', backgroundColor:'var(--color-divider)' }
const monthInput: React.CSSProperties = { minHeight:'44px', padding:'0 8px', borderRadius:'8px', border:'1.5px solid var(--color-divider)', fontSize:'16px', fontFamily:'inherit', color:'var(--color-text)', backgroundColor:'var(--color-card)' }
const delBtn: React.CSSProperties = { position:'absolute', top:'4px', right:'4px', width:'28px', height:'28px', borderRadius:'50%', border:'none', cursor:'pointer', backgroundColor:'var(--color-card)', color:'var(--color-accent)', fontSize:'16px', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center' }
function uploadBtn(dis: boolean): React.CSSProperties {
  return {
    minHeight:'48px', padding:'0 20px', borderRadius:'24px', fontSize:'16px', fontWeight:'bold', fontFamily:'inherit',
    cursor: dis ? 'not-allowed' : 'pointer', border:'2px solid var(--color-primary)',
    backgroundColor: dis ? 'var(--color-divider)' : 'var(--color-card)', color:'var(--color-primary)',
  }
}
