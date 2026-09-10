/**
 * MerchantPicker — 「揀商戶」揀選器（只在需要服務嗰刻出現）
 *
 * 定位（product_decisions v1.8/v1.9）：商戶唔會喺家庭聚會首頁列出；
 * 只喺「訂餐廳／蛋糕／禮物／送花」嗰刻以**可篩選清單**出現（類型／地區／搜尋／排序）。
 * 忌辰（solemn）＝零廣告：先剔除一切付費／贊助（rules §23）。
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CouponSticker from './CouponSticker'
import { listMerchantMeta, listMerchants, type MerchantMeta } from '../utils/gatherApi'
import { claimPromotion, listPromotions } from '../utils/promotionApi'
import { claimState, defaultClaimText, promoForMerchant, sortPromotions, type Promotion } from '../utils/promotions'
import {
  applyMerchantQuery, defaultCategoryFor,
  type MerchantKind, type MerchantSort, type QueryMerchant,
} from '../utils/merchantQuery'
import { gsOverlay, gsSheet, gsInput, gsLabel, gsMuted, gsRow, gsBtnGhost, gsChip, gsBadge } from '../pages/gatherStyles'

interface Props {
  kind: MerchantKind
  /** 節日聚會 → 顯示該節日嘅商戶推廣（忌辰永遠唔會傳此值）*/
  festivalId?: string
  solemn?: boolean
  onPick: (m: QueryMerchant) => void
  onClose: () => void
}

const SORTS: MerchantSort[] = ['recommended', 'district', 'name']

export default function MerchantPicker({ kind, festivalId, solemn = false, onPick, onClose }: Props) {
  const { t } = useTranslation()
  const [all, setAll] = useState<QueryMerchant[]>([])
  const [meta, setMeta] = useState<MerchantMeta>({ categories: [], regions: [], tags: [] })
  const [promos, setPromos] = useState<Promotion[]>([])
  const [q, setQ] = useState('')
  const [region, setRegion] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryFor(kind))
  const [tagName, setTagName] = useState<string | null>(null)
  const [sort, setSort] = useState<MerchantSort>('recommended')

  useEffect(() => {
    listMerchants().then(setAll).catch(() => undefined)
    listMerchantMeta().then(setMeta).catch(() => undefined)
  }, [])

  /* 節日推廣：只在節日聚會、且非莊重場合載入 */
  useEffect(() => {
    if (!festivalId || solemn) return
    listPromotions({ festivalId })
      .then(list => setPromos(sortPromotions(list)))
      .catch(() => undefined)
  }, [festivalId, solemn])

  const districts = useMemo(() => {
    if (!region) return meta.regions.flatMap(r => r.districts)
    return meta.regions.find(r => r.name === region)?.districts ?? []
  }, [meta, region])

  const tags = useMemo(() => {
    const list = categoryId ? meta.tags.filter(x => x.category_id === categoryId) : meta.tags
    return list.slice(0, 12)
  }, [meta, categoryId])

  const results = useMemo(
    () => applyMerchantQuery(all, { kind, q, region, district, categoryId, tagName, sort, solemn }),
    [all, kind, q, region, district, categoryId, tagName, sort, solemn],
  )

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button key={label} style={gsChip(active)} onClick={onClick}>{label}</button>
  )

  return (
    <div style={gsOverlay} onClick={onClose}>
      <div style={gsSheet} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text)' }}>
          {t('gather.pick_merchant_title', { kind: t(`gather.kind_${kind}`) })}
        </h3>
        {solemn && <p style={{ ...gsMuted, margin: 0 }}>{t('gather.memorial_notice')}</p>}

        <div>
          <label style={gsLabel} htmlFor="mp-q">{t('gather.search_merchant')}</label>
          <input id="mp-q" style={gsInput} value={q} onChange={e => setQ(e.target.value)} placeholder={t('gather.search_placeholder')} />
        </div>

        {/* 類型（主分類）*/}
        <div style={{ ...gsRow, marginTop: 0 }}>
          {chip(categoryId === null, t('gather.filter_all_type'), () => { setCategoryId(null); setTagName(null) })}
          {meta.categories.map(c => chip(categoryId === c.id, c.name, () => { setCategoryId(c.id); setTagName(null) }))}
        </div>

        {/* 地區（區 → 地區）*/}
        <div style={{ ...gsRow, marginTop: 0 }}>
          {chip(region === null, t('gather.filter_all_region'), () => { setRegion(null); setDistrict(null) })}
          {meta.regions.map(r => chip(region === r.name, r.name, () => { setRegion(r.name); setDistrict(null) }))}
        </div>
        {districts.length > 1 && (
          <div style={{ ...gsRow, marginTop: 0 }}>
            {chip(district === null, t('gather.filter_all_district'), () => setDistrict(null))}
            {districts.map(d => chip(district === d.name, d.name, () => setDistrict(d.name)))}
          </div>
        )}

        {/* 標籤（子篩選）*/}
        {tags.length > 0 && (
          <div style={{ ...gsRow, marginTop: 0 }}>
            {chip(tagName === null, t('gather.filter_all_tag'), () => setTagName(null))}
            {tags.map(x => chip(tagName === x.name, x.name, () => setTagName(x.name)))}
          </div>
        )}

        {/* 排序 */}
        <div>
          <label style={gsLabel} htmlFor="mp-sort">{t('gather.sort_label')}</label>
          <select id="mp-sort" style={gsInput} value={sort} onChange={e => setSort(e.target.value as MerchantSort)}>
            {SORTS.map(s => <option key={s} value={s}>{t(`gather.sort_${s}`)}</option>)}
          </select>
        </div>

        {/* 結果 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '34vh', overflowY: 'auto' }}>
          {results.length === 0 && <p style={{ ...gsMuted, margin: 0 }}>{t('gather.no_merchant')}</p>}
          {results.map(m => {
            const promo = promoForMerchant(promos, m.id)
            return (
              <div
                key={m.id}
                style={{
                  border: '2px solid var(--color-divider)', borderRadius: '12px', padding: '10px 12px',
                  backgroundColor: 'var(--color-card)',
                }}
              >
                <button
                  onClick={() => onPick(m)}
                  style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--color-text)' }}>{m.name}</span>
                    {/* 贊助標示：忌辰模式不會出現（已過濾 ad_tier > 0）*/}
                    {!solemn && m.ad_tier > 0 && <span style={gsBadge('off')}>{t('gather.sponsored')}</span>}
                  </div>
                  <div style={{ ...gsMuted, marginTop: '2px' }}>
                    {[m.category_name, m.district_name, m.landmark_name].filter(Boolean).join(' ・')}
                  </div>
                  {m.address && <div style={{ ...gsMuted, marginTop: '2px' }}>{m.address}</div>}
                </button>
                {/* 節日推廣（忌辰唔會有）*/}
                {promo && (
                  <CouponSticker
                    coupon={{
                      id: promo.id, title: promo.title, description: promo.description,
                      quota_left: promo.quota_left, my_claimed: promo.my_claimed,
                      festival_name: promo.festival_name, festival_date: promo.festival_date,
                      merchant: promo.merchant,
                    }}
                    state={claimState(promo)}
                    defaultText={defaultClaimText(promo)}
                    claim={() => claimPromotion(promo.id)}
                  />
                )}
              </div>
            )
          })}
        </div>

        <div style={gsRow}>
          <button style={gsBtnGhost} onClick={onClose}>{t('gather.cancel')}</button>
        </div>
      </div>
    </div>
  )
}
