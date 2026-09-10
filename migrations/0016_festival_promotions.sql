-- CoEldery 家庭樹 — migration 0016
-- 節日推廣券（family_gather.md §6 雙動作；product_decisions v1.11）
--   ① festival       — 節日曆（推廣嘅「對象場合」）
--   ② promotion      — 商戶節日推廣（**必須綁節日**，唔可以綁個人生日）
--   ③ promotion_claim — 領取紀錄（會員識別＝member_no；一人一推廣一次）
--   ④ gathering.festival_id — 聚會帶住節日 context，令揀商戶時見到該節日推廣
--
-- ⚠️ 忌辰（莊重場合）一律唔出推廣（rules §23）：由 API 擋，唔靠 UI。
-- ⚠️ 此表之節日日期為**建議值**，須由產品負責人按當年公佈核實後更新（每年更新一次）。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote（rules §19）。

-- ─────────────────────────────────────────────
-- 1. festival — 節日曆（id 帶年份，例：mid-autumn-2026）
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS festival (
  id          TEXT PRIMARY KEY,              -- 'mid-autumn-2026'
  name        TEXT NOT NULL,                 -- '中秋節'
  date        TEXT NOT NULL,                 -- YYYY-MM-DD（當年實際日期）
  is_lunar    INTEGER NOT NULL DEFAULT 0,    -- 1 = 農曆節日（每年日期浮動）
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 2. promotion — 商戶節日推廣（每次推廣必須指明一個節日）
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion (
  id            TEXT PRIMARY KEY,
  merchant_id   TEXT NOT NULL REFERENCES merchant(id) ON DELETE CASCADE,
  festival_id   TEXT NOT NULL REFERENCES festival(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,               -- '中秋家庭聚餐 9 折'
  description   TEXT,
  terms         TEXT,                        -- 條款（由商戶提供）
  quota_total   INTEGER,                     -- NULL = 不限
  claimed_count INTEGER NOT NULL DEFAULT 0,
  valid_from    TEXT,                        -- YYYY-MM-DD（可空）
  valid_to      TEXT,                        -- YYYY-MM-DD（可空）
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_promotion_festival ON promotion (festival_id, is_active);
CREATE INDEX IF NOT EXISTS idx_promotion_merchant ON promotion (merchant_id);

-- ─────────────────────────────────────────────
-- 3. promotion_claim — 領取紀錄（平台掌握；核銷由商戶線下自行）
--    UNIQUE(promotion_id, member_no) → 一人一推廣只可領一次
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion_claim (
  id            TEXT PRIMARY KEY,
  promotion_id  TEXT NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
  member_no     TEXT NOT NULL,
  family_id     TEXT,
  status        TEXT NOT NULL DEFAULT 'claimed',   -- claimed | cancelled
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (promotion_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_promotion_claim_member ON promotion_claim (member_no);

-- ─────────────────────────────────────────────
-- 4. gathering 加 festival_id（節日聚會帶住 context → 揀商戶時出該節日推廣）
-- ─────────────────────────────────────────────
ALTER TABLE gathering ADD COLUMN festival_id TEXT;

-- ─────────────────────────────────────────────
-- 5. SEED：香港公眾／家庭節日 2026（建議值，須由產品負責人核實）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO festival (id, name, date, is_lunar, sort_order) VALUES
  ('lunar-new-year-2026', '農曆新年',   '2026-02-17', 1, 1),
  ('spring-lantern-2026', '元宵節',     '2026-03-03', 1, 2),
  ('ching-ming-2026',     '清明節',     '2026-04-05', 0, 3),
  ('mothers-day-2026',    '母親節',     '2026-05-10', 0, 4),
  ('dragon-boat-2026',    '端午節',     '2026-06-19', 1, 5),
  ('fathers-day-2026',    '父親節',     '2026-06-21', 0, 6),
  ('mid-autumn-2026',     '中秋節',     '2026-09-25', 1, 7),
  ('chung-yeung-2026',    '重陽節',     '2026-10-18', 1, 8),
  ('winter-solstice-2026','冬至',       '2026-12-22', 1, 9),
  ('christmas-2026',      '聖誕節',     '2026-12-25', 0, 10);
