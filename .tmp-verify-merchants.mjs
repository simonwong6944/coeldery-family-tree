/* 臨時驗證（不入 git）：商戶資料 + 節日推廣落地後，各「需要」流程有商戶 */
import { applyMerchantQuery } from './.tmp-promo/merchantQuery.js'

const BASE = process.env.BASE ?? 'http://127.0.0.1:8787'
const H = { Cookie: 'family_session=testsession1234' }

const merchants = (await (await fetch(BASE + '/api/merchants', { headers: H })).json()).merchants ?? []
const meta = await (await fetch(BASE + '/api/merchants-meta', { headers: H })).json()
const promos = (await (await fetch(BASE + '/api/promotions?festival_id=mid-autumn-2026', { headers: H })).json()).promotions ?? []

let pass = 0, fail = 0
const check = (label, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}${cond ? '' : '  ' + extra}`)
  if (cond) { pass++ } else { fail++ }
}

check('商戶總數 >= 10（3 原有 + 7 示範）', merchants.length >= 10, String(merchants.length))

const byKind = (k) => applyMerchantQuery(merchants, { kind: k })
check('訂餐廳有 >= 2 間', byKind('place').length >= 2, String(byKind('place').length))
check('訂蛋糕有 >= 2 間', byKind('cake').length >= 2, String(byKind('cake').length))
check('買禮物有 >= 2 間', byKind('gift').length >= 2, String(byKind('gift').length))
check('送花（gift + 鮮花標籤）有 >= 2 間',
  applyMerchantQuery(merchants, { kind: 'gift', tagName: '鮮花' }).length >= 2,
  String(applyMerchantQuery(merchants, { kind: 'gift', tagName: '鮮花' }).length))

/* 地區／類型篩選（新增嘅地區要出現） */
const districts = meta.regions.flatMap(r => r.districts.map(d => d.name))
check('地區選項含旺角／銅鑼灣', districts.includes('旺角') && districts.includes('銅鑼灣'), districts.join(','))
check('按地區篩選（九龍）有效', applyMerchantQuery(merchants, { region: '九龍' }).length >= 2,
  String(applyMerchantQuery(merchants, { region: '九龍' }).length))
check('標籤選項含蛋糕／花店', meta.tags.some(t => t.name === '蛋糕') && meta.tags.some(t => t.name === '花店'),
  meta.tags.map(t => t.name).join(','))
check('贊助標示：付費商戶 ad_tier > 0 存在', merchants.some(m => m.ad_tier > 0))

/* 節日推廣（#1 + #2 一齊生效）*/
check('中秋節有 >= 4 張推廣（1 測試 + 3 示範）', promos.length >= 4, String(promos.length))
check('示範酒樓推廣帶節日', promos.some(p => p.merchant?.name?.includes('金鳳酒樓')), JSON.stringify(promos.map(p => p.id)))
check('推廣排序（付費商戶優先）', promos.length > 1 && (promos[0].merchant.ad_tier >= promos[promos.length - 1].merchant.ad_tier),
  JSON.stringify(promos.map(p => p.merchant.ad_tier)))

console.log(`\n${pass}/${pass + fail} 通過｜商戶 ${merchants.length}、推廣 ${promos.length}`)
process.exit(fail ? 1 : 0)
