-- CoEldery 家庭樹 — migration 0015
-- 家庭聚會協作（family_gather.md §5）：聚會主體 + 候選項（日期／地點／蛋糕／禮物）+ 逐人投票
-- 依 §5.3 schema 方向落地；實作時依 §5.3【待定】補上 kind（項目類型）／取貨 / 負責人欄位。
-- 商戶一律引用現有 merchant 表（§1：不新建商戶 schema）。
-- §7 忌辰硬攔截：memorial 場合不可發起聚會（由 API 擋，非靠 UI）。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote（rules §19）。

-- ─────────────────────────────────────────────
-- 1. gathering — 聚會主體
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gathering (
  id                   TEXT PRIMARY KEY,
  family_id            TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  initiator_member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,  -- 發起人
  title                TEXT NOT NULL,                     -- 例：'爸爸 80 大壽'
  occasion_type        TEXT NOT NULL,                     -- birthday|pet_birthday|anniversary|milestone|festival|other
  subject_member_id    TEXT REFERENCES members(id) ON DELETE SET NULL,  -- 為邊個安排（可空）
  target_date          TEXT,                              -- 由提醒帶入之目標日期（YYYY-MM-DD）
  status               TEXT NOT NULL DEFAULT 'draft',
  note                 TEXT,
  invite_post_id       TEXT,                              -- 同步出嘅家庭圈邀請卡 posts.id
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 2. gathering_option — 候選項（日期／地點／蛋糕／禮物）
--    同一個聚會可同時有多個 kind，每個 kind 可有 1..N 個候選
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gathering_option (
  id                    TEXT PRIMARY KEY,
  gathering_id          TEXT NOT NULL REFERENCES gathering(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL,                    -- date|place|cake|gift
  label                 TEXT NOT NULL,                    -- 顯示名（商戶名／自訂名）
  merchant_id           TEXT REFERENCES merchant(id) ON DELETE SET NULL,  -- 可空（自訂項）
  option_date           TEXT,                             -- date 候選日 / 蛋糕取貨日
  option_time           TEXT,                             -- HH:MM
  pickup_place          TEXT,                             -- 蛋糕／禮物取貨／交收地點
  assignee_member_id    TEXT REFERENCES members(id) ON DELETE SET NULL,  -- 邊個負責
  status                TEXT NOT NULL DEFAULT 'candidate',-- candidate|confirmed|dropped
  note                  TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_by_member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 3. gathering_vote — 逐人投票／RSVP（每人一項一票）
--    身份＝登入者 primaryMemberId（per-member 登入已解鎖，故階段二可即做）
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gathering_vote (
  id               TEXT PRIMARY KEY,
  gathering_id     TEXT NOT NULL REFERENCES gathering(id) ON DELETE CASCADE,
  option_id        TEXT NOT NULL REFERENCES gathering_option(id) ON DELETE CASCADE,
  voter_member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  choice           TEXT NOT NULL DEFAULT 'yes',           -- yes|no|maybe
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (option_id, voter_member_id)
);

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gathering_family
  ON gathering (family_id, created_at);

CREATE INDEX IF NOT EXISTS idx_gathering_option_gathering
  ON gathering_option (gathering_id, kind, sort_order);

CREATE INDEX IF NOT EXISTS idx_gathering_vote_option
  ON gathering_vote (option_id);

CREATE INDEX IF NOT EXISTS idx_gathering_vote_gathering
  ON gathering_vote (gathering_id);
