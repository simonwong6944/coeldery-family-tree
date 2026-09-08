/**
 * MyRecommend — 我的推薦：全屏抖音式商戶流
 * 路由：#/my-recommend
 * 規格：.coappery/merchant_platform.md 第三節
 *
 * v2.0：接駁 GET /api/merchants；全屏 scroll-snap 上下掃；
 *        頂部浮 bar（分類 + 地區篩選 + 視覺搜尋框）；
 *        右邊直排掣（讚 / 分享 / WhatsApp / 電話 / 地圖）；
 *        贊助角標（ad_tier >= 1）；長者友善（≥16px / ≥44px）。
 *
 * 重要：呢頁係用戶主動瀏覽，不作任何自動推送，不觸發忌辰相關邏輯。
 *       殯儀商戶照常顯示（spec §5.2：用戶主動搜尋則另計）。
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'

/* ── Tab 路由（與其他頁面保持一致）── */
const TAB_ROUTES: Record<TabId, string> = {
  family_tree:        '#/',
  family_circle:      '#/family-feed',
  family_gathering:   '#/family-gather',
  my_recommendations: '#/my-recommend',
}

/* ── API 回應型別（對應 functions/api/merchants.ts，含 migration 0008 媒體欄位）── */
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
  whatsapp:            string | null
  map_url:             string | null
  banner_url:          string | null
  video_url:           string | null
  poster_url:          string | null
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

/* ── 讚掣獨立 state（每張卡自己一個，純前端，不呼叫任何 API，refresh 會 reset）── */
interface LikeState {
  liked: boolean
  count: number
}

/* ════════════════════════════════════════════════════════════ */

