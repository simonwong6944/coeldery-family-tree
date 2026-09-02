-- CoEldery 85 家庭樹 — migration 0003
-- 新增 members.is_self 欄位：標記誰是「本人」
--
-- 全 family 只可有一個 is_self=1，由 PATCH /api/members/:id { is_self:1 } 維護。
-- 改 is_self 時 API 負責先將同 family 其他成員設回 0。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

ALTER TABLE members ADD COLUMN is_self INTEGER NOT NULL DEFAULT 0;
