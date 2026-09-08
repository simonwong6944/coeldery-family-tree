-- CoEldery 家庭樹 — migration 0012
-- 目的: 為 members 表加入家庭樹自身登入 + 電話唯一識別所需欄位
--
--   phone         — 電話，家庭樹唯一識別 key（人成員用；寵物留空）
--   password_hash — 家庭樹登入密碼，存 hash，唔存明文；首次登入時設定
--   nickname      — 家人點稱呼你嘅暱稱，首次登入自填
--
-- 設計說明：
--   - 個人身份資料（姓名、性別、出生年、狀態）留喺 85AI，
--     經 /api/member/verify 攞，唔複製到本表。
--   - birth_date、gender 已存在（0001/0004），唔重複加。
--   - phone partial unique index 只對 member_kind='person' AND phone IS NOT NULL 強制唯一，
--     寵物成員 phone 留空不受約束。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。
--     （rules.md §19）

-- ─────────────────────────────────────────────
-- 1. 新增欄位（SQLite 每句 ALTER 只加一欄）
-- ─────────────────────────────────────────────

-- 電話，家庭樹唯一識別 key（人成員用，寵物留空）
ALTER TABLE members ADD COLUMN phone TEXT;

-- 家庭樹登入密碼（存 hash，唔存明文；首次登入設定）
ALTER TABLE members ADD COLUMN password_hash TEXT;

-- 家人點稱呼你嘅暱稱（首次登入自填）
ALTER TABLE members ADD COLUMN nickname TEXT;

-- ─────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────

-- Partial unique index：只對人成員且電話非空強制唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_phone_unique
  ON members(phone)
  WHERE member_kind = 'person' AND phone IS NOT NULL;

-- 一般查詢 index（包含 NULL，方便 WHERE phone = ? 查詢）
CREATE INDEX IF NOT EXISTS idx_members_phone
  ON members(phone);
