/* 測試：家庭聚會安排純邏輯（node scripts/test-gather-plan.mjs）
 * 需先編譯：npx tsc src/utils/gatherPlan.ts --outDir .tmp-gather --module esnext --target es2022 --moduleResolution bundler --ignoreConfig
 * （TypeScript 6 起，命令行指定檔案時需加 --ignoreConfig，否則報 TS5112）
 */
import {
  occasionAllowed, occasionFromScene, isMemorialOccasion, isExclusiveKind,
  groupByKind, confirmedOption, hasConfirmed, optionDetail, pendingVoterCount,
  planEntryFromHash, defaultTitle,
} from '../.tmp-gather/gatherPlan.js'

let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  if (!ok) { console.log(`       want: ${JSON.stringify(want)}`); console.log(`       got : ${JSON.stringify(got)}`) }
  if (ok) { pass++ } else { fail++ }
}

/* ── 忌辰硬攔截（rules §23 / spec §7）── */
check('memorial 係莊重場合', isMemorialOccasion('memorial'), true)
check('memorial 不可發起聚會', occasionAllowed('memorial'), false)
check('birthday 可發起聚會', occasionAllowed('birthday'), true)
check('亂值不可發起聚會', occasionAllowed('party'), false)
check('場景 memorial → 無場合（不可發起）', occasionFromScene('memorial'), null)
check('場景 birthday → birthday', occasionFromScene('birthday'), 'birthday')
check('場景 anniversary → anniversary', occasionFromScene('anniversary'), 'anniversary')
check('場景 festival → festival', occasionFromScene('festival'), 'festival')
check('場景 all → 無場合', occasionFromScene('all'), null)

/* ── 唯一類別 ── */
check('date／place 屬唯一類別', [isExclusiveKind('date'), isExclusiveKind('place')], [true, true])
check('cake／gift 可多項', [isExclusiveKind('cake'), isExclusiveKind('gift')], [false, false])

/* ── 分組／確認 ── */
const opts = [
  { id: 'o1', kind: 'place', status: 'candidate', label: 'A 酒樓' },
  { id: 'o2', kind: 'place', status: 'confirmed', label: 'B 酒樓' },
  { id: 'o3', kind: 'cake',  status: 'candidate', label: 'C 餅店' },
  { id: 'o4', kind: 'weird', status: 'candidate', label: 'X' },
]
const grouped = groupByKind(opts)
check('groupByKind 分組正確', [grouped.date.length, grouped.place.length, grouped.cake.length, grouped.gift.length], [0, 2, 1, 0])
check('groupByKind 丟棄未知 kind', grouped.place.map(o => o.id), ['o1', 'o2'])
check('confirmedOption 取已確認地點', confirmedOption(opts, 'place')?.id, 'o2')
check('confirmedOption 無已確認蛋糕', confirmedOption(opts, 'cake'), undefined)
check('hasConfirmed', hasConfirmed(opts), true)
check('hasConfirmed 全候選 → false', hasConfirmed([{ status: 'candidate' }]), false)

/* ── 顯示細節 ── */
check('optionDetail 組合日期時間取貨', optionDetail({ option_date: '2026-10-01', option_time: '18:00', pickup_place: '旺角店', merchant: null }), '2026-10-01 ・ 18:00 ・ 旺角店')
check('optionDetail 無取貨地點 → 用商戶地址', optionDetail({ option_date: null, option_time: null, pickup_place: null, merchant: { address: '觀塘道 1 號' } }), '觀塘道 1 號')

/* ── 未表態人數 ── */
check('pendingVoterCount', pendingVoterCount(['a', 'b', 'c'], ['b']), 2)

/* ── 「去安排」入口解析 ── */
check('解析正常入口', planEntryFromHash('#/family-gather?plan=1&occasion=birthday&subject=m1&date=2026-10-01'),
  { plan: true, occasion: 'birthday', subject: 'm1', date: '2026-10-01' })
check('忌辰場合被拒（不會帶入發起聚會）', planEntryFromHash('#/family-gather?plan=1&occasion=memorial'), 
  { plan: true, occasion: '', subject: '', date: '' })
check('無 query → 空', planEntryFromHash('#/family-gather'), { plan: false, occasion: '', subject: '', date: '' })
check('亂日期被拒', planEntryFromHash('#/family-gather?plan=1&date=2026/10/01').date, '')

/* ── 預設標題 ── */
const fakeT = (k, o) => `[${k}:${o?.name ?? ''}]`
check('生日預設標題', defaultTitle('birthday', '爸爸', fakeT), '[gather.default_title_birthday:爸爸]')
check('其他場合用通用標題', defaultTitle('festival', null, fakeT), '[gather.default_title_generic:]')

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
