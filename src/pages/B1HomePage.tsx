/**
 * B1HomePage — 家庭樹主頁（靜態 UI，狀態 A 有成員）
 *
 * 依 .coappery/design/B1.md 規範實作。
 * 細步 3a 範圍：靜態 UI only — 不做 swipe、不做 state、不做 mock 陣列、不做 autoplay。
 *
 * 頁面結構：
 *   - TopBar：三欄 flex 佈局（左返回 / 中標題 / 右三 icon），右側純 icon（rules.md 第16條例外）
 *   - BottomTabBar：active = 'family_tree'
 *   - 主體 scroll：Gen 1（固定）→ 連接線 → Gen 2 carousel（靜態）→ 連接線 → Gen 3
 *
 * Gen 1：本人 + 妻子，80px 圓形頭像，法拉利紅心形（--color-accent），2px 連接線向下
 * Gen 2：focused 長子+長媳+Lucky（min-width 自適應，2px 綠框），左露女兒一家半卡，右露幼子一家半卡
 *        長媳頭像右上角紅點（新動態）；底部指示點 ● ○ ○
 * Gen 3：孫兒 + 孫女（64px 頭像），指示點 ● ○
 *
 * TopBar rightSlot：三欄 flex，三個純 icon（rules.md 第16條）每個 ≥ 44×44px，各有 aria-label。
 * 顏色：全部 CSS var。文字：全部 i18n t('key')。
 */

import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import HouseholdCard from '../../packages/household-card'
import type { MemberInfo } from '../../packages/household-card'

/* ── SVG Icons（line-style，統一線寬 1.8，圓角 stroke-linecap round）── */

/** 新增家人 icon（＋人形，line-style） */
function IconAddMember({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* 人頭 */}
      <circle cx="10" cy="7" r="3.5" />
      {/* 身體弧線 */}
      <path d="M3 19c0-3.314 3.134-6 7-6s7 2.686 7 6" />
      {/* 右上角 + 號 */}
      <line x1="19" y1="9" x2="19" y2="15" />
      <line x1="16" y1="12" x2="22" y2="12" />
    </svg>
  )
}

/** 分享 icon（上箭頭 + 底部框，line-style） */
function IconShare({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* 上箭頭 */}
      <line x1="12" y1="3" x2="12" y2="15" />
      <polyline points="8 7 12 3 16 7" />
      {/* 底部托盤 */}
      <path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    </svg>
  )
}

/** 通知鈴鐺 icon（line-style） */
function IconBell({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* 鐘身 */}
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      {/* 鐘舌 */}
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

/* ── Top Bar Right Slot（純 icon，rules.md 第16條例外）── */

function TopBarRightSlot() {
  const { t } = useTranslation()

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    padding: 0,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    outline: 'none',
    position: 'relative',
    flexShrink: 0,
  }

  return (
    <>
      {/* ＋新增家人（純 icon，aria-label 正式書面繁中） */}
      <button
        aria-label={t('top_bar.add_member')}
        style={btnStyle}
        onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
        onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
      >
        <IconAddMember size={22} />
      </button>

      {/* 分享（純 icon） */}
      <button
        aria-label={t('top_bar.share')}
        style={btnStyle}
        onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
        onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
      >
        <IconShare size={22} />
      </button>

      {/* 通知（純 icon + 紅點） */}
      <button
        aria-label={t('top_bar.notifications')}
        style={btnStyle}
        onFocus={(e) => { e.currentTarget.style.outline = '3px solid var(--color-primary)'; e.currentTarget.style.outlineOffset = '2px' }}
        onBlur={(e) => { e.currentTarget.style.outline = 'none' }}
      >
        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconBell size={22} />
          {/* 8×8px 紅點，白色 2px 外圈 */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              border: '2px solid var(--color-card)',
              display: 'block',
            }}
          />
        </span>
      </button>
    </>
  )
}

/* ── Vertical Connection Line ── */

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

/* ── Generation Layer Label ── */

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

/* ── Indicator Dots ── */

