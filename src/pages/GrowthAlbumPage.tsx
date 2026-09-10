/**
 * GrowthAlbumPage — 成長相簿頁（#/album/:memberId）
 * 月曆（12 月格）+ 時間軸（由舊到新）+ 全屏 lightbox + 上傳（可揀月份補錄）
 * 依 product_decisions §二 / v1.6：每位成員（含寵物）一個。
 * 顏色只用 CSS var；文字全 i18n；長者友善。
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import PhotoLightbox from '../components/PhotoLightbox'
import type { LightboxItem } from '../components/PhotoLightbox'
import { uploadPhotoToCloudinary, uploadVideoToCloudinary, readVideoDuration, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from '../utils/cloudinaryUpload'
import { centered, muted, monthHeading, monthInput, thumbBtn, playBadge, uploadBtn, segBtn, yearBtn, monthCell } from './growthAlbumStyles'

interface AlbumItem {
  id: string; media_kind: string; url: string; poster_url: string | null
  year: number; month: number; duration_seconds: number | null
  caption: string | null; created_at: string
}
interface AlbumMonth { year: number; month: number; items: AlbumItem[] }
interface AlbumData { months: AlbumMonth[]; limits: { photo: number; video: number } }
interface TreeMember { id: string; display_name: string; avatar_url: string | null; member_kind: string }

function ymNow(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export default function GrowthAlbumPage({ memberId }: { memberId: string }) {
  const { t } = useTranslation()
  const now = ymNow()
  const fileRef = useRef<HTMLInputElement>(null)

  const [data, setData]       = useState<AlbumData | null>(null)
  const [member, setMember]   = useState<TreeMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState<'calendar' | 'timeline'>('calendar')
  const [year, setYear]       = useState(now.year)
  const [selMonth, setSel]    = useState<number | null>(null)
  const [lb, setLb]           = useState<{ items: LightboxItem[]; index: number } | null>(null)
  const [uploading, setUp]    = useState(false)
  const [error, setError]     = useState('')
  const [target, setTarget]   = useState(`${now.year}-${String(now.month).padStart(2, '0')}`)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/growth-album?subject_member_id=${encodeURIComponent(memberId)}`, { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/tree', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
    ])
      .then(([alb, tree]: [AlbumData | null, { members?: TreeMember[] } | null]) => {
        if (alb) setData(alb)
        const m = tree?.members?.find(x => x.id === memberId)
        if (m) setMember(m)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [memberId])

  useEffect(() => { load() }, [load])

  const months      = data?.months ?? []
  const thisMonth   = months.find(m => m.year === now.year && m.month === now.month)
  const photoUsed   = thisMonth?.items.filter(i => i.media_kind === 'photo').length ?? 0
  const videoUsed   = thisMonth?.items.filter(i => i.media_kind === 'video').length ?? 0
  const photoLimit  = data?.limits.photo ?? 5
  const videoLimit  = data?.limits.video ?? 2
  const name        = member?.display_name ?? ''

  const countOf   = (y: number, m: number) => months.find(x => x.year === y && x.month === m)?.items.length ?? 0
  const itemsOf   = (y: number, m: number) => months.find(x => x.year === y && x.month === m)?.items ?? []

  function openLb(items: AlbumItem[], idx: number) {
    setLb({
      items: items.map(i => ({ id: i.id, url: i.url, poster_url: i.poster_url, media_kind: i.media_kind, year: i.year, month: i.month })),
      index: idx,
    })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError('')
    const file = e.target.files?.[0] ?? null
    if (!file) return
    const clear = () => { if (fileRef.current) fileRef.current.value = '' }

    const [y, m] = target.split('-').map(Number)
    if (!y || !m) { setError(t('growth_album.upload_failed')); return }

    const isVideo = file.type.startsWith('video/')
    if (!isVideo && !file.type.startsWith('image/')) { setError(t('growth_album.err_not_media')); clear(); return }
    if (isVideo  && file.size > MAX_VIDEO_BYTES)     { setError(t('b4.compose_err_too_large')); clear(); return }
    if (!isVideo && file.size > MAX_PHOTO_BYTES)     { setError(t('b4.compose_err_too_large')); clear(); return }

    /* 短片先在本機驗長度（≤ 90 秒），避免白 upload */
    if (isVideo) {
      const dur = await readVideoDuration(file)
      if (dur != null && dur > MAX_VIDEO_SECONDS) { setError(t('growth_album.video_too_long')); clear(); return }
    }

    setUp(true)
    try {
      const payload: Record<string, unknown> = { subject_member_id: memberId, year: y, month: m }
      if (isVideo) {
        const v = await uploadVideoToCloudinary(file)
        if (v.durationSeconds > MAX_VIDEO_SECONDS) { setError(t('growth_album.video_too_long')); return }
        payload.media_kind = 'video'
        payload.url = v.url
        payload.poster_url = v.posterUrl
        payload.duration_seconds = v.durationSeconds
      } else {
        payload.media_kind = 'photo'
        payload.url = await uploadPhotoToCloudinary(file)
      }
      const res = await fetch('/api/growth-album', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await res.json() as { ok: boolean; error?: string }
      if (!d.ok) { setError(d.error ?? t('growth_album.upload_failed')); return }
      setYear(y); setSel(m); load()
    } catch { setError(t('growth_album.upload_failed')) }
    finally { setUp(false); clear() }
  }

  const selItems = selMonth ? itemsOf(year, selMonth) : []
  const grid = (items: AlbumItem[]) => (
    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
      {items.map((it, i) => {
        const src = it.media_kind === 'photo' ? it.url : (it.poster_url ?? it.url)
        return (
          <button key={it.id} onClick={() => openLb(items, i)} style={thumbBtn}>
            <img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
            {it.media_kind === 'video' && <span style={playBadge}>▶</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <div style={{ minHeight:'100svh', backgroundColor:'var(--color-bg)', display:'flex', flexDirection:'column' }}>
      <TopBar titleKey="growth_album.title" onBack={() => { window.location.hash = `#/member/${memberId}` }} />

      <main style={{ flex:1, overflowY:'auto', overflowX:'hidden', paddingTop:'56px', paddingBottom:'24px' }}>
        {/* 身份 + 配額 */}
        <section style={{ padding:'20px 16px 0', display:'flex', alignItems:'center', gap:'12px' }}>
          <img src={member?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`} alt=""
            style={{ width:'56px', height:'56px', borderRadius:'50%', objectFit:'cover', backgroundColor:'var(--color-divider)' }} />
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:'20px', fontWeight:'bold', color:'var(--color-text)' }}>{t('growth_album.album_title', { name })}</p>
            <span style={{ fontSize:'16px', color:'var(--color-text-secondary)' }}>{t('growth_album.quota', { photo: photoUsed, photoLimit, video: videoUsed, videoLimit })}</span>
          </div>
        </section>

        {/* 上傳（可揀月份補錄舊相）*/}
        <section style={{ padding:'16px 16px 0', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
          <label htmlFor="ga-month" style={{ fontSize:'16px', color:'var(--color-text)' }}>{t('growth_album.month_pick')}</label>
          <input id="ga-month" type="month" value={target} onChange={e => setTarget(e.target.value)} style={monthInput} />
          <button onClick={() => { setError(''); fileRef.current?.click() }} disabled={uploading} style={uploadBtn(uploading)}>
            {uploading ? t('growth_album.uploading') : t('growth_album.upload_btn')}
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display:'none' }} />
        </section>
        {error && <p role="alert" style={{ margin:'8px 16px 0', fontSize:'15px', color:'var(--color-accent)' }}>{error}</p>}

        {/* 檢視切換：月曆 ↔ 時間軸 */}
        <section style={{ padding:'16px 16px 0', display:'flex', gap:'8px' }}>
          <button onClick={() => setView('calendar')} style={segBtn(view === 'calendar')}>{t('growth_album.view_calendar')}</button>
          <button onClick={() => setView('timeline')} style={segBtn(view === 'timeline')}>{t('growth_album.view_timeline')}</button>
        </section>

        {loading ? (
          <p style={centered}>{t('common.loading')}</p>
        ) : view === 'calendar' ? (
          <section style={{ padding:'16px 16px 0' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'16px', marginBottom:'12px' }}>
              <button onClick={() => setYear(y => y - 1)} aria-label="prev" style={yearBtn(false)}>‹</button>
              <span style={{ fontSize:'18px', fontWeight:'bold', color:'var(--color-text)' }}>{t('growth_album.year_label', { year })}</span>
              <button onClick={() => setYear(y => Math.min(now.year, y + 1))} disabled={year >= now.year} aria-label="next" style={yearBtn(year >= now.year)}>›</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => {
                const n = countOf(year, mo)
                return (
                  <button key={mo} onClick={() => setSel(selMonth === mo ? null : mo)} style={monthCell(n > 0, selMonth === mo)}>
                    <span style={{ fontSize:'16px', fontWeight:'bold' }}>{mo} 月</span>
                    <span style={{ fontSize:'14px' }}>{n > 0 ? t('growth_album.count_unit', { count: n }) : '—'}</span>
                  </button>
                )
              })}
            </div>
            {selMonth !== null && (
              <div style={{ marginTop:'16px' }}>
                <p style={monthHeading}>{t('growth_album.month_label', { year, month: selMonth })}</p>
                {selItems.length === 0 ? <p style={muted}>{t('growth_album.empty_month')}</p> : grid(selItems)}
              </div>
            )}
          </section>
        ) : (
          <section style={{ padding:'16px 16px 0' }}>
            {months.length === 0 ? <p style={muted}>{t('growth_album.empty')}</p> : months.map(mo => (
              <div key={`${mo.year}-${mo.month}`} style={{ marginBottom:'20px' }}>
                <p style={monthHeading}>{t('growth_album.month_label', { year: mo.year, month: mo.month })}</p>
                {grid(mo.items)}
              </div>
            ))}
          </section>
        )}
      </main>

      {lb && <PhotoLightbox items={lb.items} index={lb.index} onClose={() => setLb(null)} onIndex={i => setLb(s => (s ? { ...s, index: i } : s))} />}
    </div>
  )
}

