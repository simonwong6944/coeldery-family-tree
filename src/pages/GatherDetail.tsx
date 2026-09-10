/**
 * GatherDetail — 聚會詳情（#/gather/:id）
 * 規格：.coappery/family_gather.md §5：候選（日期／地點／蛋糕／禮物）→ 逐人投票 → 確認 → 家庭圈邀請卡
 * 忌辰不適用（忌辰根本不可發起聚會，故此頁唔存在忌辰分支 —— rules §23）
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import GatherOptionCard from '../components/GatherOptionCard'
import GatherAddOption from './GatherAddOption'
import {
  getGathering, patchGathering, patchOption, deleteOption, voteOption, deleteGathering,
  type GatheringDetail as Detail,
} from '../utils/gatherApi'
import { groupByKind, hasConfirmed, optionDetail, OPTION_KINDS, type OptionKind, type VoteChoice } from '../utils/gatherPlan'
import { buildShareText, shareText } from '../utils/gatherNotify'
import {
  gsPage, gsMain, gsCard, gsH1, gsMuted, gsSectionTitle, gsRow, gsBtnPrimary, gsBtnGhost,
  gsBtnDanger, gsBadge, gsCentered,
} from './gatherStyles'

interface Props { gatheringId: string }

export default function GatherDetail({ gatheringId }: Props) {
  const { t } = useTranslation()
  const [d, setD] = useState<Detail | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [busy, setBusy] = useState(false)
  /* 「快速安排」由 #/gather/:id?add=cake&solemn=1 帶入，自動開加入候選面板 */
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const addParam = hashParams.get('add')
  const solemn = hashParams.get('solemn') === '1'
  const [addKind, setAddKind] = useState<OptionKind | null>(
    (OPTION_KINDS as readonly string[]).includes(addParam ?? '') ? (addParam as OptionKind) : null,
  )
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    const r = await getGathering(gatheringId)
    if (r.ok && r.data) { setD(r.data); setState('ok') } else setState('error')
  }, [gatheringId])

  useEffect(() => {
    getGathering(gatheringId)
      .then(r => { if (r.ok && r.data) { setD(r.data); setState('ok') } else setState('error') })
      .catch(() => setState('error'))
  }, [gatheringId])

  /* ── 動作 ── */
  async function vote(id: string, choice: VoteChoice | 'none') {
    setBusy(true); await voteOption(id, choice); setBusy(false); reload()
  }
  async function confirmOpt(id: string) {
    setBusy(true); await patchOption(id, { status: 'confirmed' }); setBusy(false); reload()
  }
  async function removeOpt(id: string) {
    if (!window.confirm(t('gather.confirm_delete_option'))) return
    setBusy(true); await deleteOption(id); setBusy(false); reload()
  }
  async function assign(id: string, memberId: string | null) {
    setBusy(true); await patchOption(id, { assignee_member_id: memberId }); setBusy(false); reload()
  }
  async function setStatus(status: 'voting' | 'confirmed' | 'cancelled') {
    setBusy(true); setErr('')
    const r = await patchGathering(gatheringId, { status })
    setBusy(false)
    if (!r.ok) { setErr(r.error ?? t('gather.err_generic')); return }
    reload()
  }
  async function removeGathering() {
    if (!window.confirm(t('gather.confirm_delete_gathering'))) return
    const r = await deleteGathering(gatheringId)
    if (r.ok) window.location.hash = '#/family-gather'
  }
  async function share() {
    if (!d) return
    const url = `${window.location.origin}/#/gather/${gatheringId}`
    const text = buildShareText({
      title: d.gathering.title,
      date: d.gathering.target_date,
      note: d.gathering.note,
      options: d.options,
      url,
    })
    const how = await shareText(text, url)
    if (how === 'copied') window.alert(t('gather.notify_copied'))
    else if (how === 'failed') window.alert(t('gather.notify_failed'))
  }

  if (state === 'loading') return <div style={gsPage}><TopBar titleKey="gather.page_title" onBack={() => { window.location.hash = '#/family-gather' }} /><p style={gsCentered}>{t('common.loading')}</p></div>
  if (state === 'error' || !d) return <div style={gsPage}><TopBar titleKey="gather.page_title" onBack={() => { window.location.hash = '#/family-gather' }} /><p style={gsCentered}>{t('gather.load_failed')}</p></div>

  const g = d.gathering
  const grouped = groupByKind(d.options)
  const statusTone = g.status === 'confirmed' ? 'ok' : g.status === 'cancelled' ? 'off' : 'wait'
  const confirmed = d.options.filter(o => o.status === 'confirmed')

  return (
    <div style={gsPage}>
      <TopBar titleKey="gather.page_title" onBack={() => { window.location.hash = '#/family-gather' }} />
      <main style={gsMain}>
        <h1 style={gsH1}>{g.title}</h1>
        <div style={{ margin: '0 16px 10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={gsBadge(statusTone)}>{t(`gather.status_${g.status}`)}</span>
          <span style={gsMuted}>{t(`gather.occ_${g.occasion_type}`)}</span>
          {d.subject_name && <span style={gsMuted}>・{d.subject_name}</span>}
          {g.target_date && <span style={gsMuted}>・{g.target_date}</span>}
        </div>

        {/* 已確認安排（＝最終定案，亦係邀請卡內容）*/}
        {confirmed.length > 0 && (
          <section style={gsCard}>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 'bold', color: 'var(--color-text)' }}>{t('gather.final_plan')}</h3>
            {confirmed.map(o => (
              <p key={o.id} style={{ margin: '4px 0', fontSize: '16px', color: 'var(--color-text)' }}>
                {t(`gather.kind_${o.kind}`)}：{o.label}{optionDetail(o) ? `（${optionDetail(o)}）` : ''}
              </p>
            ))}
            <div style={gsRow}>
              <button style={gsBtnGhost} onClick={share}>📣 {t('gather.notify_family')}</button>
              {g.invite_post_id && <span style={gsBadge('ok')}>{t('gather.invited_to_feed')}</span>}
            </div>
          </section>
        )}

        {/* 四類候選 */}
        {OPTION_KINDS.map(kind => (
          <section key={kind}>
            <h3 style={gsSectionTitle}>{t(`gather.kind_${kind}`)}</h3>
            {grouped[kind].length === 0 && (
              <p style={{ ...gsMuted, margin: '0 16px 8px' }}>{t('gather.no_candidate')}</p>
            )}
            {grouped[kind].map(o => (
              <GatherOptionCard key={o.id} opt={o} members={d.members} busy={busy}
                onVote={vote} onConfirm={confirmOpt} onDelete={removeOpt} onAssign={assign} />
            ))}
            <div style={{ margin: '0 16px 8px' }}>
              <button style={gsBtnGhost} onClick={() => setAddKind(kind)}>＋ {t('gather.add_option_title')}</button>
            </div>
          </section>
        ))}

        {err && <p style={{ ...gsMuted, margin: '0 16px 8px', color: 'var(--color-accent)' }}>{err}</p>}

        {/* 聚會狀態動作 */}
        <section style={gsCard}>
          <div style={gsRow}>
            {!hasConfirmed(d.options) && g.status !== 'confirmed' && (
              <span style={gsMuted}>{t('gather.hint_confirm_first')}</span>
            )}
            {g.status !== 'confirmed' && g.status !== 'cancelled' && (
              <button style={gsBtnPrimary} disabled={busy} onClick={() => setStatus('confirmed')}>✅ {t('gather.confirm_gathering')}</button>
            )}
            {g.status === 'confirmed' && (
              <button style={gsBtnGhost} disabled={busy} onClick={() => setStatus('voting')}>↩︎ {t('gather.reopen')}</button>
            )}
            {g.status !== 'cancelled' && (
              <button style={gsBtnGhost} disabled={busy} onClick={() => setStatus('cancelled')}>{t('gather.cancel_gathering')}</button>
            )}
            <button style={gsBtnDanger} disabled={busy} onClick={removeGathering}>🗑 {t('gather.delete_gathering')}</button>
          </div>
        </section>
      </main>

      {addKind && (
        <GatherAddOption
          gatheringId={gatheringId} kind={addKind} members={d.members} solemn={solemn}
          festivalId={g.festival_id ?? undefined}
          onClose={() => setAddKind(null)}
          onDone={() => { setAddKind(null); reload() }}
        />
      )}
    </div>
  )
}
