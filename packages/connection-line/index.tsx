/**
 * @coeldery/connection-line
 * CoEldery 85 家庭樹 — 代與代之間的垂直綠色連接線
 *
 * 原封搬移自 B1HomePage.tsx ConnectionLine（細步 3c refactor）。
 * 畫面、樣式、行為零改動。
 *
 * props:
 *   height — 連接線高度（px），預設 24
 *
 * 顏色：var(--color-primary)，禁止 hardcode hex。
 * 無文字，無 i18n 依賴。
 *
 * derivedFrom: .coappery/design/B1.md §4（代間連接）
 * SOP 規則 B：≤250 行。
 */

/* ── Props Interface ── */

export interface ConnectionLineProps {
  /** 連接線高度（px），預設 24 */
  height?: number
}

/* ── Component ── */

export default function ConnectionLine({ height = 24 }: ConnectionLineProps) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      style={{
        width: '2px',
        height: height + 'px',
        backgroundColor: 'var(--color-primary)',
        margin: '0 auto',
        flexShrink: 0,
      }}
    />
  )
}
