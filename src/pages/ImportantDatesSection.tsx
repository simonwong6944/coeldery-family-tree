/**
 * ImportantDatesSection — 成員「重要日子」section
 * 供 MemberDetail.tsx 使用，獨立管理自身 state。
 *
 * endpoint: /api/members/:memberId/important-dates
 *   GET    → 取全部日子
 *   POST   → 新增（body: { label, date, is_recurring }）
 *   DELETE → 刪除（body: { date_id }）
 *
 * 規格：
 *   - 長者友善：正文 ≥16px，熱區 ≥44px，掣必配文字
 *   - 全 i18n via t('member_detail.*')
 *   - 失敗靜默（catch → 空陣列 / 不阻塞頁面）
 *   - inline CSSProperties + var(--color-*) token
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

/* ─── 型別 ─── */
interface ImportantDate {
  id:           string
  member_id:    string
  label:        string
  date:         string        // YYYY-MM-DD
  is_recurring: number        // 1 = 每年，0 = 一次
  created_at:   string
}

/* ─── 工具：YYYY-MM-DD → M 月 D 日 ─── */
function formatMonthDay(dateStr: string): string {
  const parts = dateStr.split('-')
  const m = parseInt(parts[1] ?? '0', 10)
  const d = parseInt(parts[2] ?? '0', 10)
  if (!m || !d) return dateStr
  return `${m} 月 ${d} 日`
}

/* ─── Props ─── */
interface Props {
  memberId: string
}

/* ─── 樣式常數（與 MemberDetail 一致的 token 風格）─── */
const card: React.CSSProperties = {
  backgroundColor: 'var(--color-card)',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
}
const sectionTitle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: '16px',
  fontWeight: 'bold',
  color: 'var(--color-text)',
}
const inputBase: React.CSSProperties = {
  minHeight: '44px',
  padding: '0 12px',
  borderRadius: '8px',
  border: '1.5px solid var(--color-border)',
  fontSize: '16px',
  fontFamily: 'inherit',
  color: 'var(--color-text)',
  backgroundColor: 'var(--color-bg)',
  boxSizing: 'border-box',
}
const primaryBtn: React.CSSProperties = {
  minHeight: '44px',
  padding: '0 20px',
  borderRadius: '22px',
  fontSize: '15px',
  fontWeight: 'bold',
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: 'none',
  backgroundColor: 'var(--color-primary)',
  color: 'var(--color-card)',
  whiteSpace: 'nowrap',
}
const dangerSmallBtn: React.CSSProperties = {
  minHeight: '44px',
  padding: '0 14px',
  borderRadius: '22px',
  fontSize: '14px',
  fontFamily: 'inherit',
  cursor: 'pointer',
  border: '1.5px solid var(--color-danger, #dc2626)',
  backgroundColor: 'transparent',
  color: 'var(--color-danger, #dc2626)',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  whiteSpace: 'nowrap',
}

