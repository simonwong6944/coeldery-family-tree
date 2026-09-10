-- 本機測試資料（--local 用；**唔可以**跑 --remote）
-- 用法：npx wrangler d1 execute coeldery-family-tree-db --local --file scripts/seed-local-test.sql
--
-- 供 scripts/test-gathering-e2e.mjs 同 scripts/test-promotions-e2e.mjs 用。
-- ⚠️ 開頭會**重設**推廣領取狀態，令推廣 E2E 可以重複執行。

-- ── 重設推廣領取狀態（只影響本機測試資料）──
DELETE FROM promotion_claim;
UPDATE promotion SET claimed_count = 0;

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
