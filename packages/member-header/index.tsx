/**
 * @coeldery/member-header — 成員身份區（B2 詳情頁頂部）
 * variant: 'person' | 'pet'
 * 衍生自：.coappery/design/B2_B3.md §2.1–2.2
 * 禁止 hardcode hex；文字全部 via t('key')；觸控區 ≥44×44px。
 */

import { useTranslation } from 'react-i18next'

/* ── Types ─── */

export interface OwnerInfo {
  name: string
  onClick?: () => void
}

export type MemberHeaderVariant = 'person' | 'pet'

export interface MemberHeaderProps {
  variant: MemberHeaderVariant
  avatarUrl?: string
  name: string
  /** 關係標籤文字（18px 綠底白字 pill） */
  relationLabel: string
  /** 主人列表（僅 pet 版） */
  owners?: OwnerInfo[]
  /** 寵物生日字串（僅 pet 版，如「2025年3月10日」） */
  birthday?: string
  /** 是否顯示 🐾 badge（僅 pet 版，預設 true） */
  showPawBadge?: boolean
}

/* ── Avatar（96px，綠色 1px ring，首字母 fallback）─── */

function MemberAvatar({ avatarUrl, name, showPawBadge = false }: {
  avatarUrl?: string; name: string; showPawBadge?: boolean
}) {
  const sz = 96
  return (
    <div style={{ position: 'relative', width: sz, height: sz }} aria-label={name}>
      <div style={{ position: 'absolute', inset: '-2px', borderRadius: '50%',
        border: '1px solid var(--color-primary)', pointerEvents: 'none' }} aria-hidden="true" />
      {avatarUrl && (
        <img src={avatarUrl} alt={name}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            (e.currentTarget.nextElementSibling as HTMLElement | null)
              ?.style.setProperty('display', 'flex')
          }}
          style={{ width: sz, height: sz, borderRadius: '50%', objectFit: 'cover',
            display: 'block', boxShadow: 'var(--shadow-soft)' }} />
      )}
      <div style={{ width: sz, height: sz, borderRadius: '50%',
        backgroundColor: 'var(--color-divider)',
        display: avatarUrl ? 'none' : 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', fontWeight: 'bold', color: 'var(--color-text)',
        boxShadow: 'var(--shadow-soft)' }} aria-hidden="true">
        {name.charAt(0)}
      </div>
      {showPawBadge && (
        <span aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0,
          fontSize: '16px', lineHeight: 1, background: 'var(--color-card)',
          borderRadius: '50%', padding: '2px' }}>🐾</span>
      )}
    </div>
  )
}

/* ── RelationPill（18px，綠底白字，圓角 28px）─── */

function RelationPill({ label }: { label: string }) {
  return (
    <span style={{ display: 'inline-block', backgroundColor: 'var(--color-primary)',
      color: 'var(--color-card)', fontSize: '18px', fontWeight: 'normal',
      fontFamily: 'inherit', padding: '4px 16px', borderRadius: '28px',
      lineHeight: 1.4, minHeight: '32px', textAlign: 'center' }}>
      {label}
    </span>
  )
}

/* ── Main Component ─── */

export default function MemberHeader({
  variant, avatarUrl, name, relationLabel,
  owners, birthday, showPawBadge = true,
}: MemberHeaderProps) {
  const { t } = useTranslation()

  return (
    <section aria-label={t('member_header.section_label', { name })}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '12px', padding: '24px 16px 16px', backgroundColor: 'var(--color-card)' }}>

      {/* 大圓頭像 */}
      <MemberAvatar avatarUrl={avatarUrl} name={name}
        showPawBadge={variant === 'pet' && showPawBadge} />

      {/* 姓名 20px Bold */}
      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold',
        color: 'var(--color-text)', fontFamily: 'inherit',
        textAlign: 'center', lineHeight: 1.3 }}>
        {name}
      </h2>

      {/* 關係 pill */}
      <RelationPill label={relationLabel} />

      {/* pet 版：主人列 */}
      {variant === 'pet' && owners && owners.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px',
          flexWrap: 'wrap', justifyContent: 'center', fontSize: '18px',
          color: 'var(--color-text-secondary)', fontFamily: 'inherit' }}>
          <span>{t('member_header.owners_prefix')}</span>
          {owners.map((owner, idx) => (
            <span key={owner.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {owner.onClick ? (
                <button type="button" onClick={owner.onClick}
                  aria-label={t('member_header.owner_link_label', { name: owner.name })}
                  style={{ background: 'none', border: 'none', padding: 0, margin: 0,
                    cursor: 'pointer', fontSize: '18px', fontFamily: 'inherit',
                    color: 'var(--color-primary)', textDecoration: 'underline',
                    minWidth: '44px', minHeight: '44px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {owner.name}
                </button>
              ) : (
                <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                  {owner.name}
                </span>
              )}
              {idx < owners.length - 1 && (
                <span style={{ color: 'var(--color-text-secondary)' }}>、</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* pet 版：寵物生日列 */}
      {variant === 'pet' && birthday && (
        <p style={{ margin: 0, fontSize: '18px', color: 'var(--color-text-secondary)',
          fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.4 }}
          aria-label={t('member_header.birthday_label', { date: birthday })}>
          {t('member_header.birthday_prefix')}
          <strong style={{ color: 'var(--color-text)', marginLeft: '4px' }}>{birthday}</strong>
        </p>
      )}
    </section>
  )
}
