/* 測試：節日推廣純邏輯（node scripts/test-promotions.mjs）
 * 需先編譯：npx tsc src/utils/promotions.ts --outDir .tmp-promo --module esnext --target es2022 --moduleResolution bundler --ignoreConfig
 */
import {
  quotaLeft, claimState, daysUntil, sortPromotions, promoForMerchant,
  festivalWhen, defaultClaimText, waHref,
} from '../.tmp-promo/promotions.js'

let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  if (!ok) { console.log(`       want: ${JSON.stringify(want)}`); console.log(`       got : ${JSON.stringify(got)}`) }
  if (ok) { pass++ } else { fail++ }
}

const TODAY = Date.UTC(2026, 8, 10)   // 2026-09-10

const P = (over = {}) => ({
  id: 'p1', merchant_id: 'mc1', festival_id: 'mid-autumn-2026',
  festival_name: '中秋節', festival_date: '2026-09-25', festival_days_until: 15,
  title: '中秋家庭聚餐 9 折', description: null, terms: null,
  quota_total: null, claimed_count: 0, quota_left: null,
  valid_from: null, valid_to: null, my_claimed: false,
  merchant: { id: 'mc1', name: '大家姐茶餐廳', whatsapp: '85291234567', ad_tier: 0 },
  ...over,
})

/* ── 名額 ── */
check('quotaLeft 不限 = null', quotaLeft({ quota_total: null, claimed_count: 3 }), null)
check('quotaLeft 計算', quotaLeft({ quota_total: 10, claimed_count: 4 }), 6)
check('quotaLeft 唔會負數', quotaLeft({ quota_total: 2, claimed_count: 5 }), 0)

/* ── 日期 ── */
check('daysUntil 當日 = 0', daysUntil('2026-09-10', TODAY), 0)
check('daysUntil 中秋 = 15', daysUntil('2026-09-25', TODAY), 15)
check('daysUntil 已過 = 負', daysUntil('2026-09-01', TODAY) < 0, true)

/* ── 狀態機 ── */
check('可領取', claimState(P(), TODAY), 'claimable')
check('已領取', claimState(P({ my_claimed: true }), TODAY), 'claimed')
check('名額已滿', claimState(P({ quota_total: 5, claimed_count: 5 }), TODAY), 'full')
check('已過期（valid_to 已過）', claimState(P({ valid_to: '2026-09-01' }), TODAY), 'expired')
check('過期優先於已領取', claimState(P({ valid_to: '2026-09-01', my_claimed: true }), TODAY), 'expired')

/* ── 排序：付費優先 → 節日已近 → 名 ── */
const sorted = sortPromotions([
  P({ id: 'a', title: 'B 商戶（免費）', merchant: { id: 'mcA', name: 'B', ad_tier: 0 } }),
  P({ id: 'b', title: 'A 商戶（付費 tier2）', merchant: { id: 'mcB', name: 'A', ad_tier: 2 } }),
  P({ id: 'c', title: 'C 商戶（付費 tier1）', merchant: { id: 'mcC', name: 'C', ad_tier: 1 } }),
])
check('付費商戶排前（2 > 1 > 0）', sorted.map(p => p.id), ['b', 'c', 'a'])
check('sortPromotions 唔改原陣列', (() => {
  const src = [P({ id: 'x', merchant: { id: 'm', name: 'x', ad_tier: 0 } }), P({ id: 'y', merchant: { id: 'm', name: 'y', ad_tier: 2 } })]
  sortPromotions(src)
  return src.map(p => p.id)
})(), ['x', 'y'])

/* ── 商戶對應 ── */
check('promoForMerchant 命中', promoForMerchant([P({ id: 'p9', merchant_id: 'mc9' })], 'mc9')?.id, 'p9')
check('promoForMerchant 唔命中 = undefined', promoForMerchant([P()], 'nope'), undefined)

/* ── 節日倒數 ── */
check('festivalWhen 今日', festivalWhen(0), { key: 'today', n: 0 })
check('festivalWhen N 日後', festivalWhen(15), { key: 'days', n: 15 })
check('festivalWhen 已過', festivalWhen(-3).key, 'past')

/* ── WhatsApp 鏈結 ── */
const promo = P()
check('waHref 用商戶 whatsapp', waHref(promo, 'hi').startsWith('https://wa.me/85291234567?text='), true)
check('waHref 無 whatsapp → 通用分享', waHref(P({ merchant: { id: 'm', name: 'x', whatsapp: null } }), 'hi').startsWith('https://wa.me/?text='), true)
check('defaultClaimText 含標題同節日', defaultClaimText(promo).includes('中秋家庭聚餐 9 折') && defaultClaimText(promo).includes('中秋節'), true)

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
