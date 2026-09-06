-- CoEldery 家庭樹 — migration 0007
-- 新增商戶平台基礎 schema：地區三級（district_group / district / landmark）
-- 商戶分類 + 標籤（merchant_category / merchant_tag）
-- 商戶核心表（merchant）+ 商戶標籤多對多（merchant_tag_map）
-- 商業模式：本地曝光平台（詳見 .coappery/merchant_platform.md）
--   is_listed = 0/1  → 是否已繳付上架費（0=不顯示）
--   ad_tier   = 0/1/2 → 廣告層級（0=自然排位；1/2=付費靠前+贊助標示）
-- 線下收費，v1 app 內無金流；paid_note 作自由備註。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

-- ─────────────────────────────────────────────
-- 1. district_group — 區（港島 / 九龍 / 新界）
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS district_group (
  id         TEXT PRIMARY KEY,           -- 簡短固定 id，如 'hk-island'
  name       TEXT NOT NULL,              -- 顯示名，如 '港島'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 2. district — 地區（灣仔 / 觀塘 / 沙田 …）
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS district (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES district_group(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,              -- 如 '灣仔'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_district_group ON district (group_id);

-- ─────────────────────────────────────────────
-- 3. landmark — 地標（商場 / 街市 / 港鐵站 …）
--    用作「附近排序」定位點
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS landmark (
  id            TEXT PRIMARY KEY,
  district_id   TEXT NOT NULL REFERENCES district(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,           -- 如 '新城市廣場'
  landmark_type TEXT,                    -- 'mall' / 'market' / 'mtr' / 'other'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_landmark_district ON landmark (district_id);

-- ─────────────────────────────────────────────
-- 4. merchant_category — 主分類
--    sort_order 控制 UI 顯示次序
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_category (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,              -- 如 '飲食'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 5. merchant_tag — 子篩選標籤
--    category_id 可空（NULL = 跨分類通用標籤）
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_tag (
  id          TEXT PRIMARY KEY,
  category_id TEXT REFERENCES merchant_category(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,             -- 如 '茶餐廳'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_merchant_tag_category ON merchant_tag (category_id);

-- ─────────────────────────────────────────────
-- 6. merchant — 商戶核心表
--    is_listed = 0 → 完全不出現於 app
--    ad_tier   = 0 → 自然排位；1/2 → 付費排前（須標示「贊助」）
--    paid_note → 線下收費自由備註（如「已轉數快 2025-03」），金額不入獨立欄
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  landmark_id TEXT REFERENCES landmark(id) ON DELETE SET NULL,
  category_id TEXT REFERENCES merchant_category(id) ON DELETE SET NULL,
  is_listed   INTEGER NOT NULL DEFAULT 0, -- 0=未上架，1=已上架
  ad_tier     INTEGER NOT NULL DEFAULT 0, -- 0=只上架，1=廣告基礎，2=廣告置頂
  phone       TEXT,
  address     TEXT,
  description TEXT,
  photo_url   TEXT,
  paid_note   TEXT,                       -- 線下收費備註，自由格式
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_merchant_landmark   ON merchant (landmark_id);
CREATE INDEX IF NOT EXISTS idx_merchant_category   ON merchant (category_id);
CREATE INDEX IF NOT EXISTS idx_merchant_is_listed  ON merchant (is_listed);

-- ─────────────────────────────────────────────
-- 7. merchant_tag_map — 商戶 ↔ 標籤多對多
--    cascade delete：商戶或標籤刪除後，對應關係自動清除
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_tag_map (
  merchant_id TEXT NOT NULL REFERENCES merchant(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES merchant_tag(id) ON DELETE CASCADE,
  PRIMARY KEY (merchant_id, tag_id)
);

-- ═════════════════════════════════════════════
-- SEED 資料（示範用，方便 UI 開發；remote 環境由產品負責人決定是否重跑）
-- ═════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- Seed 1: district_group（3 筆）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO district_group (id, name) VALUES
  ('dg-hk-island', '港島'),
  ('dg-kowloon',   '九龍'),
  ('dg-nt',        '新界');

-- ─────────────────────────────────────────────
-- Seed 2: district（3 筆，每區 1 個示範）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO district (id, group_id, name) VALUES
  ('dt-wanchai',   'dg-hk-island', '灣仔'),
  ('dt-kwuntong',  'dg-kowloon',   '觀塘'),
  ('dt-shatin',    'dg-nt',        '沙田');

-- ─────────────────────────────────────────────
-- Seed 3: landmark（3 筆，每地區 1 個示範）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO landmark (id, district_id, name, landmark_type) VALUES
  ('lm-times-sq',   'dt-wanchai',  '時代廣場',       'mall'),
  ('lm-kwuntong-mtr','dt-kwuntong', '觀塘站',         'mtr'),
  ('lm-newtown-plz', 'dt-shatin',  '新城市廣場',     'mall');

-- ─────────────────────────────────────────────
-- Seed 4: merchant_category（6 筆，參 spec 第二節）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO merchant_category (id, name, sort_order) VALUES
  ('cat-food',     '飲食',       1),
  ('cat-health',   '醫療保健',   2),
  ('cat-home',     '家居服務',   3),
  ('cat-gift',     '禮品與花藝', 4),
  ('cat-funeral',  '殯儀與身後事', 5),
  ('cat-elderly',  '長者日常',   6);

-- ─────────────────────────────────────────────
-- Seed 5: merchant_tag（每分類 2–3 個示範，參 spec 第二節）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO merchant_tag (id, category_id, name) VALUES
  -- 飲食
  ('tag-cha-chaan', 'cat-food',    '茶餐廳'),
  ('tag-yumcha',    'cat-food',    '酒樓（點心）'),
  ('tag-delivery',  'cat-food',    '外賣到府'),
  -- 醫療保健
  ('tag-western-dr','cat-health',  '西醫'),
  ('tag-chinese-dr','cat-health',  '中醫'),
  ('tag-homevisit', 'cat-health',  '上門診療'),
  -- 家居服務
  ('tag-cleaning',  'cat-home',    '家居清潔'),
  ('tag-nursing',   'cat-home',    '居家護理'),
  -- 禮品與花藝
  ('tag-flower',    'cat-gift',    '鮮花'),
  ('tag-gift-box',  'cat-gift',    '節日禮盒'),
  -- 殯儀與身後事
  ('tag-funeral-svc','cat-funeral','殯儀服務'),
  ('tag-tribute',   'cat-funeral', '拜祭用品'),
  -- 長者日常
  ('tag-pharmacy',  'cat-elderly', '藥房'),
  ('tag-transport', 'cat-elderly', '接送服務');

-- ─────────────────────────────────────────────
-- Seed 6: merchant（3 筆示範商戶，涵蓋不同 ad_tier）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO merchant
  (id, name, landmark_id, category_id, is_listed, ad_tier, phone, address, description, paid_note)
VALUES
  -- 示範商戶 A：飲食類，觀塘，tier 0（自然排位）
  (
    'mc-cha-kwuntong',
    '觀塘大家姐茶餐廳',
    'lm-kwuntong-mtr',
    'cat-food',
    1,   -- is_listed = 已上架
    0,   -- ad_tier   = 自然排位
    '2345-6789',
    '九龍觀塘巧明街 88 號地下',
    '地道港式茶餐廳，提供早午晚餐，設無障礙座位，歡迎長者。',
    '2025-03 年費已收，轉數快確認'
  ),
  -- 示範商戶 B：醫療保健，灣仔，tier 1（廣告基礎，須標示「贊助」）
  (
    'mc-clinic-wanchai',
    '灣仔長青西醫診所',
    'lm-times-sq',
    'cat-health',
    1,   -- is_listed = 已上架
    1,   -- ad_tier   = 廣告基礎（贊助位，須標示 Sponsored）
    '2111-3333',
    '香港灣仔謝斐道 200 號 3 樓',
    '家庭科西醫，長者友善診所，可預約上門出診。',
    '2025-03 廣告 tier 1，已收廣告費'
  ),
  -- 示範商戶 C：殯儀，沙田，tier 2（廣告置頂，須標示「贊助」）
  (
    'mc-funeral-shatin',
    '沙田至誠殯儀服務',
    'lm-newtown-plz',
    'cat-funeral',
    1,   -- is_listed = 已上架
    2,   -- ad_tier   = 廣告置頂（贊助位，須標示 Sponsored）
    '2688-9900',
    '新界沙田石門安群街 3 號',
    '提供全程殯儀安排、法事統籌、遺體接送，24 小時服務。',
    '2025-03 廣告 tier 2 置頂，年費已收'
  );

-- ─────────────────────────────────────────────
-- Seed 7: merchant_tag_map（商戶掛標籤）
-- ─────────────────────────────────────────────
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES
  -- 觀塘茶餐廳 → 茶餐廳 + 外賣到府
  ('mc-cha-kwuntong',  'tag-cha-chaan'),
  ('mc-cha-kwuntong',  'tag-delivery'),
  -- 灣仔診所 → 西醫 + 上門診療
  ('mc-clinic-wanchai','tag-western-dr'),
  ('mc-clinic-wanchai','tag-homevisit'),
  -- 沙田殯儀 → 殯儀服務 + 拜祭用品
  ('mc-funeral-shatin','tag-funeral-svc'),
  ('mc-funeral-shatin','tag-tribute');
