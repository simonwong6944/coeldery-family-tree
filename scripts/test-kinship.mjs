/* 測試：親屬稱謂引擎（node scripts/test-kinship.mjs）
 * 需先編譯：npx tsc packages/kinship-engine/index.ts --outDir .tmp-kin --module esnext --target es2022 --moduleResolution bundler --ignoreConfig
 * （TypeScript 6 起，命令行指定檔案時需加 --ignoreConfig，否則報 TS5112）
 */
import { resolveKinship } from '../.tmp-kin/index.js'

const M = (id, gender, birth_date) => ({ id, gender, birth_date })
const members = [
  M('grandpa', 'male', '1940-01-01'),
  M('gmaD', 'female', '1942-01-01'),
  M('dad', 'male', '1965-01-01'),
  M('mom', 'female', '1967-01-01'),
  M('self', 'male', '1990-01-01'),
  M('wife', 'female', '1992-01-01'),
  M('son', 'male', '2015-01-01'),
  M('daughter', 'female', '2018-01-01'),
  M('bro', 'male', '1988-01-01'),
  M('uncle', 'male', '1960-01-01'),
  M('cousin', 'male', '1985-01-01'),
  M('auntM', 'female', '1970-01-01'),
  M('gfM', 'male', '1941-01-01'),
  M('gfW', 'male', '1960-06-01'),
  M('dauInLaw', 'female', '1993-01-01'),
  M('sonOfDaughter', 'male', '2040-01-01'),
]
const R = (from, to, edge_type = 'parent_child') => ({ from_member: from, to_member: to, edge_type })
const rels = [
  R('grandpa', 'dad'), R('gmaD', 'dad'),
  R('grandpa', 'uncle'), R('gmaD', 'uncle'),
  R('dad', 'self'), R('mom', 'self'),
  R('dad', 'bro'), R('mom', 'bro'),
  R('uncle', 'cousin'),
  R('gfM', 'mom'), R('gfM', 'auntM'),          // 舅父/姨母：同一個外公
  R('gfW', 'wife'),                            // 老婆嘅爸爸
  R('self', 'son'), R('wife', 'son'),
  R('self', 'daughter'), R('wife', 'daughter'),
  R('self', 'wife', 'marriage'),
  R('son', 'dauInLaw', 'marriage'),            // 仔嘅老婆
  R('daughter', 'sonOfDaughter'),              // 女兒嘅仔（外孫）
]

const exp = {
  dad: 'father', mom: 'mother',
  grandpa: 'grandfather_paternal', gmaD: 'grandmother_paternal',
  gfM: 'grandfather_maternal', auntM: 'aunt_maternal',
  bro: 'elder_brother', uncle: 'uncle_elder', cousin: 'cousin_paternal_m',
  wife: 'wife', son: 'son', daughter: 'daughter',
  gfW: 'father_in_law', dauInLaw: 'daughter_in_law', sonOfDaughter: 'grandson_maternal',
}

let ok = 0, bad = 0
for (const [id, want] of Object.entries(exp)) {
  const got = resolveKinship('self', id, members, rels)
  if (got === `kin.${want}`) { ok++; console.log('OK  ', id.padEnd(9), '->', got) }
  else { bad++; console.log('FAIL', id.padEnd(9), 'want kin.' + want, 'got', got) }
}
console.log(`\n${ok} ok, ${bad} fail`)
process.exit(bad ? 1 : 0)
