/**
 * @coeldery/event-detail
 * CoEldery 85 — 事件詳情頁（慶祝版 + 忌辰莊重版共用組件）
 * 規格：.coappery/design/B5_reminder_cards.md §3 §4 §5
 * variant='celebration' → 慶祝版 / variant='memorial' → 忌辰版
 * 顏色：只用 CSS var，禁止 hardcode hex / rgba
 * 文字：全部 via i18n t('key') · 行數上限：≤250 行
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../top-bar'
import BottomTabBar from '../bottom-tab-bar'
import type { TabId } from '../bottom-tab-bar'

export interface EventDetailProps { variant: 'celebration' | 'memorial' }

const TABS: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
}
function usePress(): [boolean, () => void] {
  const [on, set] = useState(false)
  return [on, () => { set(true); setTimeout(() => set(false), 500) }]
}

export default function EventDetail({ variant }: EventDetailProps) {
  const { t } = useTranslation()
  const isCel = variant === 'celebration'
  const [fabOn, trigFab] = usePress()

  /* ── data ── */
  const actions = isCel
    ? [['🎁','celebration_action1'],['🎉','celebration_action2'],['👨‍👩‍👧‍👦','celebration_action3']]
    : [['🕊️','memorial_action1'],['🕯️','memorial_action2'],['📖','memorial_action3']]
  const msgs = isCel
    ? [['celebration_msg1','https://randomuser.me/api/portraits/women/44.jpg'],
       ['celebration_msg2','https://randomuser.me/api/portraits/men/22.jpg']]
    : [['memorial_msg1','https://randomuser.me/api/portraits/men/68.jpg'],
       ['memorial_msg2','https://randomuser.me/api/portraits/women/44.jpg'],
       ['memorial_msg3','https://randomuser.me/api/portraits/men/22.jpg']]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh', backgroundColor: 'var(--color-bg)' }}>
      <TopBar titleKey="b5_detail.page_title" onBack={() => window.history.back()} />

      <main role="main" style={{ flex: 1, overflowY: 'auto', padding: '72px 16px 96px' }}>

        {/* ── Header Card ── */}
        <article style={{
          backgroundColor: isCel ? 'var(--color-card)' : 'var(--bg-solemn)',
          borderRadius: '16px', boxShadow: 'var(--shadow-soft)',
          padding: '20px', marginBottom: '16px',
        }}>
          {isCel ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '12px', flexShrink: 0,
                backgroundColor: 'var(--bg-engagement)', border: '2px solid var(--color-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
              }}>🎂</div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                  {t('b5_detail.celebration_h1', { name: t('gen1.member_self_name') })}
                </h2>
                <p style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--color-text-secondary)' }}>
                  {t('b5_detail.celebration_date')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-card)', fontSize: '16px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '28px' }}>
                    {t('b5_detail.celebration_relation')}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    {t('b5_detail.celebration_countdown', { days: 18 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px', fontSize: '28px', color: 'var(--color-solemn-stroke)' }}>🕊️</p>
              <h2 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                {t('b5_detail.memorial_h1')}
              </h2>
              <p style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--color-text-secondary)' }}>{t('b5_detail.memorial_sub')}</p>
              <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text)' }}>{t('b5_detail.memorial_body')}</p>
            </div>
          )}
        </article>

        {/* ── Middle Action Cards ── */}
        <section>
          <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
            {t(isCel ? 'b5_detail.celebration_action_section' : 'b5_detail.memorial_action_section')}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--color-text-secondary)' }}>
            {t(isCel ? 'b5_detail.celebration_action_section_sub' : 'b5_detail.memorial_action_section_sub')}
          </p>
          {(actions as [string,string][]).map(([icon, key], i) => (
            <ActionCard key={i} icon={icon} titleKey={`b5_detail.${key}_title`} subKey={`b5_detail.${key}_sub`} isCel={isCel} />
          ))}
        </section>

        {/* ── Bottom 訊息列表 ── */}
        <section style={{ marginTop: '8px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>
            {t(isCel ? 'b5_detail.celebration_bottom_title' : 'b5_detail.memorial_bottom_title')}
          </h3>
          {(msgs as [string,string][]).map(([pfx, url], i) => (
            <MsgRow key={i} prefix={pfx} avatarUrl={url} isCel={isCel} />
          ))}
        </section>
      </main>

      {/* ── FAB ── */}
      <button onClick={trigFab}
        aria-label={t(isCel ? 'b5_detail.celebration_fab' : 'b5_detail.memorial_fab')}
        style={{
          position: 'fixed', bottom: '96px', right: '20px',
          minHeight: '56px', borderRadius: '28px', padding: '0 20px',
          fontSize: '18px', fontWeight: 'bold', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', cursor: 'pointer', zIndex: 100,
          border: isCel ? 'none' : '2px solid var(--color-text-secondary)',
          backgroundColor: isCel ? 'var(--color-primary)' : 'var(--color-card)',
          color: isCel ? 'var(--color-card)' : 'var(--color-text)',
          boxShadow: isCel ? (fabOn ? '0 4px 14px var(--green-glow-strong)' : 'var(--shadow-cta)') : 'var(--shadow-soft)',
          transform: fabOn ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.15s, box-shadow 0.15s',
        }}>
        {t(isCel ? 'b5_detail.celebration_fab' : 'b5_detail.memorial_fab')}
      </button>

      <BottomTabBar current="family_circle" onTabChange={tab => { window.location.hash = TABS[tab] }} />
    </div>
  )
}

