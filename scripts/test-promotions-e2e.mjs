/* 節日推廣 端到端測試（node scripts/test-promotions-e2e.mjs）
 *
 * 前置（本機）：
 *   1) npx wrangler d1 migrations apply coeldery-family-tree-db --local
 *   2) npx wrangler d1 execute coeldery-family-tree-db --local --file scripts/seed-local-test.sql
 *   3) npx wrangler pages dev dist --d1=coeldery-family-tree-db --local --port 8787
 *   4) node scripts/test-promotions-e2e.mjs
 *
 * 環境變數：BASE（預設 http://127.0.0.1:8787）
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:8787'
const S1 = 'testsession1234'   // 900000001（本人）
const S2 = 'testsession5678'   // 900000002（第二位家人）

let pass = 0, fail = 0
function check(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}${cond ? '' : '  ' + extra}`)
  if (cond) { pass++ } else { fail++ }
}

async function api(path, { method = 'GET', body, session = S1, auth = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: `family_session=${session}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json = null
  try { json = await res.json() } catch { /* 可能無 body */ }
  return { status: res.status, body: json }
}

/* ── 0. 未登入 401 ── */
check('未登入 /api/festivals → 401', (await api('/api/festivals', { auth: false })).status === 401)
check('未登入 /api/promotions → 401', (await api('/api/promotions', { auth: false })).status === 401)
check('未登入 /api/promotion-claims → 401', (await api('/api/promotion-claims', { auth: false })).status === 401)

/* ── 1. 節日曆 ── */
const fest = await api('/api/festivals')
check('節日曆 200', fest.status === 200 && fest.body?.ok === true, JSON.stringify(fest.body).slice(0, 100))
const midAutumn = (fest.body?.festivals ?? []).find(f => f.id === 'mid-autumn-2026')
check('含中秋節（未過）', Boolean(midAutumn), JSON.stringify(fest.body?.festivals?.map(f => f.id)))
check('中秋節有 days_until 且 >= 0', typeof midAutumn?.days_until === 'number' && midAutumn.days_until >= 0, String(midAutumn?.days_until))

/* ── 2. 推廣清單（含准入與停用過濾）── */
const list = await api('/api/promotions')
const ids = (list.body?.promotions ?? []).map(p => p.id)
check('推廣清單 200', list.status === 200 && list.body?.ok === true)
check('列出名額不限推廣', ids.includes('promo-mid-autumn-cha'), JSON.stringify(ids))
check('列出限量推廣', ids.includes('promo-mid-autumn-quota1'))
check('唔列出已停用推廣', !ids.includes('promo-inactive'))
check('唔列出未上架商戶推廣（承准入）', !ids.includes('promo-unlisted'))
const p1 = (list.body?.promotions ?? []).find(p => p.id === 'promo-mid-autumn-cha')
check('帶商戶資料', p1?.merchant?.name === '觀塘大家姐茶餐廳', JSON.stringify(p1?.merchant))
check('名額不限 quota_left = null', p1?.quota_left === null)
check('節日資料齊', p1?.festival_name === '中秋節' && p1?.festival_date === '2026-09-25')
check('未領取 my_claimed = false', p1?.my_claimed === false)

const byFestival = await api('/api/promotions?festival_id=mid-autumn-2026')
check('按節日篩選有效', (byFestival.body?.promotions ?? []).length >= 2)
const byOtherFestival = await api('/api/promotions?festival_id=christmas-2026')
check('其他節日無推廣', (byOtherFestival.body?.promotions ?? []).length === 0)

/* ── 3. 領取（雙動作第一步）── */
const claim1 = await api('/api/promotion-claims', { method: 'POST', body: { promotion_id: 'promo-mid-autumn-cha' } })
check('領取 → 201', claim1.status === 201, `got ${claim1.status} ${JSON.stringify(claim1.body)}`)
check('回傳 WhatsApp 預填訊息', typeof claim1.body?.wa_text === 'string'
  && claim1.body.wa_text.includes('中秋家庭聚餐 9 折'), String(claim1.body?.wa_text).slice(0, 80))

const claim2 = await api('/api/promotion-claims', { method: 'POST', body: { promotion_id: 'promo-mid-autumn-cha' } })
check('同一人再領取 → 409（一人一次）', claim2.status === 409, `got ${claim2.status}`)

const listAfter = await api('/api/promotions')
const p1After = (listAfter.body?.promotions ?? []).find(p => p.id === 'promo-mid-autumn-cha')
check('清單標示我已領取', p1After?.my_claimed === true)
check('另一位家人未領取', (await api('/api/promotions', { session: S2 })).body?.promotions
  ?.find(p => p.id === 'promo-mid-autumn-cha')?.my_claimed === false)

/* ── 4. 名額控管（quota_total = 1）── */
const q1 = await api('/api/promotion-claims', { method: 'POST', body: { promotion_id: 'promo-mid-autumn-quota1' } })
check('家人 A 領取限量 → 201', q1.status === 201, `got ${q1.status} ${JSON.stringify(q1.body)}`)
const q2 = await api('/api/promotion-claims', { method: 'POST', body: { promotion_id: 'promo-mid-autumn-quota1' }, session: S2 })
check('家人 B 領取限量 → 409 名額已滿', q2.status === 409 && String(q2.body?.error).includes('名額'), `got ${q2.status} ${JSON.stringify(q2.body)}`)
const quotaPromo = (await api('/api/promotions')).body?.promotions?.find(p => p.id === 'promo-mid-autumn-quota1')
check('剩餘名額顯示 0', quotaPromo?.quota_left === 0, String(quotaPromo?.quota_left))

/* ── 5. 我領取嘅優惠 ── */
const mine = await api('/api/promotion-claims')
check('我嘅領取紀錄 200', mine.status === 200)
const mineIds = (mine.body?.claims ?? []).map(c => c.promotion_id)
check('含已領取推廣', mineIds.includes('promo-mid-autumn-cha') && mineIds.includes('promo-mid-autumn-quota1'), JSON.stringify(mineIds))
check('領取紀錄帶商戶聯絡', (mine.body?.claims ?? []).every(c => c.merchant_name), JSON.stringify(mine.body?.claims?.[0]))
check('另一位家人未領取任何（清單獨立）', (await api('/api/promotion-claims', { session: S2 })).body?.claims?.length === 0)

/* ── 6. 錯誤處理 ── */
check('領取不存在推廣 → 404', (await api('/api/promotion-claims', { method: 'POST', body: { promotion_id: 'nope' } })).status === 404)
check('冇 promotion_id → 400', (await api('/api/promotion-claims', { method: 'POST', body: {} })).status === 400)

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
