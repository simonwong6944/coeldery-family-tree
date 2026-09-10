-- CoEldery 家庭樹 — migration 0013
-- 成長相簿（每位成員含寵物一個；單一儲存；月曆式時間軸）
-- 依 product_decisions §二 / v1.6：人人皆有、一視同仁；不設動態 tab／專屬相簿
-- 依 rules §9（上傳先成功再寫 DB 嘅狀態機）、§21（每樹顯示位配額）
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote（rules §19）。

CREATE TABLE IF NOT EXISTS growth_album_items (
  id                   TEXT PRIMARY KEY,
  family_id            TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  subject_member_id    TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,  -- 相簿主人（人或寵物）
  media_kind           TEXT NOT NULL CHECK (media_kind IN ('photo','video')),
  url                  TEXT NOT NULL,            -- 已成功上傳之 URL（rules §9）
  poster_url           TEXT,                     -- 短片封面（可空）
  year                 INTEGER NOT NULL,         -- 掛喺對應年月（支援補錄舊相）
  month                INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  duration_seconds     INTEGER,                  -- 短片長度（秒）
  caption              TEXT,
  created_by_member_no TEXT,                     -- 上傳者 member_no
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_growth_album_subject
  ON growth_album_items(family_id, subject_member_id, year, month);
