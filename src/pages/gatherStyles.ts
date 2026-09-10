/**
 * gatherStyles — 家庭聚會相關頁面共用樣式（跟 growthAlbumStyles.ts 慣例）
 * 顏色一律 CSS var；長者友善：可點元素 ≥44px、字級 ≥15px。
 */
import type { CSSProperties } from 'react'

const col = (v: string) => `var(${v})`

export const gsPage: CSSProperties = {
  minHeight: '100svh', backgroundColor: col('--color-bg'), display: 'flex', flexDirection: 'column',
}
export const gsMain: CSSProperties = { flex: 1, overflowY: 'auto', paddingTop: '56px', paddingBottom: '96px' }
export const gsCard: CSSProperties = {
  backgroundColor: col('--color-card'), borderRadius: '16px', padding: '14px',
  margin: '0 16px 12px', boxShadow: col('--shadow-soft'),
}
export const gsSectionTitle: CSSProperties = {
  margin: '20px 16px 8px', fontSize: '17px', fontWeight: 'bold', color: col('--color-text'),
}
export const gsMuted: CSSProperties = { fontSize: '15px', color: col('--color-text-secondary') }
export const gsH1: CSSProperties = { margin: '16px 16px 6px', fontSize: '22px', fontWeight: 'bold', color: col('--color-text') }
export const gsCentered: CSSProperties = { padding: '24px 16px', textAlign: 'center', fontSize: '16px', color: col('--color-text-secondary') }

export const gsBtnPrimary: CSSProperties = {
  minHeight: '48px', padding: '0 20px', borderRadius: '24px', fontSize: '17px', fontWeight: 'bold',
  fontFamily: 'inherit', cursor: 'pointer', border: 'none',
  backgroundColor: col('--color-primary'), color: col('--color-card'),
}
export const gsBtnGhost: CSSProperties = {
  minHeight: '44px', padding: '0 16px', borderRadius: '22px', fontSize: '16px', fontWeight: 'bold',
  fontFamily: 'inherit', cursor: 'pointer',
  border: `2px solid ${col('--color-primary')}`, backgroundColor: col('--color-card'), color: col('--color-primary'),
}
export const gsBtnDanger: CSSProperties = { ...gsBtnGhost, borderColor: col('--color-accent'), color: col('--color-accent') }

export const gsChip = (active: boolean): CSSProperties => ({
  minHeight: '44px', padding: '0 16px', borderRadius: '22px', fontSize: '16px', fontWeight: 'bold',
  fontFamily: 'inherit', cursor: 'pointer', border: `2px solid ${col('--color-primary')}`,
  backgroundColor: active ? col('--color-primary') : col('--color-card'),
  color: active ? col('--color-card') : col('--color-primary'),
})

export const gsInput: CSSProperties = {
  width: '100%', minHeight: '48px', padding: '10px 12px', boxSizing: 'border-box',
  fontSize: '17px', fontFamily: 'inherit', borderRadius: '12px',
  border: `2px solid ${col('--color-divider')}`, backgroundColor: col('--color-card'), color: col('--color-text'),
}
export const gsLabel: CSSProperties = { fontSize: '15px', fontWeight: 'bold', color: col('--color-text'), marginBottom: '4px' }
export const gsRow: CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }
export const gsOverlay: CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 200,
  display: 'flex', alignItems: 'flex-end',
}
export const gsSheet: CSSProperties = {
  width: '100%', maxHeight: '88vh', overflowY: 'auto',
  backgroundColor: col('--color-card'), borderRadius: '20px 20px 0 0',
  padding: '20px 20px 36px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '12px',
}
export const gsBadge = (tone: 'ok' | 'wait' | 'off'): CSSProperties => {
  const c = tone === 'ok' ? col('--color-primary') : tone === 'wait' ? col('--color-text-secondary') : col('--color-accent')
  return {
    display: 'inline-block', fontSize: '13px', fontWeight: 'bold', color: c,
    border: `1px solid ${c}`, borderRadius: '10px', padding: '1px 8px',
  }
}
