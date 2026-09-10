/* 推薦獎勵券（Type B）端到端測試（node scripts/test-referrals-e2e.mjs）
 *
 * 前置（本機）：
 *   1) npx wrangler d1 migrations apply coeldery-family-tree-db --local
 *   2) npx wrangler d1 execute coeldery-family-tree-db --local --file scripts/seed-local-test.sql
 *   3) npx wrangler pages dev dist --d1=coeldery-family-tree-db --local --port 8787
 *   4) node scripts/test-referrals-e2e.mjs
 *
 * 環境變數：BASE（預設 http://127.0.0.1:8787）
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:8787'
const S1 = 'testsession1234'   // 900000001：0 位成功推薦 → 未解鎖
const S2 = 'testsession5678'   // 900000002：5 位成功推薦 + 1 位待加入 → 已解鎖
const S3 = 'testsession9999'   // 900000003：5 位成功推薦 → 已解鎖（測名額）

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
check('未登入 GET /api/referrals → 401', (await api('/api/referrals', { auth: false })).status === 401)
check('未登入 POST /api/referrals → 401', (await api('/api/referrals', { method: 'POST', body: {}, auth: false })).status === 401)
check('未登入 GET /api/rewards → 401', (await api('/api/rewards', { auth: false })).status === 401)
check('未登入 /api/reward-claims → 401', (await api('/api/reward-claims', { auth: false })).status === 401)

/* ── 1. 未解鎖會員（S1）：記錄邀請 ── */
const r0 = await api('/api/referrals')
check('S1 初始 0 位成功推薦', r0.body?.counts?.joined === 0, JSON.stringify(r0.body?.counts))
check('S1 初始無邀請紀錄', (r0.body?.referrals ?? []).length === 0)

check('電話格式錯 → 400', (await api('/api/referrals', { method: 'POST', body: { phone: '123' } })).status === 400)
const inv1 = await api('/api/referrals', { method: 'POST', body: { phone: '9333 0001', invitee_name: '細佬' } })
check('記錄邀請 → 201', inv1.status === 201, `got ${inv1.status} ${JSON.stringify(inv1.body)}`)
check('電話已遮罩（私隱）', inv1.body?.referral?.invitee_phone_masked === '9333****', String(inv1.body?.referral?.invitee_phone_masked))
check('重複邀請 → 409', (await api('/api/referrals', { method: 'POST', body: { phone: '93330001' } })).status === 409)

const r1 = await api('/api/referrals')
check('待加入計 1 位', r1.body?.counts?.invited === 1, JSON.stringify(r1.body?.counts))
check('成功推薦仍然 0（未加入唔計）', r1.body?.counts?.joined === 0)

/* ── 2. 未解鎖：獎勵券顯示鎖住、領取被拒 ── */
const w1 = await api('/api/rewards')
check('獎勵券清單 200', w1.status === 200 && w1.body?.ok === true)
check('S1 進度 joined = 0', w1.body?.progress?.joined === 0)
const locked = (w1.body?.rewards ?? []).find(r => r.id === 'reward-test-unlimited')
check('未達門檻 → unlocked = false', locked?.unlocked === false, JSON.stringify(locked?.unlocked))
check('需要 5 位', locked?.required_referrals === 5, String(locked?.required_referrals))

const claimLocked = await api('/api/reward-claims', { method: 'POST', body: { reward_id: 'reward-test-unlimited' } })
check('未解鎖領取 → 403', claimLocked.status === 403, `got ${claimLocked.status} ${JSON.stringify(claimLocked.body)}`)
check('403 回覆含進度提示', String(claimLocked.body?.error).includes('推薦'), String(claimLocked.body?.error))

/* ── 3. 已解鎖會員（S2）── */
const r2 = await api('/api/referrals', { session: S2 })
check('S2 成功推薦 5 位', r2.body?.counts?.joined === 5, JSON.stringify(r2.body?.counts))
check('S2 待加入 1 位', r2.body?.counts?.invited === 1)

const w2 = await api('/api/rewards', { session: S2 })
check('S2 進度 joined = 5', w2.body?.progress?.joined === 5)
const unlocked = (w2.body?.rewards ?? []).find(r => r.id === 'reward-test-unlimited')
check('達門檻 → unlocked = true', unlocked?.unlocked === true)
check('帶商戶資料', unlocked?.merchant?.name === '觀塘大家姐茶餐廳', JSON.stringify(unlocked?.merchant))

const claim2 = await api('/api/reward-claims', { method: 'POST', body: { reward_id: 'reward-test-unlimited' }, session: S2 })
check('已解鎖領取 → 201', claim2.status === 201, `got ${claim2.status} ${JSON.stringify(claim2.body)}`)
check('回傳 WhatsApp 預填訊息', String(claim2.body?.wa_text).includes('茶餐廳 $50 現金券'), String(claim2.body?.wa_text))
check('同一人再領 → 409', (await api('/api/reward-claims', { method: 'POST', body: { reward_id: 'reward-test-unlimited' }, session: S2 })).status === 409)

const mine2 = await api('/api/reward-claims', { session: S2 })
check('我領取嘅獎勵券 200', mine2.status === 200)
check('含已領取券', (mine2.body?.claims ?? []).some(c => c.reward_id === 'reward-test-unlimited'), JSON.stringify(mine2.body?.claims))
check('領取紀錄帶商戶聯絡', (mine2.body?.claims ?? []).every(c => c.merchant_name), JSON.stringify(mine2.body?.claims?.[0]))
check('另一位會員未領取任何（清單獨立）', (await api('/api/reward-claims')).body?.claims?.length === 0)

/* ── 4. 名額控管（quota_total = 1）── */
const q1 = await api('/api/reward-claims', { method: 'POST', body: { reward_id: 'reward-test-quota1' }, session: S2 })
check('S2 領取限量券 → 201', q1.status === 201, `got ${q1.status}`)
const q2 = await api('/api/reward-claims', { method: 'POST', body: { reward_id: 'reward-test-quota1' }, session: S3 })
check('S3 領取限量券 → 409 名額已滿', q2.status === 409 && String(q2.body?.error).includes('名額'), `got ${q2.status} ${JSON.stringify(q2.body)}`)
const quotaReward = (await api('/api/rewards', { session: S2 })).body?.rewards?.find(r => r.id === 'reward-test-quota1')
check('剩餘名額顯示 0', quotaReward?.quota_left === 0, String(quotaReward?.quota_left))

/* ── 5. 錯誤處理 ── */
check('領取不存在獎勵券 → 404', (await api('/api/reward-claims', { method: 'POST', body: { reward_id: 'nope' }, session: S2 })).status === 404)
check('冇 reward_id → 400', (await api('/api/reward-claims', { method: 'POST', body: {}, session: S2 })).status === 400)

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
