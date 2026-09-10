-- CoEldery 家庭樹 — migration 0014
-- 成長相簿 單向同步家庭圈：為項目記錄同步出嘅 posts.id，方便刪除時一併清理
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote（rules §19）。

ALTER TABLE growth_album_items ADD COLUMN synced_post_id TEXT;
