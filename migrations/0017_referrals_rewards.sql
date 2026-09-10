-- CoEldery 家庭樹 — migration 0017
-- 推薦獎勵券（Type B）—— family_gather.md §6／§8 推薦飛輪；product_decisions v1.12
--   ① referral     — 推薦紀錄（邊個邀請邊個；對方**成功加入**才計數）
--   ② reward       — 推薦獎勵券（商戶提供；唔綁節日，綁「成功推薦人數」required_referrals）
--   ③ reward_claim — 領取紀錄（一人一張一次）
--
-- 定位：Type A = 節日推廣券（`promotion`，綁節日、名額限量）
--       Type B = 推薦獎勵券（`reward`，綁「成功推薦 N 位家人」，達標可自選）
--       兩者共用同一套「雙動作」領取 UX（平台記錄領取 ＋ 一鍵 WhatsApp 向商戶確認，零金流）。
--
-- ⚠️ 忌辰等莊重場合一律唔顯示優惠（rules §23）。
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote（rules §19）。

-- ─────────────────────────────────────────────
-- 1. referral — 推薦紀錄
--    UNIQUE(inviter_member_no, invitee_phone) → 同一人唔可以重複邀請同一號碼
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral (
  id                TEXT PRIMARY KEY,
  inviter_member_no TEXT NOT NULL,                  -- 邀請人（登入會員）
  inviter_family_id TEXT,
  invitee_phone     TEXT NOT NULL,                  -- 8 位數字（去 852）
  invitee_name      TEXT,                           -- 邀請時填嘅稱呼（可空）
  invitee_member_no TEXT,                           -- 對方成功加入後回填
  status            TEXT NOT NULL DEFAULT 'invited',-- invited | joined
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  joined_at         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_inviter_phone
  ON referral (inviter_member_no, invitee_phone);

CREATE INDEX IF NOT EXISTS idx_referral_phone
  ON referral (invitee_phone);

-- ─────────────────────────────────────────────
-- 2. reward — 推薦獎勵券（Type B）
--    required_referrals：解鎖需要幾多位「成功加入」嘅家人
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward (
  id                  TEXT PRIMARY KEY,
  merchant_id         TEXT NOT NULL REFERENCES merchant(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  terms               TEXT,
  required_referrals  INTEGER NOT NULL,             -- 例：5
  quota_total         INTEGER,                      -- NULL = 不限
  claimed_count       INTEGER NOT NULL DEFAULT 0,
  valid_to            TEXT,
  is_active           INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reward_active ON reward (is_active, required_referrals);

-- ─────────────────────────────────────────────
-- 3. reward_claim — 領取紀錄
--    UNIQUE(reward_id, member_no) → 一人一張一次
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_claim (
  id          TEXT PRIMARY KEY,
  reward_id   TEXT NOT NULL REFERENCES reward(id) ON DELETE CASCADE,
  member_no   TEXT NOT NULL,
  family_id   TEXT,
  status      TEXT NOT NULL DEFAULT 'claimed',      -- claimed | cancelled
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reward_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_reward_claim_member ON reward_claim (member_no);
