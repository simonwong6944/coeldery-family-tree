-- 本機測試資料（--local 用；**唔可以**跑 --remote）
-- 用法：npx wrangler d1 execute coeldery-family-tree-db --local --file scripts/seed-local-test.sql
--
-- 供 scripts/test-gathering-e2e.mjs 同 scripts/test-promotions-e2e.mjs 用。
-- ⚠️ 開頭會**重設**推廣領取狀態，令推廣 E2E 可以重複執行。

-- ── 重設推廣／獎勵領取狀態（只影響本機測試資料）──
DELETE FROM promotion_claim;
UPDATE promotion SET claimed_count = 0;
DELETE FROM reward_claim;
UPDATE reward SET claimed_count = 0;
DELETE FROM referral;

-- ── 家庭 + 成員 + session（聚會 E2E）──
INSERT OR IGNORE INTO families (id, name) VALUES ('fam-test', '測試家庭');

INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, coeldery85_member_id, gender)
  VALUES ('m-self', 'fam-test', 'person', '測試本人', '900000001', 'male');
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, coeldery85_member_id, gender)
  VALUES ('m-dad', 'fam-test', 'person', '測試爸爸', NULL, 'male');
-- 第二位登入會員（測試「名額」同「一人一次」）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, coeldery85_member_id, gender)
  VALUES ('m-mom', 'fam-test', 'person', '測試媽媽', '900000002', 'female');

INSERT OR IGNORE INTO family_sessions (token, member_no, expires_at)
  VALUES ('testsession1234', '900000001', datetime('now', '+7 days'));
INSERT OR IGNORE INTO family_sessions (token, member_no, expires_at)
  VALUES ('testsession5678', '900000002', datetime('now', '+7 days'));

-- ── 節日推廣（節日 E2E）──
-- ① 名額不限、已上架商戶
INSERT OR IGNORE INTO promotion
  (id, merchant_id, festival_id, title, description, terms, quota_total, is_active)
  VALUES ('promo-mid-autumn-cha', 'mc-cha-kwuntong', 'mid-autumn-2026',
          '中秋家庭聚餐 9 折', '四人或以上訂枱可享 9 折', '須提前預約；不與其他優惠同時使用',
          NULL, 1);

-- ② 名額 1 個（測名額控管）
INSERT OR IGNORE INTO promotion
  (id, merchant_id, festival_id, title, description, quota_total, is_active)
  VALUES ('promo-mid-autumn-quota1', 'mc-clinic-wanchai', 'mid-autumn-2026',
          '中秋限量禮品包', '限量 1 名', 1, 1);

-- ③ 已停用（唔應該出現）
INSERT OR IGNORE INTO promotion
  (id, merchant_id, festival_id, title, quota_total, is_active)
  VALUES ('promo-inactive', 'mc-cha-kwuntong', 'mid-autumn-2026', '已停用優惠', NULL, 0);

-- ④ 未上架商戶嘅推廣（唔應該出現 —— 承商戶准入 is_listed）
INSERT OR IGNORE INTO merchant (id, name, category_id, is_listed, ad_tier, phone)
  VALUES ('mc-hidden-test', '未上架測試商戶', 'cat-food', 0, 2, '2000-0000');
INSERT OR IGNORE INTO promotion
  (id, merchant_id, festival_id, title, quota_total, is_active)
  VALUES ('promo-unlisted', 'mc-hidden-test', 'mid-autumn-2026', '未上架商戶優惠', NULL, 1);

-- ── 第三位登入會員（測「名額」用）──
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, coeldery85_member_id, gender)
  VALUES ('m-sis', 'fam-test', 'person', '測試姐姐', '900000003', 'female');
INSERT OR IGNORE INTO family_sessions (token, member_no, expires_at)
  VALUES ('testsession9999', '900000003', datetime('now', '+7 days'));

-- ── 推薦獎勵（Type B）測試資料 ──
-- 家人 B（900000002）：5 位成功加入 + 1 位待加入 → 已解鎖（required_referrals = 5）
INSERT OR IGNORE INTO referral (id, inviter_member_no, inviter_family_id, invitee_phone, invitee_name, invitee_member_no, status, joined_at)
  VALUES
    ('ref-b1', '900000002', 'fam-test', '91110001', '家人一', '900001001', 'joined', datetime('now')),
    ('ref-b2', '900000002', 'fam-test', '91110002', '家人二', '900001002', 'joined', datetime('now')),
    ('ref-b3', '900000002', 'fam-test', '91110003', '家人三', '900001003', 'joined', datetime('now')),
    ('ref-b4', '900000002', 'fam-test', '91110004', '家人四', '900001004', 'joined', datetime('now')),
    ('ref-b5', '900000002', 'fam-test', '91110005', '家人五', '900001005', 'joined', datetime('now')),
    ('ref-b6', '900000002', 'fam-test', '91110006', '家人六', NULL,       'invited', NULL);
-- 家人 C（900000003）：同樣已解鎖（測名額）
INSERT OR IGNORE INTO referral (id, inviter_member_no, inviter_family_id, invitee_phone, invitee_name, invitee_member_no, status, joined_at)
  VALUES
    ('ref-c1', '900000003', 'fam-test', '92220001', '親友一', '900002001', 'joined', datetime('now')),
    ('ref-c2', '900000003', 'fam-test', '92220002', '親友二', '900002002', 'joined', datetime('now')),
    ('ref-c3', '900000003', 'fam-test', '92220003', '親友三', '900002003', 'joined', datetime('now')),
    ('ref-c4', '900000003', 'fam-test', '92220004', '親友四', '900002004', 'joined', datetime('now')),
    ('ref-c5', '900000003', 'fam-test', '92220005', '親友五', '900002005', 'joined', datetime('now'));

-- 推薦獎勵券：① 名額不限 ② 名額 1（測名額控管）
INSERT OR IGNORE INTO reward
  (id, merchant_id, title, description, required_referrals, quota_total, is_active)
  VALUES
    ('reward-test-unlimited', 'mc-cha-kwuntong', '茶餐廳 $50 現金券', '滿 $200 減 $50', 5, NULL, 1),
    ('reward-test-quota1',    'mc-clinic-wanchai', '診所$30 折扣', '限量 1 名', 5, 1, 1);
