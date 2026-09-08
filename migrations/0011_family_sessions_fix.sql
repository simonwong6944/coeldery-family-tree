-- migration: 0011_family_sessions_fix
-- 目的: 重建 family_sessions，改用 member_no 作唯一對應點
--       棄置 local_member_id / local_family_id（Task I-1 方案 B 殘留）
--       _currentMember.ts session 路徑改由 member_no → members.coeldery85_member_id 反查
--
-- ⚠️  本 migration 含破壞性 DROP TABLE。
--     --local:  可直接執行（測試階段，family_sessions cnt=0）
--     --remote: 由產品負責人手動確認後自行執行（npx wrangler d1 migrations apply <db> --remote）

DROP TABLE IF EXISTS family_sessions;

CREATE TABLE IF NOT EXISTS family_sessions (
  token      TEXT PRIMARY KEY,
  member_no  TEXT NOT NULL,   -- 85AI CE85-XXXXXX（唯一對應點；_currentMember 由此反查 members.coeldery85_member_id）
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_family_sessions_member ON family_sessions(member_no);
