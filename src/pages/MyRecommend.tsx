/**
 * MyRecommend — 我的推薦：本地商戶列表
 * 路由：#/my-recommend
 * 規格：.coappery/merchant_platform.md 第三節（三段式佈局 + 贊助標示）
 *
 * v1.0：接駁 GET /api/merchants；三段式（sponsored / promoted / natural）；
 *        分類 × 地區雙篩選（寫死 seed id）；贊助標籤；長者友善（≥16px / ≥44px）。
 *
 * 重要：呢頁係用戶主動瀏覽，不作任何自動推送，不觸發忌辰相關邏輯。
 *       殯儀商戶照常顯示（spec §5.2：用戶主動搜尋則另計）。
 */

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'

/* ── Tab 路由（與其他頁面保持一致）── */
const TAB_ROUTES: Record<TabId, string> = {
  family_tree:      '#/',
  family_circle:    '#/family-feed',
  family_gathering: '#/family-gather',
  my_recommendations: '#/my-recommend',
}

/* ── API 回應型別（對應 functions/api/merchants.ts）── */
interface MerchantTag {
  id:   string
  name: string
}

interface MerchantItem {
  id:                  string
  name:                string
  ad_tier:             number
  is_listed:           number
  phone:               string | null
  address:             string | null
  description:         string | null
  photo_url:           string | null
  landmark_id:         string | null
  landmark_name:       string | null
  district_name:       string | null
  district_group_name: string | null
  category_id:         string | null
  category_name:       string | null
  tags:                MerchantTag[]
}

interface MerchantsResponse {
  ok:        boolean
  merchants: MerchantItem[]
  sponsored: MerchantItem[]
  promoted:  MerchantItem[]
  natural:   MerchantItem[]
  error?:    string
}

/* ── 篩選掣配置（id 嚴格對應 migrations/0007 seed，禁止自行修改）── */
interface FilterOption { id: string; labelKey: string }

const CATEGORY_FILTERS: FilterOption[] = [
  { id: 'cat-food',    labelKey: 'merchant.cat_food'    },
  { id: 'cat-health',  labelKey: 'merchant.cat_health'  },
  { id: 'cat-home',    labelKey: 'merchant.cat_home'    },
  { id: 'cat-gift',    labelKey: 'merchant.cat_gift'    },
  { id: 'cat-funeral', labelKey: 'merchant.cat_funeral' },
  { id: 'cat-elderly', labelKey: 'merchant.cat_elderly' },
]

const REGION_FILTERS: FilterOption[] = [
  { id: 'dg-hk-island', labelKey: 'merchant.region_hk_island' },
  { id: 'dg-kowloon',   labelKey: 'merchant.region_kowloon'   },
  { id: 'dg-nt',        labelKey: 'merchant.region_nt'        },
]

/* ════════════════════════════════════════════════════════════ */

