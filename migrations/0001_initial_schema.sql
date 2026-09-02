-- CoEldery 85 家庭樹 — D1 初始 Schema
-- migration: 0001_initial_schema
-- 適用對象: coeldery-family-tree-db (binding = DB)
-- 範圍: family tree 自身資料，不包含 CoEldery 85 會員系統
-- 關係模型: edge-based，跟足 rules.md §20 及 product_decisions.md §3.1
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

-- ─────────────────────────────────────────────
-- 1. families — 每棵家族樹
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS families (
  id         TEXT PRIMARY KEY,           -- nanoid / UUID（由 API 層生成）
  name       TEXT NOT NULL,              -- 家族樹名稱，例如「陳家」
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 2. members — 成員節點（人成員 + 寵物成員）
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id           TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_kind  TEXT NOT NULL CHECK (member_kind IN ('person','pet')),
  display_name TEXT NOT NULL,            -- 姓名 / 寵物名稱
  birth_date   TEXT,                     -- ISO 8601 date，可為 null
  avatar_url   TEXT,                     -- 預留：Cloudflare R2 URL
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  -- 預留 CoEldery 85 SSO 接入欄（階段二填充）
  coeldery85_member_id TEXT              -- null 直至階段二接駁 85 SSO
);

CREATE INDEX IF NOT EXISTS idx_members_family_id ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_members_kind ON members(family_id, member_kind);

-- ─────────────────────────────────────────────
-- 3. relationships — 關係邊（edge-based 模型）
-- ─────────────────────────────────────────────
-- edge_type:
--   parent_child  — 親子關係（生父母、養父母、繼父母）
--   marriage      — 婚姻關係（含已離婚、喪偶、分居）
--   pet_owner     — 寵物與主人
--
-- relation_type（適用 parent_child）:
--   biological / adopted / step / null（marriage/pet_owner 不適用）
--
-- status（適用 marriage）:
--   current / divorced / widowed / separated / null（其他 edge_type 不適用）
--
-- 設計原則（v1.4 邊為本）：
--   - 同一對 (from_member, to_member, edge_type) 只允許一筆 active edge
--   - from_member → parent，to_member → child（parent_child）
--   - from_member → 主人，to_member → 寵物（pet_owner）
--   - marriage 邊雙向意義相同，從 id 小者 → 大者以保唯一性（應用層強制）
CREATE TABLE IF NOT EXISTS relationships (
  id            TEXT PRIMARY KEY,
  family_id     TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  from_member   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member     TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  edge_type     TEXT NOT NULL CHECK (edge_type IN ('parent_child','marriage','pet_owner')),
  relation_type TEXT CHECK (relation_type IN ('biological','adopted','step') OR relation_type IS NULL),
  status        TEXT CHECK (status IN ('current','divorced','widowed','separated') OR status IS NULL),
  start_date    TEXT,                    -- ISO 8601 date，婚姻起始日／認養日
  end_date      TEXT,                    -- ISO 8601 date，婚姻終止日（離婚/喪偶）
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (from_member != to_member)
);

CREATE INDEX IF NOT EXISTS idx_rel_family     ON relationships(family_id);
CREATE INDEX IF NOT EXISTS idx_rel_from       ON relationships(from_member);
CREATE INDEX IF NOT EXISTS idx_rel_to         ON relationships(to_member);
CREATE INDEX IF NOT EXISTS idx_rel_edge_type  ON relationships(family_id, edge_type);