export default function ImportantDatesSection({ memberId }: Props) {
  const { t } = useTranslation()

  /* ── state ── */
  const [dates,      setDates]      = useState<ImportantDate[]>([])
  const [datesLoad,  setDatesLoad]  = useState<'loading' | 'ok' | 'error'>('loading')

  // 新增表單 state
  const [newLabel,       setNewLabel]       = useState('')
  const [newDate,        setNewDate]        = useState('')
  const [newRecurring,   setNewRecurring]   = useState(true)
  const [addBusy,        setAddBusy]        = useState(false)
  const [deleteBusy,     setDeleteBusy]     = useState<string | null>(null)  // date.id currently deleting

  /* ── 編輯現有重要日子（名稱／日期）── */
  async function handleEdit(d: ImportantDate) {
    const label = window.prompt(t('member_detail.important_date_edit_label'), d.label)
    if (label === null) return
    const date = window.prompt(t('member_detail.important_date_edit_date'), d.date)
    if (date === null) return
    await fetch(`/api/members/${memberId}/important-dates`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date_id: d.id, label: (label.trim() || d.label), date: (date.trim() || d.date) }),
    })
    fetchDates()
  }

  /* ── fetch 重要日子 ── */
  const fetchDates = useCallback(async () => {
    setDatesLoad('loading')
    try {
      const res  = await fetch(`/api/members/${memberId}/important-dates`)
      const data = await res.json() as { ok: boolean; dates?: ImportantDate[] }
      setDates(data.ok ? (data.dates ?? []) : [])
      setDatesLoad('ok')
    } catch {
      setDates([])
      setDatesLoad('error')
    }
  }, [memberId])

  useEffect(() => { fetchDates() }, [fetchDates])

  /* ── 新增 ── */
  async function handleAdd() {
    const labelTrim = newLabel.trim()
    if (!labelTrim || !newDate) return
    setAddBusy(true)
    try {
      const res  = await fetch(`/api/members/${memberId}/important-dates`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          label:        labelTrim,
          date:         newDate,
          is_recurring: newRecurring ? 1 : 0,
        }),
      })
      const data = await res.json() as { ok: boolean }
      if (data.ok) {
        setNewLabel(''); setNewDate(''); setNewRecurring(true)
        await fetchDates()
      }
    } catch { /* 靜默 */ }
    finally { setAddBusy(false) }
  }

  /* ── 刪除 ── */
  async function handleDelete(dateId: string) {
    setDeleteBusy(dateId)
    try {
      const res  = await fetch(`/api/members/${memberId}/important-dates`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date_id: dateId }),
      })
      const data = await res.json() as { ok: boolean }
      if (data.ok) await fetchDates()
    } catch { /* 靜默 */ }
    finally { setDeleteBusy(null) }
  }

  const addDisabled = addBusy || !newLabel.trim() || !newDate

  /* ── Render ── */
  return (
    <section style={card} aria-labelledby="imp-dates-title">
      <h3 id="imp-dates-title" style={sectionTitle}>
        {t('member_detail.important_dates_title')}
      </h3>

      {/* 載入中 */}
      {datesLoad === 'loading' && (
        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>
          {t('common.loading')}
        </p>
      )}

      {/* 列表 */}
      {datesLoad !== 'loading' && dates.length === 0 && (
        <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>
          {t('member_detail.important_dates_empty')}
        </p>
      )}

      {dates.map(d => (
        <div
          key={d.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 0',
            borderBottom: '1px solid var(--color-border)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ flex: 1, minWidth: '120px', fontSize: '16px', color: 'var(--color-text)', fontWeight: '500' }}>
            {d.label}
          </span>
          <span style={{ fontSize: '15px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            {formatMonthDay(d.date)}
          </span>
          <button
            style={{ ...primaryBtn, fontSize: '14px', minHeight: '44px' }}
            onClick={() => handleEdit(d)}
            aria-label={`${t('member_detail.important_date_edit')} ${d.label}`}
          >
            ✏ {t('member_detail.important_date_edit')}
          </button>
          <button
            style={{
              ...dangerSmallBtn,
              opacity: deleteBusy === d.id ? 0.6 : 1,
              cursor:  deleteBusy === d.id ? 'not-allowed' : 'pointer',
            }}
            disabled={deleteBusy === d.id}
            onClick={() => handleDelete(d.id)}
            aria-label={`${t('member_detail.important_date_delete')} ${d.label}`}
          >
            🗑 {t('member_detail.important_date_delete')}
          </button>
        </div>
      ))}

      {/* 新增表單 */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginTop: '14px',
        }}
      >
        {/* Label 輸入 */}
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder={t('member_detail.important_date_label_placeholder')}
          disabled={addBusy}
          style={{ ...inputBase, flex: '1 1 140px', minWidth: '140px' }}
        />

        {/* Date picker */}
        <input
          type="date"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
          disabled={addBusy}
          style={{ ...inputBase, flex: '0 0 auto' }}
        />

        {/* 每年提醒 checkbox */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '15px',
            color: 'var(--color-text)',
            cursor: 'pointer',
            minHeight: '44px',
            whiteSpace: 'nowrap',
          }}
        >
          <input
            type="checkbox"
            checked={newRecurring}
            onChange={e => setNewRecurring(e.target.checked)}
            disabled={addBusy}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          {t('member_detail.important_date_recurring')}
        </label>

        {/* 新增掣 */}
        <button
          onClick={handleAdd}
          disabled={addDisabled}
          style={{
            ...primaryBtn,
            opacity: addDisabled ? 0.5 : 1,
            cursor:  addDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          ＋ {t('member_detail.important_date_add')}
        </button>
      </div>
    </section>
  )
}
