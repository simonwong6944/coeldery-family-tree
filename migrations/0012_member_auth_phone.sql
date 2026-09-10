-- CoEldery 家庭樹 — migration 0012（已改寫）
-- 目的：家庭樹 PWA 自身登入憑證，per-member_no（一人一條，不論屬多少棵樹）
--
-- 【改寫說明】原 0012 將 phone / password_hash / nickname 加入 members(node) 表，
--   並對 phone 建全域 partial UNIQUE index。此舊方案在「一人多樹」下必然出錯：
--     - 密碼存 node → 同一人多棵樹各一 node，A 樹設密碼、B 樹為 null → 登入 LIMIT 1
--       隨機取到 null node → 鬼打牆。
--     - phone 全域 UNIQUE → 同一人想在第二棵樹建 node（填電話）→ 撞 UNIQUE →
--       誤報「此電話已登記」。
--   因產品確立「一人可屬多棵樹」（rules §20、product_decisions v1.4），且家庭樹
--   為獨立 PWA 需自身登入，故改為 per-member_no 認證表 member_auth。
--   此 migration 從未 apply 至任何 local / remote D1，改寫零風險。
--
-- 設計（乙-1，符合 rules §18 / §20）：
--   - 密碼、暱稱屬「人身認證資料」，以 member_no 為 key，全人共用一條
--   - 絕不存於 members(node) 表；node 一人多棵樹會 desync，故獨立成表
--   - member_no 對應 85AI CE85-XXXXXX，與 family_sessions.member_no 一致
--   - 電話不入家庭樹；登入時電話 → 85AI lookup → member_no（rules §18）
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote（rules §19）。

CREATE TABLE IF NOT EXISTS member_auth (
  member_no      TEXT PRIMARY KEY,                        -- CE85-XXXXXX，一人一條
  password_hash  TEXT NOT NULL,                           -- PBKDF2-SHA256，不存明文
  nickname       TEXT,                                    -- 家人暱稱，首次登入自填
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT
);
