/* 家庭聚會 端到端測試（node scripts/test-gathering-e2e.mjs）
 *
 * 前置（本機）：
 *   1) npx wrangler d1 migrations apply coeldery-family-tree-db --local
 *   2) npx wrangler d1 execute coeldery-family-tree-db --local --file scripts/seed-local-test.sql
 *   3) npx wrangler pages dev dist --d1=coeldery-family-tree-db --local --port 8787
 *   4) node scripts/test-gathering-e2e.mjs
 *
 * 環境變數：BASE（預設 http://127.0.0.1:8787）、SESSION（預設 testsession1234）
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:8787'
const SESSION = process.env.SESSION ?? 'testsession1234'

let pass = 0, fail = 0
function check(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}${cond ? '' : '  ' + extra}`)
  if (cond) { pass++ } else { fail++ }
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Cookie: `family_session=${SESSION}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let json = null
  try { json = await res.json() } catch { /* 可能無 body */ }
  return { status: res.status, body: json }
}

/* ── 0. 未登入必須 401 ── */
const anon = await api('/api/gatherings', { auth: false })
check('未登入 GET /api/gatherings → 401', anon.status === 401, `got ${anon.status}`)

/* ── 1. 忌辰硬攔截：不可發起聚會（rules §23 / spec §7）── */
const mem = await api('/api/gatherings', { method: 'POST', body: { title: 'X', occasion_type: 'memorial' } })
check('忌辰不可發起聚會 → 400', mem.status === 400, `got ${mem.status} ${JSON.stringify(mem.body)}`)

const badOcc = await api('/api/gatherings', { method: 'POST', body: { title: 'X', occasion_type: 'party' } })
check('亂場合不可發起聚會 → 400', badOcc.status === 400, `got ${badOcc.status}`)

/* ── 2. 發起聚會 ── */
const created = await api('/api/gatherings', {
  method: 'POST',
  body: { title: '測試爸爸生日聚會', occasion_type: 'birthday', subject_member_id: 'm-dad', target_date: '2026-10-01' },
})
check('建立聚會 → 201', created.status === 201, `got ${created.status} ${JSON.stringify(created.body)}`)
const gid = created.body?.gathering?.id
check('聚會 id 已回傳', typeof gid === 'string' && gid.length > 0)
check('聚會初始狀態 draft', created.body?.gathering?.status === 'draft', String(created.body?.gathering?.status))

const list = await api('/api/gatherings')
check('清單含新聚會', (list.body?.gatherings ?? []).some(g => g.id === gid))

/* ── 3. 加入候選（地點 ×2）── */
const optA = await api('/api/gathering-options', {
  method: 'POST',
  body: { gathering_id: gid, kind: 'place', label: '觀塘大家姐茶餐廳', merchant_id: 'mc-cha-kwuntong' },
})
check('加入候選地點 A → 201', optA.status === 201, `got ${optA.status} ${JSON.stringify(optA.body)}`)
const optAId = optA.body?.option?.id

const optB = await api('/api/gathering-options', {
  method: 'POST', body: { gathering_id: gid, kind: 'place', label: '在家用餐' },
})
check('加入自訂候選地點 B → 201', optB.status === 201, `got ${optB.status}`)
const optBId = optB.body?.option?.id

const afterOpt = await api(`/api/gatherings/${gid}`)
check('加入候選後狀態轉投票中', afterOpt.body?.gathering?.status === 'voting', String(afterOpt.body?.gathering?.status))
check('詳情含 2 個候選', (afterOpt.body?.options ?? []).length === 2, String((afterOpt.body?.options ?? []).length))
check('候選帶商戶資料', afterOpt.body?.options?.find(o => o.id === optAId)?.merchant?.name === '觀塘大家姐茶餐廳')
check('新候選票數為 0', afterOpt.body?.options?.find(o => o.id === optAId)?.tally?.yes === 0)

