/**
 * GatherOptionCard — 聚會候選項卡（投票 / 確認 / 負責人 / 一鍵聯絡）
 * 規格：.coappery/family_gather.md §5；聯絡掣沿用 merchant 平台（phone／whatsapp／map_url）
 */
import { useTranslation } from 'react-i18next'
import type { GatheringOption, VoteChoice } from '../utils/gatherPlan'
import { optionDetail } from '../utils/gatherPlan'
import { gsCard, gsMuted, gsRow, gsBtnGhost, gsBadge, gsLabel } from '../pages/gatherStyles'

interface Props {
  opt: GatheringOption
  members: { id: string; display_name: string }[]
  busy: boolean
  onVote: (id: string, choice: VoteChoice | 'none') => void
  onConfirm: (id: string) => void
  onDelete: (id: string) => void
  onAssign: (id: string, memberId: string | null) => void
}

const voteBtn = (active: boolean): React.CSSProperties => ({
  minHeight: '48px', minWidth: '64px', padding: '0 14px', borderRadius: '24px',
  fontSize: '17px', fontWeight: 'bold', fontFamily: 'inherit', cursor: 'pointer',
  border: active ? 'none' : '2px solid var(--color-divider)',
  backgroundColor: active ? 'var(--color-primary)' : 'var(--color-card)',
  color: active ? 'var(--color-card)' : 'var(--color-text)',
})

export default function GatherOptionCard({ opt, members, busy, onVote, onConfirm, onDelete, onAssign }: Props) {
  const { t } = useTranslation()
  const detail = optionDetail(opt)
  const isDropped = opt.status === 'dropped'
  const isConfirmed = opt.status === 'confirmed'

  return (
    <article style={{ ...gsCard, opacity: isDropped ? 0.55 : 1 }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        {opt.merchant?.photo_url && (
          <img src={opt.merchant.photo_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text)' }}>{opt.label}</h4>
          {detail && <p style={{ ...gsMuted, margin: '4px 0 0' }}>{detail}</p>}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {isConfirmed && <span style={gsBadge('ok')}>{t('gather.opt_confirmed')}</span>}
            {isDropped && <span style={gsBadge('off')}>{t('gather.opt_dropped')}</span>}
            {opt.assignee_name && <span style={gsBadge('wait')}>{t('gather.assignee')}: {opt.assignee_name}</span>}
          </div>
        </div>
      </div>

      {/* 一鍵聯絡（App 內不涉交易）*/}
      {opt.merchant && (
        <div style={gsRow}>
          {opt.merchant.phone && <a style={gsBtnGhost} href={`tel:${opt.merchant.phone}`}>📞 {t('gather.call')}</a>}
          {opt.merchant.whatsapp && (
            <a style={gsBtnGhost} href={`https://wa.me/${opt.merchant.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">💬 {t('gather.whatsapp')}</a>
          )}
          {opt.merchant.map_url && <a style={gsBtnGhost} href={opt.merchant.map_url} target="_blank" rel="noreferrer">📍 {t('gather.map')}</a>}
        </div>
      )}

      {/* 投票（每人一票）*/}
      <div style={{ marginTop: '12px' }}>
        <div style={{ ...gsLabel }}>{t('gather.vote_label')}</div>
        <div style={{ ...gsRow, marginTop: '4px' }}>
          <button disabled={busy} style={voteBtn(opt.my_choice === 'yes')}   onClick={() => onVote(opt.id, opt.my_choice === 'yes' ? 'none' : 'yes')}>👍 {t('gather.vote_yes')}</button>
          <button disabled={busy} style={voteBtn(opt.my_choice === 'maybe')} onClick={() => onVote(opt.id, opt.my_choice === 'maybe' ? 'none' : 'maybe')}>🤔 {t('gather.vote_maybe')}</button>
          <button disabled={busy} style={voteBtn(opt.my_choice === 'no')}    onClick={() => onVote(opt.id, opt.my_choice === 'no' ? 'none' : 'no')}>🙅 {t('gather.vote_no')}</button>
        </div>
        <p style={{ ...gsMuted, margin: '6px 0 0' }}>
          {t('gather.vote_tally', { yes: opt.tally.yes, maybe: opt.tally.maybe, no: opt.tally.no })}
        </p>
      </div>

      {/* 負責人 */}
      <div style={{ marginTop: '10px' }}>
        <label style={gsLabel} htmlFor={`as-${opt.id}`}>{t('gather.assignee')}</label>
        <select
          id={`as-${opt.id}`}
          style={{ minHeight: '48px', width: '100%', fontSize: '17px', fontFamily: 'inherit', borderRadius: '12px', border: '2px solid var(--color-divider)', padding: '0 10px', backgroundColor: 'var(--color-card)', color: 'var(--color-text)' }}
          value={opt.assignee_member_id ?? ''}
          onChange={e => onAssign(opt.id, e.target.value || null)}
        >
          <option value="">{t('gather.assignee_none')}</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </select>
      </div>

      {/* 確認 / 刪除 */}
      <div style={gsRow}>
        {!isConfirmed && <button disabled={busy} style={gsBtnGhost} onClick={() => onConfirm(opt.id)}>✅ {t('gather.confirm_this')}</button>}
        <button disabled={busy} style={{ ...gsBtnGhost, borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }} onClick={() => onDelete(opt.id)}>🗑 {t('gather.delete_option')}</button>
      </div>
    </article>
  )
}
