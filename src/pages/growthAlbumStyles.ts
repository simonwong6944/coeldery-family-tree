/**
 * growthAlbumStyles — GrowthAlbumPage 的樣式（抽離以令頁 ≤200 行）
 * 顏色只用 CSS var。
 */

export const centered: React.CSSProperties = { padding: '24px 16px', fontSize: '18px', color: 'var(--color-text-secondary)', textAlign: 'center' }
export const muted: React.CSSProperties = { margin: '8px 0', fontSize: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }
export const monthHeading: React.CSSProperties = { margin: '0 0 8px', fontSize: '17px', fontWeight: 'bold', color: 'var(--color-primary)' }
export const monthInput: React.CSSProperties = { minHeight: '44px', padding: '0 8px', borderRadius: '8px', border: '1.5px solid var(--color-divider)', fontSize: '16px', fontFamily: 'inherit', color: 'var(--color-text)', backgroundColor: 'var(--color-card)' }
export const thumbBtn: React.CSSProperties = { width: '104px', height: '104px', padding: 0, border: 'none', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', backgroundColor: 'var(--color-divider)' }

export function uploadBtn(dis: boolean): React.CSSProperties {
  return { minHeight: '48px', padding: '0 20px', borderRadius: '24px', fontSize: '16px', fontWeight: 'bold', fontFamily: 'inherit', cursor: dis ? 'not-allowed' : 'pointer', border: '2px solid var(--color-primary)', backgroundColor: dis ? 'var(--color-divider)' : 'var(--color-card)', color: 'var(--color-primary)' }
}
export function segBtn(active: boolean): React.CSSProperties {
  return { flex: 1, minHeight: '48px', borderRadius: '24px', fontSize: '16px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer', border: '2px solid var(--color-primary)', backgroundColor: active ? 'var(--color-primary)' : 'var(--color-card)', color: active ? 'var(--color-card)' : 'var(--color-primary)' }
}
export function yearBtn(dis: boolean): React.CSSProperties {
  return { width: '44px', height: '44px', borderRadius: '50%', border: '2px solid var(--color-primary)', cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.4 : 1, backgroundColor: 'var(--color-card)', color: 'var(--color-primary)', fontSize: '22px', lineHeight: 1 }
}
export function monthCell(hasItems: boolean, active: boolean): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
    minHeight: '64px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
    border: active ? '2.5px solid var(--color-primary)' : '1.5px solid var(--color-divider)',
    backgroundColor: active ? 'var(--color-primary)' : 'var(--color-card)',
    color: active ? 'var(--color-card)' : (hasItems ? 'var(--color-primary)' : 'var(--color-text-secondary)'),
  }
}
