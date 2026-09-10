/* 測試：家庭聚會場合過濾 + 忌辰零廣告硬攔截（node scripts/test-gather-scenes.mjs）
 * 需先編譯：npx tsc src/utils/gatherScenes.ts --outDir .tmp-gather --module esnext --target es2022 --moduleResolution bundler --ignoreConfig
 * （TypeScript 6 起，命令行指定檔案時需加 --ignoreConfig，否則報 TS5112）
 */
import { filterMerchants, gatherSceneFromHash } from '../.tmp-gather/gatherScenes.js'

/* ── 用生產種子資料同款商戶做 fixture ── */
const M = (id, name, category_id, ad_tier, tagNames) => ({
  id, name, ad_tier,
  category_id, category_name: null,
  phone: null, whatsapp: null, map_url: null,
  photo_url: null, description: null, address: null,
  tags: tagNames.map(n => ({ id: 't-' + n, name: n })),
})

const all = [
  M('mc-funeral-shatin', '沙田至誠殯儀服務', 'cat-funeral', 2, ['拜祭用品', '殯儀服務']),
  M('mc-clinic-wanchai', '灣仔長青西醫診所', 'cat-health',  1, ['上門診療', '西醫']),
  M('mc-cha-kwuntong',   '觀塘大家姐茶餐廳', 'cat-food',    0, ['外賣到府', '茶餐廳']),
  M('mc-flower-free',    '順興鮮花店',       'cat-gift',    0, ['鮮花', '花店']),
  M('mc-flower-paid',    '富貴花店',         'cat-gift',    2, ['鮮花', '花店']),
  M('mc-cake-paid',      '名牌蛋糕屋',       'cat-gift',    1, ['蛋糕']),
]

const ids = arr => arr.map(m => m.id).sort().join(',')
const cases = [
  /* [名稱, 場合, 期望 id 集合] */
  ['all 全列',            'all',         'mc-cake-paid,mc-cha-kwuntong,mc-clinic-wanchai,mc-flower-free,mc-flower-paid,mc-funeral-shatin'],
  ['生日 → 餐飲/蛋糕/花店（診所、殯儀不算）', 'birthday',    'mc-cake-paid,mc-cha-kwuntong,mc-flower-free,mc-flower-paid'],
  ['節日 → 餐飲/蛋糕/花店（診所、殯儀不算）', 'festival',    'mc-cake-paid,mc-cha-kwuntong,mc-flower-free,mc-flower-paid'],
  ['忌辰 → 只列 ad_tier=0（付費殯儀/花店/蛋糕屋全剔除）', 'memorial', 'mc-flower-free'],
  ['忌辰 → 自然排序殯儀商戶可列', 'memorial',    'mc-flower-free,mc-funeral-free'],
]

let pass = 0, fail = 0
for (const [label, scene, want] of cases) {
  /* 最後一項 case 需臨時換入一個 ad_tier=0 殯儀商戶 */
  const pool = label.includes('自然排序殯儀')
    ? [...all.filter(m => m.id !== 'mc-funeral-shatin'), M('mc-funeral-free', '至誠殯儀', 'cat-funeral', 0, ['拜祭用品'])]
    : all
  const got = ids(filterMerchants(pool, scene))
  const ok  = got === want
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  if (!ok) { console.log(`       want: ${want}`); console.log(`       got : ${got}`) }
  if (ok) { pass++ } else { fail++ }
}

/* ── 硬攔截單元斷言（忌辰下任何 ad_tier > 0 一律不得出現）── */
const mem = filterMerchants(all, 'memorial')
const noPaid = mem.every(m => m.ad_tier === 0)
console.log(`${noPaid ? 'PASS' : 'FAIL'} — 忌辰零廣告硬攔截（ad_tier 全部 = 0）`)
if (noPaid) { pass++ } else { fail++ }

/* ── hash 場合解析 ── */
const hashCases = [
  ['#/family-gather?scene=memorial', 'memorial'],
  ['#/family-gather?scene=birthday', 'birthday'],
  ['#/family-gather',                'all'],
  ['#/family-gather?scene=evil',     'all'],
]
for (const [hash, want] of hashCases) {
  const got = gatherSceneFromHash(hash)
  const ok = got === want
  console.log(`${ok ? 'PASS' : 'FAIL'} — hash ${hash} → ${got}`)
  if (ok) { pass++ } else { fail++ }
}

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