/* ── 4. 投票（每人一票，可改）── */
const v1 = await api('/api/gathering-votes', { method: 'POST', body: { option_id: optAId, choice: 'yes' } })
check('投 yes → 票數 yes=1', v1.body?.tally?.yes === 1, JSON.stringify(v1.body))
const v2 = await api('/api/gathering-votes', { method: 'POST', body: { option_id: optAId, choice: 'no' } })
check('改投 no → yes=0,no=1（upsert 正確）', v2.body?.tally?.yes === 0 && v2.body?.tally?.no === 1, JSON.stringify(v2.body))
const v3 = await api('/api/gathering-votes', { method: 'POST', body: { option_id: optAId, choice: 'none' } })
check('收回投票 → 全部 0', v3.body?.tally?.yes === 0 && v3.body?.tally?.no === 0 && v3.body?.my_choice === null, JSON.stringify(v3.body))

/* ── 5. 確認候選：date／place 屬唯一，確認一項 → 同類其他自動落選 ── */
await api('/api/gathering-votes', { method: 'POST', body: { option_id: optAId, choice: 'yes' } })
const conf = await api(`/api/gathering-options/${optAId}`, { method: 'PATCH', body: { status: 'confirmed' } })
check('確認候選 A', conf.body?.option?.status === 'confirmed', JSON.stringify(conf.body))
const afterConf = await api(`/api/gatherings/${gid}`)
check('同類候選 B 自動落選', afterConf.body?.options?.find(o => o.id === optBId)?.status === 'dropped',
  String(afterConf.body?.options?.find(o => o.id === optBId)?.status))

/* ── 6. 蛋糕：帶取貨地點／時間／負責人 ── */
const cake = await api('/api/gathering-options', {
  method: 'POST',
  body: {
    gathering_id: gid, kind: 'cake', label: '名牌蛋糕屋',
    option_date: '2026-10-01', option_time: '16:00', pickup_place: '旺角分店', assignee_member_id: 'm-self',
  },
})
check('加入蛋糕候選（含取貨）→ 201', cake.status === 201, `got ${cake.status} ${JSON.stringify(cake.body)}`)
check('蛋糕負責人已記錄', cake.body?.option?.assignee_member_id === 'm-self')
await api(`/api/gathering-options/${cake.body?.option?.id}`, { method: 'PATCH', body: { status: 'confirmed' } })

/* ── 7. 確認聚會 → 自動生成家庭圈邀請卡 ── */
const postsBefore = await api('/api/posts')
const beforeCount = (postsBefore.body?.posts ?? []).length

const confirmed = await api(`/api/gatherings/${gid}`, { method: 'PATCH', body: { status: 'confirmed' } })
check('確認聚會', confirmed.body?.gathering?.status === 'confirmed', JSON.stringify(confirmed.body))
check('已記錄邀請卡 post id', typeof confirmed.body?.gathering?.invite_post_id === 'string',
  JSON.stringify(confirmed.body?.gathering))

const postsAfter = await api('/api/posts')
const posts = postsAfter.body?.posts ?? []
check('家庭圈多咗 1 張邀請卡', posts.length === beforeCount + 1, `${beforeCount} → ${posts.length}`)
const invite = posts.find(p => p.id === confirmed.body?.gathering?.invite_post_id)
check('邀請卡含聚會標題', typeof invite?.body_text === 'string' && invite.body_text.includes('測試爸爸生日聚會'),
  String(invite?.body_text))
check('邀請卡含已確認地點同蛋糕',
  Boolean(invite?.body_text?.includes('觀塘大家姐茶餐廳')) && Boolean(invite?.body_text?.includes('名牌蛋糕屋')),
  String(invite?.body_text))

/* ── 8. 取消聚會 → 邀請卡一併清走 ── */
const cancelled = await api(`/api/gatherings/${gid}`, { method: 'PATCH', body: { status: 'cancelled' } })
check('取消聚會', cancelled.body?.gathering?.status === 'cancelled')
check('取消後 invite_post_id 清空', cancelled.body?.gathering?.invite_post_id === null)
const postsAfterCancel = await api('/api/posts')
check('家庭圈邀請卡已刪除', (postsAfterCancel.body?.posts ?? []).length === beforeCount,
  String((postsAfterCancel.body?.posts ?? []).length))

/* ── 9. 刪除聚會 ── */
const del = await api(`/api/gatherings/${gid}`, { method: 'DELETE' })
check('刪除聚會', del.status === 200 && del.body?.ok === true, `got ${del.status}`)
const gone = await api(`/api/gatherings/${gid}`)
check('刪除後 GET → 404', gone.status === 404, `got ${gone.status}`)

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
