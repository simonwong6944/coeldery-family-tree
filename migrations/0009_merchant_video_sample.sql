-- ==========================================================================
-- Migration 0009 — 商戶影片 sample：為本地測試注入公開測試片
-- ==========================================================================
-- 本檔只供 --local 本地開發測試。
-- --remote 正式環境由產品負責人手動執行（不得由 AI 代為執行遠端指令）。
--
-- 用途：
--   為 tier 0 商戶 mc-cha-kwuntong（觀塘大家姐茶餐廳）填入一條公開
--   Google Cloud Storage 測試片，令「我的推薦」全屏流可在本地驗收
--   影片自動播放功能（入畫播、掃走停）。
--
-- 影片來源：
--   Google Public Test Videos Bucket（commondatastorage.googleapis.com/gtv-videos-bucket）
--   此為官方公開 hotlink 測試用途檔案，非真實商戶內容。
--   將來換真片只需再執行一次：
--     UPDATE merchant SET video_url = '真實影片 URL' WHERE id = 'mc-cha-kwuntong';
--
-- poster_url 留 NULL → 前端會 fallback 用 banner_url 做封面（已於 0008 填入 Unsplash 圖）。
-- ==========================================================================

UPDATE merchant
SET    video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
WHERE  id = 'mc-cha-kwuntong';
