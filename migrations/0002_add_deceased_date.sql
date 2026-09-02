-- CoEldery 85 家庭樹 — migration 0002
-- 新增 members.deceased_date 欄位
--
-- 守 Rule 19（記錄層 vs 顯示層分離）：
-- 離世成員只填 deceased_date，不 DELETE 記錄。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

ALTER TABLE members ADD COLUMN deceased_date TEXT;
