/**
 * GatherPlanForm — 發起聚會（底部 sheet）
 * 忌辰唔會出現：PLAN_OCCASIONS 已排除 memorial（rules §23），API 亦會擋。
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createGathering } from '../utils/gatherApi'
import { PLAN_OCCASIONS, defaultTitle, type PlanOccasion } from '../utils/gatherPlan'
import {
  gsOverlay, gsSheet, gsInput, gsLabel, gsRow, gsBtnPrimary, gsBtnGhost, gsChip, gsMuted,
} from './gatherStyles'

interface Props {
  initial?: { occasion?: string; subject?: string; date?: string }
  onClose: () => void
  onCreated: (id: string) => void
}

interface MemberOpt { id: string; display_name: string; member_kind: string }

export default function GatherPlanForm({ initial, onClose, onCreated }: Props) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<MemberOpt[]>([])
  const [occasion, setOccasion] = useState<PlanOccasion>(
    (PLAN_OCCASIONS as readonly string[]).includes(initial?.occasion ?? '') ? (initial?.occasion as PlanOccasion) : 'birthday',
  )
  const [subject, setSubject] = useState(initial?.subject ?? '')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initial?.date ?? '')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/tree', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { members?: MemberOpt[] }) => setMembers(d.members ?? []))
      .catch(() => undefined)
  }, [])

  /* 標題未填時自動生成（場合／對象一改就跟）*/
  const autoTitle = defaultTitle(occasion, members.find(m => m.id === subject)?.display_name ?? null, t)
  const finalTitle = title.trim() || autoTitle

  async function submit() {
    setErr('')
    if (!finalTitle) { setErr(t('gather.err_need_name')); return }
    setBusy(true)
    const r = await createGathering({
      title: finalTitle, occasion_type: occasion,
      subject_member_id: subject || null, target_date: date || null,
      note: note.trim() || null,
    })
    setBusy(false)
    if (!r.ok) { setErr(r.error ?? t('gather.err_generic')); return }
    const id = r.data?.gathering.id
    if (id) onCreated(id)
  }

  return (
    <div style={gsOverlay} onClick={onClose}>
      <div style={gsSheet} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text)' }}>{t('gather.plan_title')}</h3>
        <p style={{ ...gsMuted, margin: 0 }}>{t('gather.plan_hint')}</p>

        <div>
          <div style={gsLabel}>{t('gather.plan_occasion')}</div>
          <div style={gsRow}>
            {PLAN_OCCASIONS.map(o => (
              <button key={o} style={gsChip(occasion === o)} onClick={() => setOccasion(o)}>{t(`gather.occ_${o}`)}</button>
            ))}
          </div>
        </div>

        <div>
          <label style={gsLabel} htmlFor="gp-subject">{t('gather.plan_subject')}</label>
          <select id="gp-subject" style={gsInput} value={subject} onChange={e => setSubject(e.target.value)}>
            <option value="">{t('gather.plan_subject_none')}</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </div>

        <div>
          <label style={gsLabel} htmlFor="gp-title">{t('gather.plan_name')}</label>
          <input id="gp-title" style={gsInput} value={title} placeholder={autoTitle} onChange={e => setTitle(e.target.value)} />
        </div>

        <div>
          <label style={gsLabel} htmlFor="gp-date">{t('gather.plan_target_date')}</label>
          <input id="gp-date" type="date" style={gsInput} value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div>
          <label style={gsLabel} htmlFor="gp-note">{t('gather.plan_note')}</label>
          <input id="gp-note" style={gsInput} value={note} onChange={e => setNote(e.target.value)} placeholder={t('gather.plan_note_ph')} />
        </div>

        {err && <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-accent)' }}>{err}</p>}

        <div style={gsRow}>
          <button style={gsBtnPrimary} disabled={busy} onClick={submit}>{busy ? t('gather.saving') : t('gather.plan_create')}</button>
          <button style={gsBtnGhost} onClick={onClose}>{t('gather.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
