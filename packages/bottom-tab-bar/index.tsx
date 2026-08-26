/**
 * @coeldery/bottom-tab-bar
 * CoEldery 85 家庭樹 — 底部 Tab 導航欄組件
 *
 * 規格：
 *   - 高度 80px（含 safe-area-inset-bottom padding）
 *   - 4 個等寬 tab：家庭樹 / 家庭圈 / 家庭聚會 / 我的推薦
 *   - 每個 tab：上方 icon（28px）+ 下方文字標籤（18px Bold）
 *   - Active tab：文字 & icon 用 var(--color-primary)，頂部 3px 綠條
 *   - Inactive tab：灰色（var(--color-text-secondary)）
 *   - 熱區：每個 tab ≥ 80px 高（整個 tab 均可點擊）
 *   - current prop（'family_tree' | 'family_circle' | 'family_gathering' | 'my_recommendations'）
 * 顏色：只用 CSS var，禁止 hardcode hex
 * 文字：全部 via i18n t('key')
 */

import { useTranslation } from 'react-i18next'

export type TabId = 'family_tree' | 'family_circle' | 'family_gathering' | 'my_recommendations'

export interface BottomTabBarProps {
  /** 當前 active tab */
  current: TabId
  /** Tab 切換 handler（靜態 UI 可不傳） */
  onTabChange?: (tab: TabId) => void
}

interface TabConfig {
  id: TabId
  labelKey: string
}

/* ── SVG Icons（純 SVG，唔依賴外部 icon lib）─── */

function IconFamilyTree({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : 'var(--color-text-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* 樹幹 */}
      <rect x="11" y="14" width="2" height="6" rx="1" fill={color} />
      {/* 樹冠 */}
      <path d="M12 2L4 9h4v5h8V9h4L12 2z" fill={color} />
    </svg>
  )
}

function IconFamilyCircle({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : 'var(--color-text-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" fill={color} />
      <circle cx="15" cy="8" r="3" fill={color} />
      <path d="M3 20c0-3.3 2.7-6 6-6h6c3.3 0 6 2.7 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function IconFamilyGathering({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : 'var(--color-text-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* 慶祝 cup */}
      <path d="M5 3h14l-2 8H7L5 3z" fill={color} />
      <path d="M9 11l1 4h4l1-4" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="7" y="15" width="10" height="2" rx="1" fill={color} />
      {/* 彩帶 */}
      <circle cx="7" cy="4" r="1" fill={color} opacity="0.6" />
      <circle cx="17" cy="4" r="1" fill={color} opacity="0.6" />
    </svg>
  )
}

function IconMyRecommendations({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : 'var(--color-text-secondary)'
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
        fill={color}
      />
    </svg>
  )
}

/* ── Tab 配置 ─── */

const TABS: TabConfig[] = [
  { id: 'family_tree',        labelKey: 'bottom_tab_bar.family_tree' },
  { id: 'family_circle',      labelKey: 'bottom_tab_bar.family_circle' },
  { id: 'family_gathering',   labelKey: 'bottom_tab_bar.family_gathering' },
  { id: 'my_recommendations', labelKey: 'bottom_tab_bar.my_recommendations' },
]

/* ── Main Component ─── */

export default function BottomTabBar({ current, onTabChange }: BottomTabBarProps) {
  const { t } = useTranslation()

  return (
    <nav
      role="tablist"
      aria-label={t('app_name')}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        backgroundColor: 'var(--color-card)',
        borderTop: '1px solid var(--color-divider)',
        display: 'flex',
        alignItems: 'stretch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
        boxSizing: 'border-box',
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === current
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={t(tab.labelKey)}
            onClick={() => onTabChange?.(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '0',
              minHeight: '80px',
              position: 'relative',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              /* focus ring 長者友善 */
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '3px solid var(--color-primary)'
              e.currentTarget.style.outlineOffset = '-3px'
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none'
            }}
          >
            {/* 頂部 3px 指示條（Active 才顯示） */}
            {isActive && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '10%',
                  right: '10%',
                  height: '3px',
                  borderRadius: '0 0 3px 3px',
                  backgroundColor: 'var(--color-primary)',
                }}
              />
            )}

            {/* Icon（28px，動態傳色） */}
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px' }}>
              {tab.id === 'family_tree' && <IconFamilyTree active={isActive} />}
              {tab.id === 'family_circle' && <IconFamilyCircle active={isActive} />}
              {tab.id === 'family_gathering' && <IconFamilyGathering active={isActive} />}
              {tab.id === 'my_recommendations' && <IconMyRecommendations active={isActive} />}
            </span>

            {/* 標籤文字（18px Bold） */}
            <span
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                fontFamily: 'inherit',
                lineHeight: 1,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {t(tab.labelKey)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