export default function MyRecommend() {
  const { t } = useTranslation()
  const handleTabChange = (tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }

  /* ── 篩選狀態 ── */
  const [activeCat,    setActiveCat]    = useState<string | null>(null)
  const [activeRegion, setActiveRegion] = useState<string | null>(null)

  /* ── 資料狀態 ── */
  const [loadState,  setLoadState]  = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg,   setErrorMsg]   = useState('')
  const [merchants,  setMerchants]  = useState<MerchantItem[]>([])

  /* ── 讚掣狀態 Map（key = merchant.id）── */
  const [likeMap, setLikeMap] = useState<Record<string, LikeState>>({})

  /* ── toast 提示（分享 fallback 複製）── */
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

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
      /* 用 API 回傳的 merchants 扁平陣列（已按 ad_tier DESC, created_at ASC 排好）*/
      const flat = data.merchants ?? []
      setMerchants(flat)

      /* 初始化新商戶的 like state（count 從 0 開始，最誠實）*/
      setLikeMap(prev => {
        const next = { ...prev }
        flat.forEach(m => {
          if (!next[m.id]) next[m.id] = { liked: false, count: 0 }
        })
        return next
      })
      setLoadState('ok')
    } catch {
      setErrorMsg(t('merchant.load_failed'))
      setLoadState('error')
    }
  }, [activeCat, activeRegion, t])

  useEffect(() => { void loadMerchants() }, [loadMerchants])

  /* ── 讚掣 toggle（純前端，不呼叫任何 API）── */
  const handleLike = (id: string) => {
    setLikeMap(prev => {
      const cur = prev[id] ?? { liked: false, count: 0 }
      return {
        ...prev,
        [id]: {
          liked: !cur.liked,
          count: cur.liked ? Math.max(0, cur.count - 1) : cur.count + 1,
        },
      }
    })
  }

  /* ── 分享（navigator.share → clipboard fallback）── */
  const handleShare = async (m: MerchantItem) => {
    const text = m.address ? `${m.name}｜${m.address}` : m.name
    if (navigator.share) {
      try {
        await navigator.share({ title: m.name, text })
      } catch {
        /* 用戶取消視為正常，不顯示錯誤 */
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        showToast(t('merchant.share_copied'))
      } catch {
        showToast(t('merchant.share_copied'))
      }
    }
  }

  /* ── 頂部篩選 bar 樣式 ── */
  const chipStyle = (active: boolean): React.CSSProperties => ({
    display:         'inline-flex',
    alignItems:      'center',
    minHeight:       '44px',
    padding:         '0 18px',
    borderRadius:    '22px',
    border:          active
      ? '2px solid var(--color-primary)'
      : '1.5px solid rgba(255,255,255,0.45)',
    background:      active ? 'var(--color-primary)' : 'rgba(0,0,0,0.35)',
    color:           '#fff',
    fontSize:        '16px',
    fontFamily:      'inherit',
    fontWeight:      active ? 'bold' : 'normal',
    cursor:          'pointer',
    whiteSpace:      'nowrap' as const,
    transition:      'all 0.15s',
    flexShrink:      0,
    backdropFilter:  'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  })

  /* ── 右排圓形掣樣式 ── */
  const actionBtnStyle: React.CSSProperties = {
    display:         'flex',
    flexDirection:   'column',
    alignItems:      'center',
    gap:             '4px',
    minWidth:        '56px',
    minHeight:       '56px',
    justifyContent:  'center',
    cursor:          'pointer',
    background:      'none',
    border:          'none',
    padding:         '0',
    fontFamily:      'inherit',
  }

  const actionCircleStyle = (active?: boolean): React.CSSProperties => ({
    width:           '56px',
    height:          '56px',
    borderRadius:    '50%',
    background:      active ? 'rgba(220,38,38,0.85)' : 'rgba(0,0,0,0.45)',
    backdropFilter:  'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'center',
    fontSize:        '22px',
    transition:      'background 0.15s',
  })

  const actionLabelStyle: React.CSSProperties = {
    fontSize:   '12px',
    color:      '#fff',
    fontWeight: 'bold',
    textShadow: '0 1px 3px rgba(0,0,0,0.7)',
    textAlign:  'center',
    lineHeight: 1.2,
  }

  /* ── 單張商戶卡（全屏一張）── */
  const renderCard = (m: MerchantItem) => {
    const like = likeMap[m.id] ?? { liked: false, count: 0 }
    const bgUrl = m.banner_url ?? m.photo_url ?? null
    const isSponsored = m.ad_tier >= 1

    return (
      <article
        key={m.id}
        style={{
          position:        'relative',
          height:          '100svh',
          width:           '100%',
          scrollSnapAlign: 'start',
          overflow:        'hidden',
          flexShrink:      0,
          backgroundColor: 'var(--color-card)',
        }}
        aria-label={m.name}
      >
        {/* ── 背景圖 ── */}
        {bgUrl ? (
          <img
            src={bgUrl}
            alt={m.name}
            style={{
              position:   'absolute',
              inset:      0,
              width:      '100%',
              height:     '100%',
              objectFit:  'cover',
              objectPosition: 'center',
            }}
            loading="lazy"
          />
        ) : (
          /* 無圖時用漸層純色底 */
          <div
            style={{
              position:   'absolute',
              inset:      0,
              background: 'linear-gradient(160deg, var(--color-primary, #6366f1) 0%, var(--color-card, #1e1b4b) 100%)',
            }}
          />
        )}

        {/* ── 底部由深到淺漸變遮罩 ── */}
        <div
          style={{
            position:   'absolute',
            inset:      0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.08) 70%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── 贊助角標（ad_tier >= 1）── */}
        {isSponsored && (
          <span
            aria-label={t('merchant.sponsored_label')}
            style={{
              position:        'absolute',
              top:             '76px',
              right:           '16px',
              backgroundColor: 'rgba(80,80,80,0.75)',
              color:           '#e5e5e5',
              fontSize:        '13px',
              fontWeight:      'bold',
              padding:         '4px 10px',
              borderRadius:    '8px',
              letterSpacing:   '0.5px',
              backdropFilter:  'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            {t('merchant.sponsored_label')}
          </span>
        )}

        {/* ── 右邊直排掣 ── */}
        <div
          style={{
            position:       'absolute',
            right:          '14px',
            bottom:         '160px',
            display:        'flex',
            flexDirection:  'column',
            gap:            '18px',
            alignItems:     'center',
            zIndex:         10,
          }}
        >
          {/* 讚掣（純前端 state，不呼叫 API）*/}
          <button
            type="button"
            style={actionBtnStyle}
            aria-label={`${t('merchant.btn_like')} ${like.count}`}
            aria-pressed={like.liked}
            onClick={() => handleLike(m.id)}
          >
            <div style={actionCircleStyle(like.liked)}>
              {like.liked ? '❤️' : '🤍'}
            </div>
            <span style={actionLabelStyle}>
              {like.count > 0 ? String(like.count) : t('merchant.btn_like')}
            </span>
          </button>

          {/* 分享 */}
          <button
            type="button"
            style={actionBtnStyle}
            aria-label={t('merchant.btn_share')}
            onClick={() => void handleShare(m)}
          >
            <div style={actionCircleStyle()}>↗️</div>
            <span style={actionLabelStyle}>{t('merchant.btn_share')}</span>
          </button>

          {/* 聯絡商家（WhatsApp）— whatsapp 為 null 時隱藏 */}
          {m.whatsapp && (
            <button
              type="button"
              style={actionBtnStyle}
              aria-label={t('merchant.btn_whatsapp')}
              onClick={() => window.open(`https://wa.me/${m.whatsapp}`)}
            >
              <div style={actionCircleStyle()}>💬</div>
              <span style={actionLabelStyle}>{t('merchant.btn_whatsapp')}</span>
            </button>
          )}

          {/* 打電話 — phone 為 null 時隱藏 */}
          {m.phone && (
            <a
              href={`tel:${m.phone}`}
              style={{ ...actionBtnStyle, textDecoration: 'none' }}
              aria-label={`${t('merchant.btn_call')} ${m.phone}`}
            >
              <div style={actionCircleStyle()}>📞</div>
              <span style={actionLabelStyle}>{t('merchant.btn_call')}</span>
            </a>
          )}

          {/* 地圖 — map_url 為 null 時隱藏 */}
          {m.map_url && (
            <button
              type="button"
              style={actionBtnStyle}
              aria-label={t('merchant.btn_map')}
              onClick={() => window.open(m.map_url!)}
            >
              <div style={actionCircleStyle()}>📍</div>
              <span style={actionLabelStyle}>{t('merchant.btn_map')}</span>
            </button>
          )}
        </div>

        {/* ── 左下商戶資訊 ── */}
        <div
          style={{
            position:    'absolute',
            left:        '16px',
            right:       '84px',   /* 留空給右排掣 */
            bottom:      '100px',  /* 底 tab bar 上方留空 */
            zIndex:      10,
          }}
        >
          {/* 商戶名稱（+ 贊助角標緊跟，視覺輔助）*/}
          <h2
            style={{
              margin:     '0 0 6px',
              fontSize:   '22px',
              fontWeight: 'bold',
              color:      '#fff',
              lineHeight: 1.3,
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            }}
          >
            {m.name}
          </h2>

          {/* 分類 ・ 地區 */}
          {(m.category_name || m.district_name) && (
            <p
              style={{
                margin:     '0 0 8px',
                fontSize:   '16px',
                color:      'rgba(255,255,255,0.88)',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              }}
            >
              {[m.category_name, m.district_name].filter(Boolean).join(' ・ ')}
            </p>
          )}

          {/* 簡介（最多兩行，超出 ellipsis）*/}
          {m.description && (
            <p
              style={{
                margin:           '0 0 10px',
                fontSize:         '16px',
                color:            'rgba(255,255,255,0.82)',
                lineHeight:       1.5,
                textShadow:       '0 1px 3px rgba(0,0,0,0.5)',
                display:          '-webkit-box',
                WebkitLineClamp:  2,
                WebkitBoxOrient:  'vertical' as const,
                overflow:         'hidden',
              }}
            >
              {m.description}
            </p>
          )}

          {/* Tags 細膠囊（橫排）*/}
          {m.tags.length > 0 && (
            <div
              style={{
                display:    'flex',
                flexWrap:   'wrap',
                gap:        '6px',
                marginTop:  '2px',
              }}
            >
              {m.tags.map(tag => (
                <span
                  key={tag.id}
                  style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    height:          '28px',
                    padding:         '0 10px',
                    borderRadius:    '14px',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    border:          '1px solid rgba(255,255,255,0.35)',
                    fontSize:        '13px',
                    color:           '#fff',
                    backdropFilter:  'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 上掃提示（第一張才顯示）── */}
        {/* 由呼叫端按 index 控制，此處不加邏輯 */}
      </article>
    )
  }

  /* ── 空結果全屏提示 ── */
  const renderEmpty = () => (
    <div
      style={{
        height:          '100svh',
        width:           '100%',
        scrollSnapAlign: 'start',
        flexShrink:      0,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'var(--color-bg)',
        gap:             '16px',
        padding:         '0 32px',
      }}
    >
      <span style={{ fontSize: '48px' }}>🏪</span>
      <p
        style={{
          margin:    0,
          fontSize:  '18px',
          color:     'var(--color-text-secondary)',
          textAlign: 'center',
        }}
      >
        {t('merchant.empty')}
      </p>
      {(activeCat || activeRegion) && (
        <button
          type="button"
          onClick={() => { setActiveCat(null); setActiveRegion(null) }}
          style={{
            minHeight:    '44px',
            padding:      '0 24px',
            borderRadius: '22px',
            border:       '1.5px solid var(--color-divider)',
            background:   'var(--color-card)',
            color:        'var(--color-text)',
            fontSize:     '16px',
            fontFamily:   'inherit',
            cursor:       'pointer',
          }}
        >
          ✕ {t('merchant.filter_clear')}
        </button>
      )}
    </div>
  )

  /* ── 載入中全屏提示 ── */
  const renderLoading = () => (
    <div
      style={{
        height:          '100svh',
        width:           '100%',
        scrollSnapAlign: 'start',
        flexShrink:      0,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
        {t('merchant.loading')}
      </p>
    </div>
  )

  /* ── 錯誤全屏提示 ── */
  const renderError = () => (
    <div
      style={{
        height:          '100svh',
        width:           '100%',
        scrollSnapAlign: 'start',
        flexShrink:      0,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'var(--color-bg)',
        gap:             '16px',
        padding:         '0 32px',
      }}
    >
      <div
        role="alert"
        style={{
          padding:         '16px 20px',
          borderRadius:    '12px',
          backgroundColor: 'var(--color-card)',
          border:          '1.5px solid var(--color-danger, #dc2626)',
          color:           'var(--color-danger, #dc2626)',
          fontSize:        '16px',
          lineHeight:      1.6,
          textAlign:       'center',
        }}
      >
        {errorMsg}
      </div>
      <button
        type="button"
        onClick={() => void loadMerchants()}
        style={{
          minHeight:    '44px',
          padding:      '0 28px',
          borderRadius: '22px',
          border:       '1.5px solid var(--color-primary)',
          background:   'var(--color-primary)',
          color:        '#fff',
          fontSize:     '16px',
          fontFamily:   'inherit',
          cursor:       'pointer',
        }}
      >
        🔄 {t('merchant.load_failed')}
      </button>
    </div>
  )

  /* ── Main render ── */
  return (
    <div
      style={{
        position:   'relative',
        width:      '100%',
        height:     '100svh',
        overflow:   'hidden',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* ── TopBar（固定在上方）── */}
      <TopBar titleKey="merchant.page_title" />

      {/* ── 頂部浮篩選 bar（TopBar 下方，半透明）── */}
      <div
        style={{
          position:        'fixed',
          top:             '56px',   /* TopBar 高度 */
          left:            0,
          right:           0,
          zIndex:          20,
          background:      'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 100%)',
          padding:         '8px 12px 12px',
          backdropFilter:  'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      >
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '8px',
            overflowX:  'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {/* 視覺搜尋框（v1 唔接真搜尋，API 未有 ?q=）*/}
          <input
            type="search"
            placeholder={t('merchant.search_placeholder')}
            disabled
            style={{
              flexShrink:      0,
              width:           '120px',
              height:          '44px',
              borderRadius:    '22px',
              border:          '1.5px solid rgba(255,255,255,0.35)',
              background:      'rgba(0,0,0,0.35)',
              color:           'rgba(255,255,255,0.6)',
              fontSize:        '15px',
              padding:         '0 14px',
              outline:         'none',
              backdropFilter:  'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              cursor:          'not-allowed',
              fontFamily:      'inherit',
            }}
          />

          {/* 分類篩選（6 個，CATEGORY_FILTERS id 嚴格對應 seed）*/}
          {CATEGORY_FILTERS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveCat(prev => prev === opt.id ? null : opt.id)}
              style={chipStyle(activeCat === opt.id)}
              aria-pressed={activeCat === opt.id}
            >
              {t(opt.labelKey)}
            </button>
          ))}

          {/* 地區篩選（3 個，REGION_FILTERS id 嚴格對應 seed）*/}
          {REGION_FILTERS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveRegion(prev => prev === opt.id ? null : opt.id)}
              style={chipStyle(activeRegion === opt.id)}
              aria-pressed={activeRegion === opt.id}
            >
              {t(opt.labelKey)}
            </button>
          ))}

          {/* 清除篩選（有篩選時顯示）*/}
          {(activeCat || activeRegion) && (
            <button
              type="button"
              onClick={() => { setActiveCat(null); setActiveRegion(null) }}
              style={{
                ...chipStyle(false),
                border: '1.5px solid rgba(255,100,100,0.7)',
                color:  '#ffaaaa',
              }}
            >
              ✕ {t('merchant.filter_clear')}
            </button>
          )}
        </div>
      </div>

      {/* ── 全屏 scroll-snap 容器 ── */}
      <div
        style={{
          height:            '100svh',
          overflowY:         'scroll',
          scrollSnapType:    'y mandatory',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {loadState === 'loading' && renderLoading()}
        {loadState === 'error'   && renderError()}
        {loadState === 'ok' && merchants.length === 0 && renderEmpty()}
        {loadState === 'ok' && merchants.length > 0 && merchants.map(m => renderCard(m))}
      </div>

      {/* ── 底部 TabBar ── */}
      <BottomTabBar current="my_recommendations" onTabChange={handleTabChange} />

      {/* ── Toast 提示（分享 fallback）── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position:        'fixed',
            bottom:          '90px',
            left:            '50%',
            transform:       'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.75)',
            color:           '#fff',
            fontSize:        '16px',
            padding:         '10px 20px',
            borderRadius:    '24px',
            zIndex:          100,
            pointerEvents:   'none',
            whiteSpace:      'nowrap',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