function IndicatorDots({ total, active }: { total: number; active: number }) {
  const { t } = useTranslation()
  return (
    <div
      aria-label={t('common.indicator_position', { active: active + 1, total })}
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

/* ── Gen 2 Peek Card（露半張真實 HouseholdCard，isPeek=true）── */
/*
 * 3d 規格：移除直排文字條，改為露出相鄰真卡片的一部分。
 * 透過 overflow:hidden 截斷，令真卡片的左/右半邊可見。
 * isPeek=true 令 HouseholdCard 自動套用半透明 + grayscale + scale 0.92 樣式。
 */

function PeekCard({
  side,
  primaryMember,
  secondaryMember,
  pet,
}: {
  side: 'left' | 'right'
  primaryMember: MemberInfo
  secondaryMember?: MemberInfo
  pet?: import('../../packages/household-card').PetInfo
}) {
  /* peek 容器：固定寬度 56px，overflow hidden，露出真卡片的一邊 */
  return (
    <div
      aria-hidden="true"
      style={{
        width: '56px',
        flexShrink: 0,
        overflow: 'hidden',
        /* 左 peek：卡片靠右，露出右半；右 peek：卡片靠左，露出左半 */
        display: 'flex',
        alignItems: 'center',
        justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
        position: 'relative',
      }}
    >
      {/* 真實 HouseholdCard，isPeek=true 自動淡化 + 縮小 */}
      <div
        style={{
          /*
           * 卡片向外偏移，令其被容器截斷，形成「半露」效果：
           * 左 peek：卡片向右偏移，露出左邊緣；
           * 右 peek：卡片向左偏移，露出右邊緣。
           * translateX 偏移量 = 卡片寬度 - 容器寬度（約 200-250px 被截）
           */
          transform: side === 'left'
            ? 'translateX(calc(100% - 56px)) scale(0.92)'
            : 'translateX(calc(-100% + 56px)) scale(0.92)',
          transformOrigin: side === 'left' ? 'right center' : 'left center',
          opacity: 0.5,
          filter: 'grayscale(15%)',
          transition: 'none',
          flexShrink: 0,
          width: '220px', /* 固定寬度令偏移量可預測 */
        }}
      >
        <HouseholdCard
          variant={pet ? 'couple_with_pet' : secondaryMember ? 'couple' : 'single'}
          primaryMember={primaryMember}
          secondaryMember={secondaryMember}
          pet={pet}
          avatarSize={52}
          isFocused={false}
          isPeek={false} /* 已由父層處理 opacity/filter/scale，不重複套用 */
          width="220px"
        />
      </div>

      {/* Chevron 暗示（疊加在截斷邊緣） */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          [side === 'left' ? 'right' : 'left']: '4px',
          transform: 'translateY(-50%)',
          fontSize: '18px',
          color: 'var(--color-text-secondary)',
          opacity: 0.7,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {side === 'left' ? '‹' : '›'}
      </span>
    </div>
  )
}

/* ── Gen 3 Member Avatar ── */

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
            boxShadow: 'var(--shadow-soft)',
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

/* ── Main Page Component ── */

export default function B1HomePage() {
  const { t } = useTranslation()

  /* ── 靜態資料（全部來自 i18n，不 hardcode 文字）── */

  const gen1Primary: MemberInfo = {
    name: t('gen1.member_self'),
    relation: t('gen1.member_self_relation'),
  }

  const gen1Secondary: MemberInfo = {
    name: t('gen1.member_spouse'),
    relation: t('gen1.member_spouse_relation'),
  }

  /* Gen 2 focused 卡：長子 + 長媳 + Lucky */
  const gen2FocusedPrimary: MemberInfo = {
    name: t('gen2.member_eldest_son'),
    relation: t('gen2.member_eldest_son_relation'),
  }

  const gen2FocusedSecondary: MemberInfo = {
    name: t('gen2.member_eldest_daughter_in_law'),
    relation: t('gen2.member_eldest_daughter_in_law_relation'),
    showNotificationDot: true, /* 長媳頭像有新動態紅點 */
  }

  /* Gen 2 左 peek：女兒一家 */
  const gen2PeekLeftPrimary: MemberInfo = {
    name: t('gen2.member_daughter'),
    relation: t('gen2.member_daughter_relation'),
  }

  /* Gen 2 右 peek：幼子一家 */
  const gen2PeekRightPrimary: MemberInfo = {
    name: t('gen2.member_youngest_son'),
    relation: t('gen2.member_youngest_son_relation'),
  }

  /* Gen 3：孫兒 + 孫女 */
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
      {/* ── TopBar（三欄 flex 佈局，頂欄不重疊）── */}
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

          {/*
           * Carousel Band（靜態）
           * 佈局：左 peek（56px） | focused 卡（min-width 自適應，max 320px） | 右 peek（56px）
           * 3c：focused 卡改用 min-width + 內容撐開，避免固定闊度導致 overflow。
           * 3d：左右 peek 改為露出真卡片的一部分，移除直排文字條。
           */}
          <div
            role="group"
            aria-label={t('gen2.layer_label')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: '0',
              paddingRight: '0',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            {/* 左 peek：女兒一家（露右半邊） */}
            <PeekCard
              side="left"
              primaryMember={gen2PeekLeftPrimary}
            />

            {/* Focused 卡：長子一家（長子 + 長媳 + Lucky） */}
            {/* 3c：min-width 取代固定寬度，讓內容決定實際寬度，max-width 仍受 B1.md 約束 */}
            <div
              style={{
                flex: '1 1 auto',
                minWidth: '0',
                maxWidth: '320px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
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

            {/* 右 peek：幼子一家（露左半邊） */}
            <PeekCard
              side="right"
              primaryMember={gen2PeekRightPrimary}
            />
          </div>

          {/* Gen2 指示點（● ○ ○，active = index 0 即長子一家） */}
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

          {/* Gen 3 卡（白底，孫兒 + 孫女 並排） */}
          <div
            role="group"
            aria-label={t('gen3.layer_label')}
            style={{
              backgroundColor: 'var(--color-card)',
              borderRadius: '16px',
              border: '2px solid var(--color-primary)',
              boxShadow: 'var(--shadow-soft)',
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
