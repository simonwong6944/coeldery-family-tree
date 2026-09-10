-- ============================================================
-- Phase 0 — 生產 D1 只讀驗證（零改動）
-- 用途：確認 member_auth / family_sessions / members 真實 schema，
--       判斷登入鬼打牆嘅根因同會唔會撞 NOT NULL。
--
-- 執行（由產品負責人本人跑，rules §19）：
--   npx wrangler d1 execute coeldery-family-tree-db --remote --file phase0_db_check.sql
--
-- ⚠️ 本檔只含 SELECT / PRAGMA，絕無 INSERT / UPDATE / DELETE / DROP。
--    輸出請原樣貼返，唔好加工。
-- ============================================================

-- [1] family_sessions 表定義
--     睇有冇 local_member_id / local_family_id：
--       有（NOT NULL）→ 舊 0010 版，login/enter INSERT 3 欄會 500
--       冇            → 新 0011 版，正常
SELECT '=== [1] family_sessions schema ===' AS section;
SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'family_sessions';

-- [2] family_sessions 現有列數（總數 / 未過期）
SELECT '=== [2] family_sessions rows ===' AS section;
SELECT COUNT(*) AS total_sessions,
       SUM(CASE WHEN expires_at > datetime('now') THEN 1 ELSE 0 END) AS active_sessions
FROM family_sessions;

-- [3] member_auth 表定義（新認證表；唔存在 = migration 0012 未 apply）
SELECT '=== [3] member_auth schema ===' AS section;
SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'member_auth';

-- [4] member_auth 有幾多條記錄（0 = 從未有任何用戶成功設定密碼）
SELECT '=== [4] member_auth rows ===' AS section;
SELECT COUNT(*) AS member_auth_cnt FROM member_auth;

-- [5] members 表實際欄位
--     ⚠️ 特別睇有冇 phone / password_hash / nickname
--        （migration 0012 改寫後已冇建呢三欄；若存在代表係手動 ALTER 加）
SELECT '=== [5] members columns ===' AS section;
PRAGMA table_info(members);

-- [6] members 索引（睇 phone 有冇殘留 UNIQUE index）
SELECT '=== [6] members indexes ===' AS section;
SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'members';

-- [7] person 節點統計（總數 / 有 coeldery85_member_id 嘅數）
SELECT '=== [7] members stats ===' AS section;
SELECT COUNT(*) AS person_nodes,
       SUM(CASE WHEN coeldery85_member_id IS NOT NULL AND coeldery85_member_id <> '' THEN 1 ELSE 0 END) AS with_member_no
FROM members
WHERE member_kind = 'person';

-- [8] families 清單（睇有幾棵樹、邊棵 created_at 最早）
--     對照 members.ts 目前「ORDER BY created_at ASC LIMIT 1」會揀中邊棵
SELECT '=== [8] families ===' AS section;
SELECT id, name, created_at FROM families ORDER BY created_at ASC;

-- [9] 已套用嘅 migration（確認 0002–0012 齊唔齊）
SELECT '=== [9] d1_migrations ===' AS section;
SELECT name FROM d1_migrations ORDER BY id;