export default function MyRecommend() {
  const { t } = useTranslation()
  const handleTabChange = (tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }

  /* ── 篩選狀態 ── */
  const [activeCat,    setActiveCat]    = useState<string | null>(null)
  const [activeRegion, setActiveRegion] = useState<string | null>(null)

  /* ── 資料狀態 ── */
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [sponsored, setSponsored] = useState<MerchantItem[]>([])
  const [promoted,  setPromoted]  = useState<MerchantItem[]>([])
  const [natural,   setNatural]   = useState<MerchantItem[]>([])

  /* ── Fetch 商戶（篩選變更時重新 fetch）── */
  const loadMerchants = useCallback(async () => {
    setLoadState('loading')
    setErrorMsg('')

    const qs = new URLSearchParams()
    if (activeCat)    qs.set('category_id',      activeCat)
    if (activeRegion) qs.set('district_group_id', activeRegion)

    const url = `/api/merchants${qs.toString() ? `?${qs}` : ''}`

    try {
      const res  = await fetch(url)
      const data = await res.json() as MerchantsResponse
      if (!data.ok) {
        setErrorMsg(data.error ?? t('merchant.load_failed'))
        setLoadState('error')
        return
      }
      setSponsored(data.sponsored ?? [])
      setPromoted(data.promoted   ?? [])
      setNatural(data.natural     ?? [])
      setLoadState('ok')
    } catch {
      setErrorMsg(t('merchant.load_failed'))
      setLoadState('error')
    }
  }, [activeCat, activeRegion, t])

  useEffect(() => { void loadMerchants() }, [loadMerchants])

  /* ── 篩選掣通用樣式 ── */
  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    minHeight:       '44px',
    padding:         '0 18px',
    borderRadius:    '22px',
    border:          active
      ? '2px solid var(--color-primary)'
      : '1.5px solid var(--color-divider)',
    background:      active ? 'var(--color-primary)' : 'var(--color-card)',
    color:           active ? '#fff' : 'var(--color-text)',
    fontSize:        '16px',
    fontFamily:      'inherit',
    fontWeight:      active ? 'bold' : 'normal',
    cursor:          'pointer',
    whiteSpace:      'nowrap' as const,
    transition:      'all 0.15s',
    flexShrink:      0,
  })

  /* ── 商戶卡（大卡：有相 / 有標示）── */
  const renderFeaturedCard = (m: MerchantItem, showTag: boolean) => (
    <div
      key={m.id}
      style={{
        position:        'relative',
        backgroundColor: 'var(--color-card)',
        borderRadius:    '16px',
        overflow:        'hidden',
        boxShadow:       '0 2px 8px rgba(0,0,0,0.08)',
        marginBottom:    '12px',
      }}
    >
      {/* 商戶圖片（有 photo_url 才顯示）*/}
      {m.photo_url && (
        <img
          src={m.photo_url}
          alt={m.name}
          style={{
            width:      '100%',
            height:     '180px',
            objectFit:  'cover',
            display:    'block',
          }}
        />
      )}

      {/* 贊助標籤（右上角細灰標）*/}
      {showTag && (
        <span
          aria-label={t('merchant.sponsored_tag')}
          style={{
            position:        'absolute',
            top:             '10px',
            right:           '10px',
            backgroundColor: 'rgba(0,0,0,0.45)',
            color:           '#fff',
            fontSize:        '13px',
            fontWeight:      'bold',
            padding:         '3px 9px',
            borderRadius:    '8px',
            letterSpacing:   '0.5px',
          }}
        >
          {t('merchant.sponsored_tag')}
        </span>
      )}

      {/* 卡片內容 */}
      <div style={{ padding: '16px' }}>
        {renderCardContent(m)}
      </div>
    </div>
  )

  /* ── 商戶卡（文字卡：自然排位，無圖無標籤）── */
  const renderNaturalCard = (m: MerchantItem) => (
    <div
      key={m.id}
      style={{
        backgroundColor: 'var(--color-card)',
        borderRadius:    '12px',
        padding:         '16px',
        marginBottom:    '10px',
        boxShadow:       '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {renderCardContent(m)}
    </div>
  )

  /* ── 卡片共用內容（名稱 / 分類地區 / 電話 / 地址 / 簡介 / 標籤）── */
  const renderCardContent = (m: MerchantItem) => (
    <>
      {/* 商戶名稱 */}
      <h3
        style={{
          margin:     '0 0 6px',
          fontSize:   '20px',
          fontWeight: 'bold',
          color:      'var(--color-text)',
          lineHeight: 1.3,
        }}
      >
        {m.name}
      </h3>

      {/* 分類 + 地區 */}
      {(m.category_name || m.district_name) && (
        <p
          style={{
            margin:   '0 0 8px',
            fontSize: '15px',
            color:    'var(--color-text-secondary)',
          }}
        >
          {[m.category_name, m.district_name].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* 電話（tel: link，字體 ≥16px，熱區 ≥44px）*/}
      {m.phone && (
        <a
          href={`tel:${m.phone}`}
          style={{
            display:        'inline-flex',
            alignItems:     'center',
            gap:            '6px',
            minHeight:      '44px',
            fontSize:       '18px',
            fontWeight:     'bold',
            color:          'var(--color-primary)',
            textDecoration: 'none',
            marginBottom:   '6px',
          }}
          aria-label={`${t('merchant.call')} ${m.name} ${m.phone}`}
        >
          📞 {m.phone}
        </a>
      )}

      {/* 地址 */}
      {m.address && (
        <p
          style={{
            margin:     '0 0 8px',
            fontSize:   '16px',
            color:      'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          📍 {m.address}
        </p>
      )}

      {/* 簡介 */}
      {m.description && (
        <p
          style={{
            margin:     '0 0 10px',
            fontSize:   '16px',
            color:      'var(--color-text)',
            lineHeight: 1.6,
          }}
        >
          {m.description}
        </p>
      )}

      {/* 標籤 chips */}
      {m.tags.length > 0 && (
        <div
          style={{
            display:   'flex',
            flexWrap:  'wrap',
            gap:       '6px',
            marginTop: '4px',
          }}
        >
          {m.tags.map(tag => (
            <span
              key={tag.id}
              style={{
                display:         'inline-flex',
                alignItems:      'center',
                height:          '28px',
                padding:         '0 12px',
                borderRadius:    '14px',
                backgroundColor: 'var(--color-bg)',
                border:          '1px solid var(--color-divider)',
                fontSize:        '14px',
                color:           'var(--color-text-secondary)',
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </>
  )

  /* ── 區段標題 ── */
  const renderSectionTitle = (labelKey: string, emoji: string) => (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
        marginBottom: '12px',
        marginTop:    '8px',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '22px' }}>{emoji}</span>
      <h2
        style={{
          margin:     0,
          fontSize:   '18px',
          fontWeight: 'bold',
          color:      'var(--color-text)',
        }}
      >
        {t(labelKey)}
      </h2>
    </div>
  )

  /* ── 主體渲染 ── */
  const renderBody = () => {
    if (loadState === 'loading') {
      return (
        <p
          style={{
            textAlign: 'center',
            color:     'var(--color-text-secondary)',
            fontSize:  '18px',
            padding:   '60px 0',
          }}
        >
          {t('merchant.loading')}
        </p>
      )
    }

    if (loadState === 'error') {
      return (
        <div
          role="alert"
          style={{
            margin:          '24px 0',
            padding:         '16px',
            borderRadius:    '12px',
            backgroundColor: 'var(--color-card)',
            border:          '1.5px solid var(--color-danger, #dc2626)',
            color:           'var(--color-danger, #dc2626)',
            fontSize:        '16px',
            lineHeight:      1.6,
          }}
        >
          {errorMsg}
        </div>
      )
    }

    const totalCount = sponsored.length + promoted.length + natural.length
    if (totalCount === 0) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding:   '60px 0',
            color:     'var(--color-text-secondary)',
          }}
        >
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🏪</p>
          <p
            style={{
              margin:     0,
              fontSize:   '18px',
              color:      'var(--color-text-secondary)',
            }}
          >
            {t('merchant.empty')}
          </p>
        </div>
      )
    }

    return (
      <>
        {/* ── 頂部「贊助」區（tier 2）── */}
        {sponsored.length > 0 && (
          <section aria-label={t('merchant.sponsored_section')}>
            {renderSectionTitle('merchant.sponsored_section', '⭐')}
            {sponsored.map(m => renderFeaturedCard(m, true))}
          </section>
        )}

        {/* ── 中間「推廣」區（tier 1）── */}
        {promoted.length > 0 && (
          <section aria-label={t('merchant.promoted_section')}>
            {renderSectionTitle('merchant.promoted_section', '📌')}
            {promoted.map(m => renderFeaturedCard(m, true))}
          </section>
        )}

        {/* ── 下方「一般商戶」區（tier 0）── */}
        {natural.length > 0 && (
          <section aria-label={t('merchant.natural_section')}>
            {renderSectionTitle('merchant.natural_section', '🏪')}
            {natural.map(m => renderNaturalCard(m))}
          </section>
        )}
      </>
    )
  }

  /* ── Main render ── */
  return (
    <div
      style={{
        display:         'flex',
        flexDirection:   'column',
        minHeight:       '100svh',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <TopBar titleKey="merchant.page_title" />

      <main
        role="main"
        style={{
          flex:       1,
          overflowY:  'auto',
          padding:    '72px 16px 100px',   /* 72px = TopBar 56px + 16px gap */
        }}
      >
        {/* ── 篩選區 ── */}
        <div
          style={{
            marginBottom: '20px',
          }}
        >
          {/* 分類篩選 */}
          <p
            style={{
              margin:     '0 0 8px',
              fontSize:   '16px',
              fontWeight: 'bold',
              color:      'var(--color-text)',
            }}
          >
            {t('merchant.filter_category')}
          </p>
          <div
            style={{
              display:    'flex',
              gap:        '8px',
              overflowX:  'auto',
              paddingBottom: '4px',
              /* 長者友善：捲動軸不佔位 */
              scrollbarWidth: 'thin',
            }}
          >
            {CATEGORY_FILTERS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveCat(prev => prev === opt.id ? null : opt.id)}
                style={filterBtnStyle(activeCat === opt.id)}
                aria-pressed={activeCat === opt.id}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {/* 地區篩選 */}
          <p
            style={{
              margin:     '14px 0 8px',
              fontSize:   '16px',
              fontWeight: 'bold',
              color:      'var(--color-text)',
            }}
          >
            {t('merchant.filter_region')}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {REGION_FILTERS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveRegion(prev => prev === opt.id ? null : opt.id)}
                style={filterBtnStyle(activeRegion === opt.id)}
                aria-pressed={activeRegion === opt.id}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {/* 已篩選時顯示「清除篩選」 */}
          {(activeCat || activeRegion) && (
            <button
              type="button"
              onClick={() => { setActiveCat(null); setActiveRegion(null) }}
              style={{
                display:    'block',
                marginTop:  '10px',
                minHeight:  '44px',
                padding:    '0 20px',
                borderRadius: '10px',
                border:     '1.5px solid var(--color-divider)',
                background: 'var(--color-card)',
                color:      'var(--color-text-secondary)',
                fontSize:   '16px',
                fontFamily: 'inherit',
                cursor:     'pointer',
              }}
            >
              ✕ {t('merchant.filter_clear')}
            </button>
          )}
        </div>

        {/* ── 商戶列表本體 ── */}
        {renderBody()}
      </main>

      <BottomTabBar current="my_recommendations" onTabChange={handleTabChange} />
    </div>
  )
}
