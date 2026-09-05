-- CoEldery 85 家庭樹 — migration 0005
-- 新增家庭圈落貼文功能三個表：posts、post_comments、post_likes
-- 貼文作者第一版由 API 以 is_self member 頂住，將來接認證層。
-- 相片 URL 存 Cloudinary URL，由前端上傳後回填。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

-- ─────────────────────────────────────────────
-- 1. posts — 家庭圈落貼文
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id               TEXT PRIMARY KEY,                                     -- nanoid（由 API 層生成）
  family_id        TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  author_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE, -- 貼文作者；第一版用 is_self member
  body_text        TEXT,                                                 -- 貼文文字，可為 NULL
  photo_url        TEXT,                                                 -- Cloudinary URL，可為 NULL
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 2. post_comments — 留言
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id               TEXT PRIMARY KEY,
  post_id          TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────
-- 3. post_likes — 讚
--    UNIQUE(post_id, member_id) 確保一人一 post 只讚一次
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_likes (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,  -- 邊個讚
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (post_id, member_id)
);

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_posts_family_created
  ON posts (family_id, created_at);

CREATE INDEX IF NOT EXISTS idx_post_comments_post
  ON post_comments (post_id);

CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON post_likes (post_id);
