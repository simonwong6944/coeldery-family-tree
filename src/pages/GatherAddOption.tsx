/**
 * GatherAddOption — 加入聚會候選（日期／地點／蛋糕／禮物）
 * 規格：.coappery/family_gather.md §5；商戶一律來自 merchant 平台（is_listed）
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { OptionKind } from '../utils/gatherPlan'
import { addOption, listMerchants } from '../utils/gatherApi'
import {
  gsOverlay, gsSheet, gsInput, gsLabel, gsRow, gsBtnPrimary, gsBtnGhost, gsChip,
} from './gatherStyles'

interface Props {
  gatheringId: string
  kind: OptionKind
  members: { id: string; display_name: string }[]
  onClose: () => void
  onDone: () => void
}

interface Mc { id: string; name: string; category_id: string | null; address: string | null; tags?: { name: string }[] }

/* 各 kind 對應嘅商戶分類／關鍵字（family_gather.md §3.2）*/
const KIND_MATCH: Record<OptionKind, { cats: string[]; tags: string[] }> = {
  date:  { cats: [], tags: [] },
  place: { cats: ['cat-food'], tags: ['餐廳', '茶餐廳', '酒樓', '到會'] },
  cake:  { cats: ['cat-food', 'cat-gift'], tags: ['蛋糕', '糕點', '西餅'] },
  gift:  { cats: ['cat-gift'], tags: ['禮品', '鮮花', '花店', '禮盒'] },
}

export default function GatherAddOption({ gatheringId, kind, members, onClose, onDone }: Props) {
  const { t } = useTranslation()
  const [all, setAll] = useState<Mc[]>([])
  const [q, setQ] = useState('')
  const [merchantId, setMerchantId] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [pickup, setPickup] = useState('')
  const [assignee, setAssignee] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (kind === 'date') return
    listMerchants().then(list => setAll(list as unknown as Mc[])).catch(() => undefined)
  }, [kind])

  const matches = useMemo(() => {
    if (kind === 'date') return []
    const { cats, tags } = KIND_MATCH[kind]
    const kw = q.trim()
    return all.filter(m => {
      const tagOk = (m.tags ?? []).some(x => tags.some(k => x.name.includes(k)))
      const catOk = m.category_id !== null && cats.includes(m.category_id)
      if (!catOk && !tagOk) return false
      return kw === '' || m.name.includes(kw)
    })
  }, [all, kind, q])

  const needDate = kind === 'date' || kind === 'cake'
  const needPickup = kind === 'cake' || kind === 'gift'

  async function submit() {
    setErr('')
    const picked = all.find(m => m.id === merchantId)
    const finalLabel = picked ? picked.name : label.trim()
    if (!finalLabel) { setErr(t('gather.err_need_name')); return }
    setBusy(true)
    const r = await addOption({
      gathering_id: gatheringId, kind, label: finalLabel,
      merchant_id: picked ? picked.id : null,
      option_date: needDate && date ? date : null,
      option_time: needDate && time ? time : null,
      pickup_place: needPickup && pickup.trim() ? pickup.trim() : null,
      assignee_member_id: assignee || null,
    })
    setBusy(false)
    if (!r.ok) { setErr(r.error ?? t('gather.err_generic')); return }
    onDone()
  }

  return (
    <div style={gsOverlay} onClick={onClose}>
      <div style={gsSheet} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t(`gather.kind_${kind}`)}・{t('gather.add_option_title')}
        </h3>

        {kind !== 'date' && (
          <>
            <div>
              <label style={gsLabel} htmlFor="ga-q">{t('gather.search_merchant')}</label>
              <input id="ga-q" style={gsInput} value={q} onChange={e => setQ(e.target.value)} placeholder={t('gather.search_placeholder')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '34vh', overflowY: 'auto' }}>
              <button style={gsChip(merchantId === '')} onClick={() => setMerchantId('')}>{t('gather.custom_option')}</button>
              {matches.map(m => (
                <button key={m.id} style={gsChip(merchantId === m.id)} onClick={() => setMerchantId(m.id)}>
                  {m.name}{m.address ? ` ・${m.address}` : ''}
                </button>
              ))}
              {matches.length === 0 && (
                <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-secondary)' }}>{t('gather.no_merchant')}</p>
              )}
            </div>
            {merchantId === '' && (
              <div>
                <label style={gsLabel} htmlFor="ga-label">{t('gather.custom_name')}</label>
                <input id="ga-label" style={gsInput} value={label} onChange={e => setLabel(e.target.value)} placeholder={t('gather.custom_name_ph')} />
              </div>
            )}
          </>
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

        <div style={gsRow}>
          <button style={gsBtnPrimary} disabled={busy} onClick={submit}>{busy ? t('gather.saving') : t('gather.add_option_btn')}</button>
          <button style={gsBtnGhost} onClick={onClose}>{t('gather.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
