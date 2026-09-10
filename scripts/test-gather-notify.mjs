/* 測試：聚會通知純邏輯（node scripts/test-gather-notify.mjs）
 * 需先編譯：npx tsc src/utils/gatherNotify.ts src/utils/gatherPlan.ts --outDir .tmp-promo --module esnext --target es2022 --moduleResolution bundler --ignoreConfig
 */
import {
  gatheringDate, daysToGathering, upcomingGatherings, buildShareText, whatsappShareHref,
} from '../.tmp-promo/gatherNotify.js'

let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  if (!ok) { console.log(`       want: ${JSON.stringify(want)}`); console.log(`       got : ${JSON.stringify(got)}`) }
  if (ok) { pass++ } else { fail++ }
}

const TODAY = Date.UTC(2026, 8, 10)   // 2026-09-10

/* ── 日期 ── */
check('已確認日期優先', gatheringDate({ plan_date: '2026-10-01', target_date: '2026-09-25' }), '2026-10-01')
check('無已確認日期 → 用目標日期', gatheringDate({ plan_date: null, target_date: '2026-09-25' }), '2026-09-25')
check('兩者皆無 → null', gatheringDate({ plan_date: null, target_date: null }), null)
check('daysToGathering 今日 = 0', daysToGathering('2026-09-10', TODAY), 0)
check('daysToGathering 21 日後', daysToGathering('2026-10-01', TODAY), 21)
check('daysToGathering 已過 = 負', (daysToGathering('2026-09-01', TODAY) ?? 0) < 0, true)
check('daysToGathering 無日期 = null', daysToGathering(null, TODAY), null)

/* ── 即將舉行：過濾過去 + 排序 ── */
const list = [
  { id: 'past',  target_date: '2026-09-01', plan_date: null },
  { id: 'far',   target_date: null, plan_date: '2026-12-25' },
  { id: 'soon',  target_date: null, plan_date: '2026-09-25' },
  { id: 'nodate', target_date: null, plan_date: null },
]
check('過濾過去／無日期，並按日排序', upcomingGatherings(list, TODAY).map(g => g.id), ['soon', 'far'])
check('帶出倒數日數', upcomingGatherings(list, TODAY)[0]._days, 15)

/* ── 通知文字 ── */
const options = [
  { id: 'd1', kind: 'date',  label: '2026-10-01', status: 'confirmed', option_date: '2026-10-01', option_time: '18:30', pickup_place: null, merchant: null },
  { id: 'p1', kind: 'place', label: '金鳳酒樓', status: 'confirmed', option_date: null, option_time: null, pickup_place: null, merchant: { id: 'm', name: '金鳳酒樓', address: '銅鑼灣 100 號' } },
  { id: 'c1', kind: 'cake',  label: '甜美餅店', status: 'confirmed', option_date: '2026-10-01', option_time: '16:00', pickup_place: '旺角店', merchant: null },
  { id: 'g1', kind: 'gift',  label: '滿堂禮品', status: 'confirmed', option_date: null, option_time: null, pickup_place: null, merchant: null },
  { id: 'x1', kind: 'place', label: '落選酒樓', status: 'dropped', option_date: null, option_time: null, pickup_place: null, merchant: null },
]
const text = buildShareText({ title: '爸爸生日聚會', note: '記得帶相機', options, url: 'https://x/#/gather/1' })
check('含標題', text.includes('爸爸生日聚會'), true)
check('含日期時間', text.includes('2026-10-01 18:30'), true)
check('含地點同地址', text.includes('金鳳酒樓') && text.includes('銅鑼灣 100 號'), true)
check('含蛋糕取貨', text.includes('取貨：') && text.includes('旺角店'), true)
check('含禮物', text.includes('滿堂禮品'), true)
check('含備註', text.includes('記得帶相機'), true)
check('含連結', text.includes('https://x/#/gather/1'), true)
check('唔含落選候選', text.includes('落選酒樓'), false)

/* ── WhatsApp 分享鏈結 ── */
check('waHref 編碼正確', whatsappShareHref('a b').startsWith('https://wa.me/?text=a%20b'), true)

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
