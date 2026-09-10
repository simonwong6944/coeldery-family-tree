/* 測試：推薦獎勵純邏輯（node scripts/test-referrals.mjs）
 * 需先編譯：npx tsc src/utils/referrals.ts --outDir .tmp-promo --module esnext --target es2022 --moduleResolution bundler --ignoreConfig
 */
import {
  normalizePhone8, referralProgress, rewardState, unlockThreshold,
  inviteText, inviteHref, defaultRewardClaimText,
} from '../.tmp-promo/referrals.js'

let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`)
  if (!ok) { console.log(`       want: ${JSON.stringify(want)}`); console.log(`       got : ${JSON.stringify(got)}`) }
  if (ok) { pass++ } else { fail++ }
}

const TODAY = Date.UTC(2026, 8, 10)   // 2026-09-10

/* ── 電話 ── */
check('normalize 8 位', normalizePhone8('9123 4567'), '91234567')
check('normalize +852', normalizePhone8('+852 9123 4567'), '91234567')
check('normalize 852 前綴', normalizePhone8('85291234567'), '91234567')
check('normalize 太短 = null', normalizePhone8('12345'), null)
check('normalize 非數字 = null', normalizePhone8('abc'), null)

/* ── 進度 ── */
check('3/5 進度', referralProgress({ joined: 3, invited: 1 }, 5),
  { joined: 3, required: 5, remaining: 2, unlocked: false, percent: 60 })
check('5/5 已解鎖', referralProgress({ joined: 5, invited: 0 }, 5),
  { joined: 5, required: 5, remaining: 0, unlocked: true, percent: 100 })
check('超額唔會爆 100%', referralProgress({ joined: 7, invited: 0 }, 5).percent, 100)
check('0/5 未解鎖', referralProgress({ joined: 0, invited: 0 }, 5).unlocked, false)

/* ── 券狀態機 ── */
const R = (over = {}) => ({ unlocked: true, my_claimed: false, quota_total: null, claimed_count: 0, valid_to: null, ...over })
check('未解鎖 → locked', rewardState(R({ unlocked: false }), TODAY), 'locked')
check('已解鎖 → claimable', rewardState(R(), TODAY), 'claimable')
check('已領取 → claimed', rewardState(R({ my_claimed: true }), TODAY), 'claimed')
check('名額滿 → full', rewardState(R({ quota_total: 1, claimed_count: 1 }), TODAY), 'full')
check('過期 → expired', rewardState(R({ valid_to: '2026-09-01' }), TODAY), 'expired')
check('過期優先於未解鎖', rewardState(R({ unlocked: false, valid_to: '2026-09-01' }), TODAY), 'expired')
check('未到期 → claimable', rewardState(R({ valid_to: '2026-12-31' }), TODAY), 'claimable')

/* ── 門檻 ── */
check('取最低門檻', unlockThreshold([{ required_referrals: 10 }, { required_referrals: 5 }]), 5)
check('無券 → 預設 5', unlockThreshold([]), 5)

/* ── 邀請文字／鏈結 ── */
const text = inviteText('大姐', 'CE85-000001', 'https://x/#/login')
check('邀請文字含稱呼', text.includes('大姐您好'), true)
check('邀請文字含邀請人', text.includes('CE85-000001'), true)
check('邀請文字含連結', text.includes('https://x/#/login'), true)
check('無稱呼 → 您好', inviteText(null, 'CE85-000001', 'L').startsWith('您好，'), true)
check('inviteHref 8 位 → 852', inviteHref('91234567', 'hi').startsWith('https://wa.me/85291234567?text='), true)
check('inviteHref 無電話 → 分享', inviteHref(null, 'hi').startsWith('https://wa.me/?text='), true)
check('claim 文字含券名', defaultRewardClaimText('酒樓 $100 現金券').includes('酒樓 $100 現金券'), true)

console.log(`\n${pass}/${pass + fail} 通過`)
process.exit(fail ? 1 : 0)
