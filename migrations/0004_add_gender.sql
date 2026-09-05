-- CoEldery 85 家庭樹 — migration 0004
-- 新增 members.gender 欄位：'male' | 'female' | NULL(未設定)
-- 現有成員一律 default NULL，之後由產品負責人於各人 profile 手動補填。
--
-- ⚠️ 本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

ALTER TABLE members ADD COLUMN gender TEXT
  CHECK (gender IN ('male','female') OR gender IS NULL);
