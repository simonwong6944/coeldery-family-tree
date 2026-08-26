/**
 * B1HomePage — 家庭樹主頁（靜態 UI，狀態 A 有成員）
 *
 * 依 .coappery/design/B1.md 規範實作。
 * 細步 3a 範圍：靜態 UI only — 唔做 swipe、唔做 state、唔做 mock 陣列、唔做 autoplay。
 *
 * 頁面結構：
 *   - TopBar：標題「家庭樹」，右側三 icons（＋加人 / 分享 / 🔔通知+紅點）
 *   - BottomTabBar：active = 'family_tree'
 *   - 主體 scroll：Gen 1（固定）→ 連接線 → Gen 2 carousel（靜態）→ 連接線 → Gen 3
 *
 * Gen 1：我 + 太太，80px 圓形頭像，綠色心形，2px 連接線向下
 * Gen 2：focused 大仔+大新抱+Lucky（280px 寬，2px 綠框），左露「阿女一家」peek，右露「細仔一家」peek
 *        大新抱頭像右上角紅點（新動態）；底部指示點 ● ○ ○
 * Gen 3：孫仔 + 孫女（64px 頭像），指示點 ● ○
 *
 * TopBar rightSlot：三個獨立 button，每個 ≥ 44×44px，icon + 文字。
 * 顏色：全部 CSS var。文字：全部 i18n t('key')。
 */

import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo } from '../../packages/household-card'

/* ── Top Bar Right Slot ─── */

function TopBarRightSlot() {
  const { t } = useTranslation()

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
    padding: '4px 6px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text)',
    fontSize: '12px',
    fontFamily: 'inherit',
    gap: '2px',
    outline: 'none',
    position: 'relative',
  }

  const iconStyle: React.CSSProperties = {
    fontSize: '20px',
    lineHeight: 1,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--color-text-secondary)',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  }

  return (
    <>
      {/* ＋加人 */}
      <button
        aria-label={t('top_bar.add_member')}
        style={btnStyle}
        onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
        onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
      >
        <span style={iconStyle} aria-hidden="true">＋</span>
        <span style={labelStyle}>{t('top_bar.add_member')}</span>
      </button>

      {/* 分享 */}
      <button
        aria-label={t('top_bar.share')}
        style={btnStyle}
        onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
        onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
      >
        <span style={iconStyle} aria-hidden="true">⬆</span>
        <span style={labelStyle}>{t('top_bar.share')}</span>
      </button>

      {/* 🔔 通知（紅點） */}
      <button
        aria-label={t('top_bar.notifications')}
        style={{ ...btnStyle, position: 'relative' }}
        onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
        onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
      >
        <span style={{ position: 'relative', display: 'inline-block', fontSize: '20px', lineHeight: 1 }} aria-hidden="true">
          🔔
          {/* 8×8px 紅點，白色 2px 外圈 */}
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              border: '2px solid var(--color-card)',
              display: 'block',
            }}
            aria-hidden="true"
          />
        </span>
        <span style={labelStyle}>{t('top_bar.notifications')}</span>
      </button>
    </>
  )
}

/* ── Vertical Connection Line ─── */

