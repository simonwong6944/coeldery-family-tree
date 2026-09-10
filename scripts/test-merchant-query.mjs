/* 測試：商戶查詢純邏輯（node scripts/test-merchant-query.mjs）
 * 需先編譯：npx tsc src/utils/merchantQuery.ts --outDir .tmp-gather --module esnext --target es2022 --moduleResolution bundler --ignoreConfig
 * （TypeScript 6 起，命令行指定檔案時需加 --ignoreConfig，否則報 TS5112）
 */
import {
  applyMerchantQuery, defaultCategoryFor, matchKind, hidePaid, searchMerchants, sortMerchants,
} from '../.tmp-gather/merchantQuery.js'

let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  if (!ok) { console.log(`       want: ${JSON.stringify(want)}`); console.log(`       got : ${JSON.stringify(got)}`) }
  if (ok) { pass++ } else { fail++ }
}

/* ── fixture：模擬生產種子（3 商戶）+ 加幾個做篩選 ── */
const M = (id, name, category_id, ad_tier, tags, district_name, district_group_name) => ({
  id, name, category_id, ad_tier,
  category_name: category_id, district_name, district_group_name,
  address: '地址 ' + name, tags: tags.map(t => ({ id: 't-' + t, name: t })),
})
const all = [
  M('mc-funeral-shatin', '沙田至誠殯儀服務', 'cat-funeral', 2, ['拜祭用品', '殯儀服務'], '沙田', '新界'),
  M('mc-clinic-wanchai', '灣仔長青西醫診所', 'cat-health', 1, ['上門診療', '西醫'], '灣仔', '港島'),
  M('mc-cha-kwuntong', '觀塘大家姐茶餐廳', 'cat-food', 0, ['外賣到府', '茶餐廳'], '觀塘', '九龍'),
  M('mc-cake-mk', '旺角餅店', 'cat-gift', 0, ['蛋糕', '西餅'], '旺角', '九龍'),
  M('mc-flower-hk', '中環花店', 'cat-gift', 0, ['鮮花', '花店'], '中西區', '港島'),
  M('mc-cake-paid', '名牌蛋糕屋', 'cat-food', 2, ['蛋糕'], '中環', '港島'),
]
const ids = arr => arr.map(x => x.id)

/* ── 需要類型（kind）匹配 ── */
check('kind=place 只出餐飲（茶餐廳）', ids(applyMerchantQuery(all, { kind: 'place' })).sort(),
  ['mc-cha-kwuntong'])
check('kind=cake 只出蛋糕（茶餐廳／花店唔會混入）', ids(applyMerchantQuery(all, { kind: 'cake' })).sort(),
  ['mc-cake-mk', 'mc-cake-paid'])
check('kind=gift 只出禮品／花藝', ids(applyMerchantQuery(all, { kind: 'gift' })).sort(),
  ['mc-flower-hk'])
check('kind=date 不限類型（全部）', ids(applyMerchantQuery(all, { kind: 'date' })).length, all.length)
check('matchKind 診所唔屬 place', matchKind(all[1], 'place'), false)
check('冇標籤嘅商戶用分類後備', matchKind({ id: 'x', name: 'X', ad_tier: 0, category_id: 'cat-food', category_name: null, district_name: null, district_group_name: null, tags: [] }, 'place'), true)
check('有標籤但唔命中 → 唔出（茶餐廳唔屬 cake）', matchKind(all[2], 'cake'), false)
check('defaultCategoryFor(cake) 預選 cat-food', defaultCategoryFor('cake'), 'cat-food')

/* ── 搜尋 ── */
check('搜尋商戶名', ids(searchMerchants(all, '花店')), ['mc-flower-hk'])
check('搜尋地址', ids(searchMerchants(all, '旺角餅店')), ['mc-cake-mk'])
check('搜尋標籤', ids(searchMerchants(all, '西餅')), ['mc-cake-mk'])
check('空白搜尋唔過濾', searchMerchants(all, '   ').length, all.length)

/* ── 地區／分類／標籤篩選 ── */
check('篩區域=九龍', ids(applyMerchantQuery(all, { region: '九龍' })).sort(), ['mc-cake-mk', 'mc-cha-kwuntong'])
check('篩地區=旺角', ids(applyMerchantQuery(all, { district: '旺角' })), ['mc-cake-mk'])
check('篩分類=cat-food', ids(applyMerchantQuery(all, { categoryId: 'cat-food' })).sort(), ['mc-cake-paid', 'mc-cha-kwuntong'])
check('篩標籤=花店', ids(applyMerchantQuery(all, { tagName: '花店' })), ['mc-flower-hk'])
check('組合：九龍 + gift + 搜尋', ids(applyMerchantQuery(all, { region: '九龍', categoryId: 'cat-gift', q: '餅' })), ['mc-cake-mk'])

/* ── 排序 ── */
check('按名稱排序（結果穩定、數量不變）', sortMerchants(all, 'name').length, all.length)
const byDistrict = sortMerchants(all, 'district').map(m => m.district_group_name)
const contiguous = byDistrict.every((g, i) => i === 0 || byDistrict.indexOf(g) === i || byDistrict[i - 1] === g)
check('按地區排序（同區相鄰）', contiguous, true)
check('recommended 保留平台排序（贊助優先）', sortMerchants(all, 'recommended')[0].id, 'mc-funeral-shatin')

/* ── 忌辰零廣告硬攔截（rules §23）── */
check('hidePaid 剔除所有 ad_tier>0', ids(hidePaid(all)).sort(),
  ['mc-cake-mk', 'mc-cha-kwuntong', 'mc-flower-hk'])
const solemnRes = applyMerchantQuery(all, { kind: 'gift', solemn: true })
check('忌辰：gift 只出自然排序商戶（付費蛋糕屋／殯儀全剔除）', ids(solemnRes).sort(), ['mc-flower-hk'])
check('忌辰：任何結果都無付費商戶', solemnRes.every(m => m.ad_tier === 0), true)

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