/* ── Action Card ── */
function ActionCard({ icon, titleKey, subKey, isCel }: { icon: string; titleKey: string; subKey: string; isCel: boolean }) {
  const { t } = useTranslation()
  const [on, trigger] = usePress()
  return (
    <button onClick={trigger} style={{
      width: '100%', minHeight: '80px', borderRadius: '16px', marginBottom: '12px',
      backgroundColor: 'var(--color-card)', boxShadow: 'var(--shadow-soft)', padding: '16px',
      border: isCel ? 'none' : '1px solid var(--color-divider)',
      display: 'flex', alignItems: 'center', gap: '16px',
      cursor: 'pointer', fontFamily: 'inherit',
      opacity: on ? 0.75 : 1, transition: 'opacity 0.15s', boxSizing: 'border-box',
    }}>
      <span style={{ fontSize: '32px', width: '48px', flexShrink: 0, textAlign: 'center', filter: isCel ? 'none' : 'grayscale(100%)' }}>
        {icon}
      </span>
      <div style={{ flex: 1, textAlign: 'left' }}>
        <p style={{ margin: '0 0 2px', fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text)' }}>{t(titleKey)}</p>
        <p style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-secondary)' }}>{t(subKey)}</p>
      </div>
      <span style={{ fontSize: '20px', color: isCel ? 'var(--color-text-secondary)' : 'var(--color-solemn-stroke)', flexShrink: 0 }}>›</span>
    </button>
  )
}

/* ── Message Row ── */
function MsgRow({ prefix, avatarUrl, isCel }: { prefix: string; avatarUrl: string; isCel: boolean }) {
  const { t } = useTranslation()
  return (
    <div style={{
      backgroundColor: isCel ? 'var(--bg-engagement)' : 'var(--bg-solemn-row)',
      borderRadius: '12px', padding: '12px', marginBottom: '8px',
      display: 'flex', gap: '12px', alignItems: 'flex-start',
    }}>
      <img src={avatarUrl} alt={t('a11y.avatar_alt', { name: t(`b5_detail.${prefix}_name`) })}
        style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover', filter: isCel ? 'none' : 'grayscale(100%)' }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'baseline' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text)' }}>{t(`b5_detail.${prefix}_name`)}</span>
          <span style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>{t(`b5_detail.${prefix}_time`)}</span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '18px', color: 'var(--color-text)' }}>{t(`b5_detail.${prefix}_body`)}</p>
      </div>
    </div>
  )
}
