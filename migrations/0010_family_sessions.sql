-- CoEldery 家庭樹 — migration 0010
-- 新增 family_sessions 表：family_session cookie 機制（弱綁定漸進式乙方案）
--
-- 設計說明：
--   - token: 256-bit 隨機 hex（64 字元），由 POST /api/family/session 生成
--   - member_no: 85AI 側 CE85-XXXXXX（用於 audit / 未來 SSO 對應）
--   - local_member_id: 家庭樹本地 members.id（UUID），供 _currentMember.ts 直接回傳
--   - local_family_id: 家庭樹本地 families.id（UUID），避免 _currentMember 多查一次
--   - expires_at: ISO datetime string，與 admin_sessions / colinkery_sessions 慣例一致
--
-- 驗證流程（server side）：
--   SELECT * FROM family_sessions WHERE token=? AND expires_at > datetime('now')
--   → 搵到: 直接用 local_member_id + local_family_id，唔需要額外 JOIN
--   → 搵唔到 / 過期: fallback 返 is_self = 1 邏輯（向後兼容）
--
-- 此表唔加 FOREIGN KEY ON DELETE CASCADE（members/families 刪除唔自動清 session）
-- session 過期靠 expires_at 篩走，logout 靠 DELETE by token
--
-- ⚠️  本檔只供 --local 本機測試。
--     --remote migration 由產品負責人在自己終端執行，禁止 AI 執行 --remote。

CREATE TABLE IF NOT EXISTS family_sessions (
  token           TEXT PRIMARY KEY,
  member_no       TEXT NOT NULL,   -- 85AI CE85-XXXXXX（audit 用，弱綁定）
  local_member_id TEXT NOT NULL,   -- 家庭樹本地 members.id（UUID）
  local_family_id TEXT NOT NULL,   -- 家庭樹本地 families.id（UUID）
  expires_at      TEXT NOT NULL,   -- ISO datetime: "2026-10-08 12:00:00"
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_family_sessions_member ON family_sessions(member_no);
