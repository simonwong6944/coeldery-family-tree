/**
 * FamilyGather — 家庭聚會（#/family-gather）
 * 依 .coappery/family_gather.md §1–4、§7：
 *   - 重用商戶平台（merchant 表 / is_listed / ad_tier / 贊助標示）
 *   - 場合過濾（生日／結婚週年／節日／忌辰）
 *   - 一鍵聯絡：致電 / WhatsApp / 導航（App 內不涉交易、不抽佣）
 *   - 忌辰硬攔截：先排除一切付費／贊助（ad_tier > 0），只列自然排序之鮮花／拜祭商戶
 * 顏色只用 CSS var；文字全 i18n。
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../../packages/top-bar'
import BottomTabBar from '../../packages/bottom-tab-bar'
import type { TabId } from '../../packages/bottom-tab-bar'

const TAB_ROUTES: Record<TabId, string> = {
  family_tree: '#/', family_circle: '#/family-feed',
  family_gathering: '#/family-gather', my_recommendations: '#/my-recommend',
}

interface Merchant {
  id: string; name: string; ad_tier: number
  phone: string | null; whatsapp: string | null; map_url: string | null
  photo_url: string | null; description: string | null; address: string | null
  category_id: string | null; category_name: string | null
}

type Scene = 'all' | 'birthday' | 'anniversary' | 'festival' | 'memorial'
const SCENES: Scene[] = ['all', 'birthday', 'anniversary', 'festival', 'memorial']
/* 場合 → 商戶主分類（family_gather.md §3.2；現有分類粒度所限，忌辰以「禮品與花藝」代表鮮花／拜祭）*/
const SCENE_CATS: Record<Scene, string[] | null> = {
  all:         null,
  birthday:    ['cat-food', 'cat-gift'],
  anniversary: ['cat-food', 'cat-gift'],
  festival:    ['cat-food', 'cat-gift'],
  memorial:    ['cat-gift'],
}

function sceneFromHash(): Scene {
  const m = /scene=([a-z]+)/.exec(window.location.hash)
  const s = (m?.[1] ?? 'all') as Scene
  return SCENES.includes(s) ? s : 'all'
}

const col = (v: string) => `var(${v})`
const page: React.CSSProperties = { minHeight:'100svh', backgroundColor:col('--color-bg'), display:'flex', flexDirection:'column' }
const main: React.CSSProperties = { flex:1, overflowY:'auto', paddingTop:'56px', paddingBottom:'96px' }
const card: React.CSSProperties = { backgroundColor:col('--color-card'), borderRadius:'16px', padding:'14px', margin:'0 16px 12px', boxShadow:col('--shadow-soft') }
const chip = (active: boolean): React.CSSProperties => ({ minHeight:'44px', padding:'0 18px', borderRadius:'22px', fontSize:'16px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:`2px solid ${col('--color-primary')}`, backgroundColor: active ? col('--color-primary') : col('--color-card'), color: active ? col('--color-card') : col('--color-primary') })
const actionBtn: React.CSSProperties = { minHeight:'44px', padding:'0 16px', borderRadius:'22px', fontSize:'15px', fontWeight:'bold', fontFamily:'inherit', cursor:'pointer', border:`2px solid ${col('--color-primary')}`, backgroundColor:col('--color-card'), color:col('--color-primary'), textDecoration:'none', display:'inline-flex', alignItems:'center' }
const centered: React.CSSProperties = { padding:'24px 16px', textAlign:'center', fontSize:'16px', color:col('--color-text-secondary') }

function waHref(w: string): string { return `https://wa.me/${w.replace(/\D/g, '')}` }

export default function FamilyGather() {
  const { t } = useTranslation()
  const [scene, setScene] = useState<Scene>(() => sceneFromHash())
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [all, setAll]     = useState<Merchant[]>([])

  useEffect(() => {
    fetch('/api/merchants')
      .then(r => r.ok ? r.json() : null)
      .then((d: { merchants?: Merchant[] } | null) => {
        if (d?.merchants) { setAll(d.merchants); setState('ok') } else setState('error')
      })
      .catch(() => setState('error'))
  }, [])

  const isMemorial = scene === 'memorial'
  const cats = SCENE_CATS[scene]
  /* 忌辰硬攔截：先排除一切付費／贊助（ad_tier > 0），再按場合分類過濾 */
  const list = (cats ? all.filter(m => m.category_id && cats.includes(m.category_id)) : all)
    .filter(m => (isMemorial ? m.ad_tier === 0 : true))

  return (
    <div style={page}>
      <TopBar titleKey="gather.page_title" onBack={() => { window.location.hash = '#/' }} />
      <main style={main}>
        <p style={{ margin:'16px 16px 12px', fontSize:'16px', color:col('--color-text-secondary') }}>{t('gather.intro')}</p>

        {/* 場合 chips */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', padding:'0 16px 12px' }}>
          {SCENES.map(s => (
            <button key={s} style={chip(scene === s)} onClick={() => setScene(s)}>{t(`gather.scene_${s}`)}</button>
          ))}
        </div>

        {isMemorial && (
          <p style={{ ...card, fontSize:'15px', color:col('--color-text'), lineHeight:1.6 }}>{t('gather.memorial_notice')}</p>
        )}

        {state === 'loading' && <p style={centered}>{t('common.loading')}</p>}
        {state === 'error'   && <p style={{ ...centered, color:col('--color-accent') }}>{t('gather.load_failed')}</p>}
        {state === 'ok' && list.length === 0 && <p style={centered}>{t('gather.empty')}</p>}

        {state === 'ok' && list.map(m => (
          <article key={m.id} style={card}>
            <div style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
              {m.photo_url && (
                <img src={m.photo_url} alt="" style={{ width:'72px', height:'72px', borderRadius:'12px', objectFit:'cover', backgroundColor:col('--color-divider'), flexShrink:0 }} />
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <h3 style={{ margin:'0 0 4px', fontSize:'18px', fontWeight:'bold', color:col('--color-text') }}>{m.name}</h3>
                {m.category_name && <span style={{ fontSize:'14px', color:col('--color-text-secondary') }}>{m.category_name}</span>}
                {m.address && <p style={{ margin:'4px 0 0', fontSize:'14px', color:col('--color-text-secondary') }}>{m.address}</p>}
                {/* 贊助標示（忌辰模式不會出現，因已過濾 ad_tier > 0）*/}
                {!isMemorial && m.ad_tier > 0 && (
                  <span style={{ display:'inline-block', marginTop:'6px', fontSize:'12px', fontWeight:'bold', color:col('--color-accent'), border:`1px solid ${col('--color-accent')}`, borderRadius:'10px', padding:'1px 8px' }}>
                    {t('gather.section_sponsored')}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'12px' }}>
              {m.phone && <a style={actionBtn} href={`tel:${m.phone}`}>📞 {t('gather.call')}</a>}
              {m.whatsapp && <a style={actionBtn} href={waHref(m.whatsapp)} target="_blank" rel="noreferrer">💬 {t('gather.whatsapp')}</a>}
              {m.map_url && <a style={actionBtn} href={m.map_url} target="_blank" rel="noreferrer">📍 {t('gather.map')}</a>}
            </div>
          </article>
        ))}
      </main>
      <BottomTabBar current="family_gathering" onTabChange={(tab: TabId) => { window.location.hash = TAB_ROUTES[tab] }} />
    </div>
  )
}

