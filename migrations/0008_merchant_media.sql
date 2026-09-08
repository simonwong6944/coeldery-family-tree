-- CoEldery 家庭樹 — migration 0008
-- 為 merchant 表新增媒體／聯絡欄位（whatsapp / map_url / banner_url / video_url / poster_url）
-- 用途說明：
--   whatsapp   — WhatsApp 聯絡號碼，前端砌 https://wa.me/<號碼> 直接開啟對話
--   map_url    — 商戶提供嘅 Google Map 連結，前端「睇地圖」掣直接開
--   banner_url — 全屏商戶卡用嘅直度大圖（9:16），與縮圖 photo_url 分開存放
--   video_url  — 全屏短片（將來接 Cloudflare Stream），v1 前端未用，先預埋
--   poster_url — 短片封面圖（video 未 load 完前顯示），配 video_url 使用
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

-- ─────────────────────────────────────────────
-- 1. 為 merchant 表新增五條欄位
--    SQLite / D1 唔支援一句 ALTER 加多條欄，必須逐條執行
--    全部 nullable（唔加 NOT NULL / DEFAULT），保持向下兼容
-- ─────────────────────────────────────────────

-- WhatsApp 聯絡號碼，存純數字含國碼（如 85298765432），前端砌 https://wa.me/ 開對話
ALTER TABLE merchant ADD COLUMN whatsapp TEXT;

-- 商戶提供嘅 Google Map 連結，前端「睇地圖」掣直接開
ALTER TABLE merchant ADD COLUMN map_url TEXT;

-- 全屏商戶卡用嘅直度大圖（9:16 比例），與細張 photo_url 分開存放
ALTER TABLE merchant ADD COLUMN banner_url TEXT;

-- 全屏短片（將來接 Cloudflare Stream），v1 前端未用，先預埋留空
ALTER TABLE merchant ADD COLUMN video_url TEXT;

-- 短片封面圖（video 未 load 完前顯示），配 video_url 使用
ALTER TABLE merchant ADD COLUMN poster_url TEXT;

-- ═════════════════════════════════════════════
-- 2. 為三間現有 seed 商戶補填示範值
--    用 UPDATE（商戶已存在，唔用 INSERT OR IGNORE）
--    video_url / poster_url 維持 NULL（預埋，v1 暫不填）
-- ═════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Seed 補值 A：觀塘大家姐茶餐廳（mc-cha-kwuntong）
-- ─────────────────────────────────────────────
UPDATE merchant SET
  whatsapp   = '85223456789',
  map_url    = 'https://www.google.com/maps/search/?api=1&query=%E4%B9%9D%E9%BE%8D%E8%A7%80%E5%A1%98%E5%B7%A7%E6%98%8E%E8%A1%9788%E8%99%9F%E5%9C%B0%E4%B8%8B',
  banner_url = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=720&q=80'
WHERE id = 'mc-cha-kwuntong';

-- ─────────────────────────────────────────────
-- Seed 補值 B：灣仔長青西醫診所（mc-clinic-wanchai）
-- ─────────────────────────────────────────────
UPDATE merchant SET
  whatsapp   = '85221113333',
  map_url    = 'https://www.google.com/maps/search/?api=1&query=%E9%A6%99%E6%B8%AF%E7%81%A3%E4%BB%94%E8%AC%9D%E6%96%90%E9%81%93200%E8%99%9F3%E6%A8%93',
  banner_url = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=720&q=80'
WHERE id = 'mc-clinic-wanchai';

-- ─────────────────────────────────────────────
-- Seed 補值 C：沙田至誠殯儀服務（mc-funeral-shatin）
--   banner_url 選用莊重素色圖片，避免不當視覺內容
-- ─────────────────────────────────────────────
UPDATE merchant SET
  whatsapp   = '85226889900',
  map_url    = 'https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E7%95%8C%E6%B2%99%E7%94%B0%E7%9F%B3%E9%96%80%E5%AE%89%E7%BE%A4%E8%A1%973%E8%99%9F',
  banner_url = 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=720&q=80'
WHERE id = 'mc-funeral-shatin';
