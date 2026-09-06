-- CoEldery 家庭樹 — migration 0006
-- 新增成員自訂重要日子表：member_important_dates
-- label 存自訂名（例：結婚週年、入職、移民）
-- date  ISO YYYY-MM-DD
-- is_recurring  1 = 每年提醒，0 = 只提醒一次
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

CREATE TABLE IF NOT EXISTS member_important_dates (
  id           TEXT    PRIMARY KEY,
  member_id    TEXT    NOT NULL,
  label        TEXT    NOT NULL,
  date         TEXT    NOT NULL,
  is_recurring INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mid_member ON member_important_dates(member_id);
