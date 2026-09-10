/**
 * test-handoff-enter.mjs — 一鍵驗「兩邊 FAMILY_TREE_API_KEY 是否一致」+ 契約對齊
 *
 * 用法：
 *   FAMILY_TREE_API_KEY=<生產 key> node scripts/test-handoff-enter.mjs [member_no] [ttl] [host]
 *
 * 例：
 *   FAMILY_TREE_API_KEY=abc123 node scripts/test-handoff-enter.mjs CE85-000001 300
 *
 * 原理：
 *   用「生產 key」在本機產生一個契約正確嘅 handoff token，直接 POST 去家庭樹
 *   /api/family/enter。因為產生器已確定契約正確，所以：
 *     200 → 兩邊 key 一致、契約對齊、端到端通 ✅
 *     401 → 兩邊 key 唔一致（或 token 過期）❌
 *
 * ⚠️ 只作本機測試；key 由環境變數讀入，永不寫入檔案。
 */

import crypto from 'node:crypto'

const key      = process.env.FAMILY_TREE_API_KEY
const memberNo = process.argv[2] ?? 'CE85-000001'
const ttl      = Number(process.argv[3] ?? 300)
const host     = (process.argv[4] ?? 'https://family.coeldery85.com').replace(/\/$/, '')

if (!key) {
  console.error('缺少 FAMILY_TREE_API_KEY。用法：FAMILY_TREE_API_KEY=<key> node scripts/test-handoff-enter.mjs [member_no] [ttl] [host]')
  process.exit(1)
}

/* base64url（無 padding）*/
const b64url = (buf) =>
  Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const payload    = { member_no: memberNo, exp: Math.floor(Date.now() / 1000) + ttl }
const payloadB64 = b64url(JSON.stringify(payload))
const sigB64     = b64url(crypto.createHmac('sha256', key).update(payloadB64).digest())
const token      = `${payloadB64}.${sigB64}`

console.log('member_no :', memberNo)
console.log('ttl(秒)   :', ttl)
console.log('host      :', host)
console.log('token     :', token)
console.log('')

let res
try {
  res = await fetch(`${host}/api/family/enter`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token }),
  })
} catch (e) {
  console.error('❌ 網絡錯：', e instanceof Error ? e.message : String(e))
  process.exit(1)
}

const body = await res.text()
console.log('HTTP      :', res.status)
console.log('set-cookie:', res.headers.get('set-cookie') ?? '(none)')
console.log('body      :', body)
console.log('')

if (res.status === 200) {
  console.log('✅ 200 → 兩邊 FAMILY_TREE_API_KEY 一致；契約對齊；端到端通。')
  console.log('   （needs_setup:true 表示該 member 未設家庭樹密碼，屬正常）')
} else if (res.status === 401) {
  console.log('❌ 401 → 驗簽失敗：兩邊 key 唔一致，或 token 已過期。')
  console.log('   第一步：核對兩邊 Cloudflare Secret FAMILY_TREE_API_KEY 是否相同。')
} else {
  console.log('⚠️ 非預期狀態，請睇上面 body。')
}