function ConnectionLine({ height = 24 }: { height?: number }) {
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

/* ── Generation Layer Label ─── */

function GenLabel({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation()
  return (
    <p
      style={{
        margin: '0 0 8px',
        fontSize: '16px',
        fontWeight: 'normal',
        color: 'var(--color-text-secondary)',
        textAlign: 'center',
        letterSpacing: '0.5px',
      }}
    >
      {t(labelKey)}
    </p>
  )
}

/* ── Indicator Dots ─── */

function IndicatorDots({ total, active }: { total: number; active: number }) {
  return (
    <div
      aria-label={`第 ${active + 1} 個，共 ${total} 個`}
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '16px',
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: i === active ? 'var(--color-primary)' : 'transparent',
            border: i === active ? 'none' : '2px solid var(--color-divider)',
            display: 'block',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  )
}

/* ── Gen 2 Peek Card (static, no interactivity) ─── */

function PeekCard({ labelText, side }: { labelText: string; side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: '32px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
        overflow: 'hidden',
        opacity: 0.5,
        filter: 'grayscale(10%)',
        position: 'relative',
      }}
    >
      {/* 半露卡邊緣（示意） */}
      <div
        style={{
          width: '32px',
          height: '160px',
          backgroundColor: 'var(--color-card)',
          borderRadius: side === 'left' ? '0 16px 16px 0' : '16px 0 0 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1.5px solid var(--color-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          padding: '8px 4px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <span style={{ fontSize: '11px', textAlign: 'center', lineHeight: 1.2 }}>
          {labelText}
        </span>
      </div>

      {/* Chevron 暗示 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          [side === 'left' ? 'right' : 'left']: '-12px',
          fontSize: '16px',
          color: 'var(--color-text-secondary)',
          opacity: 0.6,
        }}
      >
        {side === 'left' ? '‹' : '›'}
      </span>
    </div>
  )
}

/* ── Gen 3 Member Avatar ─── */

function Gen3Member({ member, size = 64 }: { member: MemberInfo; size?: number }) {
  const initial = member.name.charAt(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <div
          aria-label={member.name}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: 'var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: Math.round(size * 0.38) + 'px',
            fontWeight: 'bold',
            color: 'var(--color-text)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '2px solid var(--color-primary)',
          }}
        >
          {initial}
        </div>
      </div>
      <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)', textAlign: 'center' }}>
        {member.name}
      </span>
      <span style={{ fontSize: '16px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        {member.relation}
      </span>
    </div>
  )
}

/* ── Main Page Component ─── */

export default function B1HomePage() {
  const { t } = useTranslation()

  /* ── 靜態資料（全部來自 i18n，唔 hardcode 文字）── */

  const gen1Primary: MemberInfo = {
    name: t('gen1.member_self'),
    relation: t('gen1.member_self_relation'),
  }

  const gen1Secondary: MemberInfo = {
    name: t('gen1.member_spouse'),
    relation: t('gen1.member_spouse_relation'),
  }

  /* Gen 2 focused 卡：大仔 + 大新抱 + Lucky */
  const gen2FocusedPrimary: MemberInfo = {
    name: t('gen2.member_eldest_son'),
    relation: t('gen2.member_eldest_son_relation'),
  }

  const gen2FocusedSecondary: MemberInfo = {
    name: t('gen2.member_eldest_daughter_in_law'),
    relation: t('gen2.member_eldest_daughter_in_law_relation'),
    showNotificationDot: true, /* 大新抱頭像有新動態紅點 */
  }

  /* Gen 3：孫仔 + 孫女 */
  const gen3Grandson: MemberInfo = {
    name: t('gen3.member_grandson'),
    relation: t('gen3.member_grandson_relation'),
  }

  const gen3Granddaughter: MemberInfo = {
    name: t('gen3.member_granddaughter'),
    relation: t('gen3.member_granddaughter_relation'),
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── TopBar ── */}
      <TopBar
        titleKey="top_bar.title"
        rightSlot={<TopBarRightSlot />}
      />

      {/* ── 主體 scroll 區域（56px top padding + 80px bottom padding）── */}
      <main
        role="main"
        aria-label={t('app_name')}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '56px',
          paddingBottom: '80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* ─── GEN 1 SECTION ─── */}
        <section
          aria-label={t('gen1.layer_label')}
          style={{
            width: '100%',
            padding: '24px 16px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <GenLabel labelKey="gen1.layer_label" />

          <HouseholdCard
            variant="couple"
            primaryMember={gen1Primary}
            secondaryMember={gen1Secondary}
            avatarSize={80}
            isFocused={false}
            width="100%"
          />

          {/* 連接線 Gen1 → Gen2 */}
          <ConnectionLine height={24} />
        </section>

        {/* ─── GEN 2 SECTION ─── */}
        <section
          aria-label={t('gen2.layer_label')}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <GenLabel labelKey="gen2.layer_label" />

          {/* Carousel Band（靜態，overflow hidden，三卡並排：左peek + focused + 右peek） */}
          <div
            role="group"
            aria-label={t('gen2.layer_label')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0',
              paddingLeft: '16px',
              paddingRight: '16px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* 左 peek：阿女一家 */}
            <PeekCard labelText={t('gen2.member_daughter') + '一家'} side="left" />

            {/* Focused 卡：大仔一家（大仔 + 大新抱 + Lucky） */}
            <div style={{ flex: '0 0 auto', width: 'calc(100% - 64px - 32px)', maxWidth: '320px' }}>
              <HouseholdCard
                variant="couple_with_pet"
                primaryMember={gen2FocusedPrimary}
                secondaryMember={gen2FocusedSecondary}
                pet={{
                  name: t('gen2.pet_name'),
                  petType: t('gen2.pet_type'),
                  ownerRelation: t('gen2.pet_owner_relation'),
                }}
                avatarSize={64}
                isFocused
                width="100%"
              />
            </div>

            {/* 右 peek：細仔一家 */}
            <PeekCard labelText={t('gen2.member_youngest_son') + '一家'} side="right" />
          </div>

          {/* Gen2 指示點（● ○ ○，active = index 0 即 大仔一家） */}
          <IndicatorDots total={3} active={0} />

          {/* 連接線 Gen2 → Gen3 */}
          <div style={{ marginTop: '8px' }}>
            <ConnectionLine height={24} />
          </div>
        </section>

        {/* ─── GEN 3 SECTION ─── */}
        <section
          aria-label={t('gen3.layer_label')}
          style={{
            width: '100%',
            padding: '0 16px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          <GenLabel labelKey="gen3.layer_label" />

          {/* Gen 3 卡（白底，孫仔 + 孫女 並排） */}
          <div
            role="group"
            aria-label={t('gen3.layer_label')}
            style={{
              backgroundColor: 'var(--color-card)',
              borderRadius: '16px',
              border: '2px solid var(--color-primary)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '24px',
              width: '100%',
              maxWidth: '320px',
              boxSizing: 'border-box',
            }}
          >
            <Gen3Member member={gen3Grandson} size={64} />
            <Gen3Member member={gen3Granddaughter} size={64} />
          </div>

          {/* Gen 3 指示點（● ○，active = 0） */}
          <IndicatorDots total={2} active={0} />

          {/* 底部 padding 緩衝 */}
          <div style={{ height: '32px' }} />
        </section>
      </main>

      {/* ── BottomTabBar ── */}
      <BottomTabBar current="family_tree" />
    </div>
  )
}
