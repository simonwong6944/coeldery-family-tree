/**
 * GatherAddOption — 加入聚會候選（日期／地點／蛋糕／禮物）
 *
 * 流程（配合「有目的才見商戶」定位）：
 *   1. 地點／蛋糕／禮物 → 先開 MerchantPicker 揀商戶（可篩類型／地區／排序）或自行輸入
 *   2. 填寫細節（日期／時間／取貨地點／負責人）
 * 忌辰（solemn）＝零廣告：MerchantPicker 會先剔除付費商戶（rules §23）。
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MerchantPicker from '../components/MerchantPicker'
import { addOption } from '../utils/gatherApi'
import type { OptionKind } from '../utils/gatherPlan'
import type { QueryMerchant } from '../utils/merchantQuery'
import {
  gsOverlay, gsSheet, gsInput, gsLabel, gsRow, gsBtnPrimary, gsBtnGhost, gsMuted,
} from './gatherStyles'

interface Props {
  gatheringId: string
  kind: OptionKind
  members: { id: string; display_name: string }[]
  solemn?: boolean
  onClose: () => void
  onDone: () => void
}

export default function GatherAddOption({ gatheringId, kind, members, solemn = false, onClose, onDone }: Props) {
  const { t } = useTranslation()
  const needPick = kind !== 'date'

  const [picking, setPicking] = useState(needPick)
  const [merchant, setMerchant] = useState<QueryMerchant | null>(null)
  const [custom, setCustom] = useState(false)
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [pickup, setPickup] = useState('')
  const [assignee, setAssignee] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const needDate = kind === 'date' || kind === 'cake'
  const needPickup = kind === 'cake' || kind === 'gift'

  async function submit() {
    setErr('')
    const finalLabel = merchant ? merchant.name : label.trim()
    if (!finalLabel) { setErr(t('gather.err_need_name')); return }
    setBusy(true)
    const r = await addOption({
      gathering_id: gatheringId, kind, label: finalLabel,
      merchant_id: merchant ? merchant.id : null,
      option_date: needDate && date ? date : null,
      option_time: needDate && time ? time : null,
      pickup_place: needPickup && pickup.trim() ? pickup.trim() : null,
      assignee_member_id: assignee || null,
    })
    setBusy(false)
    if (!r.ok) { setErr(r.error ?? t('gather.err_generic')); return }
    onDone()
  }

  /* 需要商戶嗰刻才出商戶清單（唔會喺首頁列出）*/
  if (picking) {
    return (
      <MerchantPicker
        kind={kind === 'date' ? 'place' : kind}
        solemn={solemn}
        onClose={onClose}
        onPick={m => { setMerchant(m); setPicking(false) }}
      />
    )
  }

  return (
    <div style={gsOverlay} onClick={onClose}>
      <div style={gsSheet} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t(`gather.kind_${kind}`)}・{t('gather.add_option_title')}
        </h3>

        {needPick && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--color-text)' }}>
              {merchant ? merchant.name : t('gather.custom_option')}
            </span>
            <button style={gsBtnGhost} onClick={() => { setPicking(true); setCustom(false) }}>{t('gather.repick')}</button>
            {!merchant && <button style={gsBtnGhost} onClick={() => setCustom(true)}>{t('gather.custom_option')}</button>}
          </div>
        )}

        {needPick && !merchant && (custom || !needPick) && (
          <div>
            <label style={gsLabel} htmlFor="ga-label">{t('gather.custom_name')}</label>
            <input id="ga-label" style={gsInput} value={label} onChange={e => setLabel(e.target.value)} placeholder={t('gather.custom_name_ph')} />
          </div>
        )}

        {needDate && (
          <div>
            <label style={gsLabel} htmlFor="ga-d">{kind === 'cake' ? t('gather.pickup_date') : t('gather.candidate_date')}</label>
            <input id="ga-d" type="date" style={gsInput} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        )}

        {needDate && (
          <div>
            <label style={gsLabel} htmlFor="ga-t">{t('gather.time_label')}</label>
            <input id="ga-t" type="time" style={gsInput} value={time} onChange={e => setTime(e.target.value)} />
          </div>
        )}

        {needPickup && (
          <div>
            <label style={gsLabel} htmlFor="ga-p">{t('gather.pickup_place')}</label>
            <input id="ga-p" style={gsInput} value={pickup} onChange={e => setPickup(e.target.value)} placeholder={t('gather.pickup_place_ph')} />
          </div>
        )}

        <div>
          <label style={gsLabel} htmlFor="ga-as">{t('gather.assignee')}</label>
          <select id="ga-as" style={gsInput} value={assignee} onChange={e => setAssignee(e.target.value)}>
            <option value="">{t('gather.assignee_none')}</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </div>

        {err && <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-accent)' }}>{err}</p>}
        {solemn && <p style={{ ...gsMuted, margin: 0 }}>{t('gather.memorial_notice')}</p>}

        <div style={gsRow}>
          <button style={gsBtnPrimary} disabled={busy} onClick={submit}>{busy ? t('gather.saving') : t('gather.add_option_btn')}</button>
          <button style={gsBtnGhost} onClick={onClose}>{t('gather.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
