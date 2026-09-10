/**
 * gen-handoff-token.mjs — 本地產生 Handoff Token（測試用）
 *
 * 用法：
 *   FAMILY_TREE_API_KEY=<key> node scripts/gen-handoff-token.mjs <member_no> [ttlSeconds]
 *
 * 例：
 *   FAMILY_TREE_API_KEY=abc node scripts/gen-handoff-token.mjs CE85-000001 120
 *
 * 契約詳見 .coappery/handoff_contract.md
 * ⚠️ 此 script 只作本機測試；key 由環境變數讀入，永不寫入檔案。
 */

import crypto from 'node:crypto'

const key      = process.env.FAMILY_TREE_API_KEY
const memberNo = process.argv[2]
const ttl      = Number(process.argv[3] ?? 120)

if (!key || !memberNo) {
  console.error('用法：FAMILY_TREE_API_KEY=<key> node scripts/gen-handoff-token.mjs <member_no> [ttlSeconds]')
  process.exit(1)
}

/* base64url（無 padding） */
const b64url = (buf) =>
  Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const payload = { member_no: memberNo, exp: Math.floor(Date.now() / 1000) + ttl }

/* 簽 base64url(payload) 字串本身（與 family side _verifyHandoff 一致） */
const payloadB64 = b64url(JSON.stringify(payload))
const sigB64     = b64url(crypto.createHmac('sha256', key).update(payloadB64).digest())

const token = `${payloadB64}.${sigB64}`

console.log('token:')
console.log(token)
console.log('\n入口 URL:')
console.log(`https://family.coeldery85.com/?token=${token}#/enter`)
