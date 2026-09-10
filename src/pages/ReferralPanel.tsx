/**
 * ReferralPanel — 推薦獎勵（Type B，家庭聚會首頁）
 *
 * 推薦家人加入 → 家人**成功加入**才計 1 位 → 達門檻（例：5）解鎖 → 自選商戶優惠 → 雙動作領取。
 * 規格：family_gather.md §6 Type B／§8 推薦飛輪；product_decisions v1.12
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CouponSticker from '../components/CouponSticker'
import { createReferral, claimReward, listReferrals, listRewards } from '../utils/referralApi'
import {
  inviteHref, inviteText, normalizePhone8, referralProgress, rewardState, unlockThreshold,
  defaultRewardClaimText, type ReferralCounts, type ReferralItem, type Reward,
} from '../utils/referrals'
import {
  gsCard, gsMuted, gsRow, gsSectionTitle, gsBtnPrimary, gsBtnGhost, gsInput, gsLabel, gsBadge,
} from './gatherStyles'

const INVITE_LINK = 'https://family.coeldery85.com/#/login'

export default function ReferralPanel() {
  const { t } = useTranslation()
  const [counts, setCounts] = useState<ReferralCounts>({ joined: 0, invited: 0 })
  const [referrals, setReferrals] = useState<ReferralItem[]>([])
  const [rewards, setRewards] = useState<Reward[]>([])
  const [memberNo, setMemberNo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [invitedPhone, setInvitedPhone] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [r, w] = await Promise.all([listReferrals(), listRewards()])
    setCounts(r.counts)
    setReferrals(r.referrals)
    setRewards(w.rewards)
  }, [])

  useEffect(() => {
    listReferrals()
      .then(r => { setCounts(r.counts); setReferrals(r.referrals) })
      .catch(() => undefined)
    listRewards()
      .then(w => setRewards(w.rewards))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.json())
      .then((d: { member_no?: string }) => setMemberNo(d.member_no ?? ''))
      .catch(() => undefined)
  }, [])

  const threshold = unlockThreshold(rewards)
  const prog = referralProgress(counts, threshold)

  async function submitInvite() {
    setErr('')
    const p = normalizePhone8(phone)
    if (!p) { setErr(t('referral.phone_invalid')); return }
    setBusy(true)
    const r = await createReferral({ phone: p, invitee_name: name.trim() || undefined })
    setBusy(false)
    if (!r.ok) { setErr(r.error ?? t('promo.err_generic')); return }
    setInvitedPhone(p)
    setPhone(''); setName('')
    load()
  }

  const inviteLink = invitedPhone ? inviteHref(invitedPhone, inviteText(name, memberNo, INVITE_LINK)) : null

  return (
    <section>
      <h3 style={gsSectionTitle}>{t('referral.section_title')}</h3>

      {/* 進度 */}
      <article style={gsCard}>
        <div style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t('referral.progress', { joined: prog.joined, required: prog.required })}
        </div>
        <div style={{ height: '10px', borderRadius: '6px', backgroundColor: 'var(--color-divider)', marginTop: '8px' }}>
          <div style={{ width: `${prog.percent}%`, height: '10px', borderRadius: '6px', backgroundColor: 'var(--color-primary)' }} />
        </div>
        <p style={{ ...gsMuted, margin: '6px 0 0' }}>
          {prog.unlocked ? t('referral.unlocked') : t('referral.progress_hint', { remaining: prog.remaining })}
        </p>

        <div style={gsRow}>
          <button style={gsBtnPrimary} onClick={() => setFormOpen(o => !o)}>👨‍👩‍👧 {t('referral.invite_btn')}</button>
          {inviteLink && (
            <a style={gsBtnGhost} href={inviteLink} target="_blank" rel="noreferrer">💬 {t('referral.invite_send')}</a>
          )}
        </div>

        {formOpen && (
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ ...gsMuted, margin: 0 }}>{t('referral.invite_hint')}</p>
            <div>
              <label style={gsLabel} htmlFor="rf-phone">{t('referral.invite_phone')}</label>
              <input id="rf-phone" style={gsInput} inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9123 4567" />
            </div>
            <div>
              <label style={gsLabel} htmlFor="rf-name">{t('referral.invite_name')}</label>
              <input id="rf-name" style={gsInput} value={name} onChange={e => setName(e.target.value)} />
            </div>
            {invitedPhone && (
              <p style={{ ...gsMuted, margin: 0, color: 'var(--color-primary)' }}>✓ {t('referral.invite_created')}</p>
            )}
            {err && <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-accent)' }}>{err}</p>}
            <div style={gsRow}>
              <button style={gsBtnPrimary} disabled={busy} onClick={submitInvite}>
                {busy ? t('gather.saving') : t('referral.invite_submit')}
              </button>
            </div>
          </div>
        )}
      </article>

      {/* 我嘅推薦 */}
      <article style={gsCard}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text)' }}>{t('referral.list_title')}</div>
        {referrals.length === 0 && <p style={{ ...gsMuted, margin: '6px 0 0' }}>{t('referral.no_referrals')}</p>}
        {referrals.map(r => (
          <p key={r.id} style={{ margin: '6px 0 0', fontSize: '16px', color: 'var(--color-text)' }}>
            {r.invitee_name ?? r.invitee_phone_masked}・{r.invitee_phone_masked}{' '}
            <span style={gsBadge(r.status === 'joined' ? 'ok' : 'wait')}>
              {r.status === 'joined' ? t('referral.status_joined') : t('referral.status_invited')}
            </span>
          </p>
        ))}
      </article>

      {/* 可選優惠（解鎖後）*/}
      <h3 style={gsSectionTitle}>{t('referral.rewards_title')}</h3>
      {rewards.length === 0 && (
        <p style={{ ...gsMuted, margin: '0 16px 12px' }}>{t('referral.no_rewards')}</p>
      )}
      {rewards.map(r => (
        <article key={r.id} style={gsCard}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text)' }}>{r.merchant.name}</div>
          <CouponSticker
            coupon={{
              id: r.id, title: r.title, description: r.description,
              quota_left: r.quota_left, my_claimed: r.my_claimed,
              required_referrals: r.required_referrals, merchant: r.merchant,
            }}
            state={rewardState(r)}
            defaultText={defaultRewardClaimText(r.title)}
            lockedHint={t('referral.locked_hint', { required: r.required_referrals, joined: counts.joined })}
            claim={() => claimReward(r.id)}
            onClaimed={() => load()}
          />
        </article>
      ))}
    </section>
  )
}
