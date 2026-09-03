-- seed_4g.sql — 細步 4g 驗證用樣本資料
-- 家庭結構：
--   祖父母代：陳榮光 + 梁玉蘭
--   本人同代：陳大文(is_self=1) + 配偶李秀英，兄弟陳大雄，兄弟陳大偉
--   子女代：陳志明(大文之子) + 配偶王美玲，陳嘉儀(大文之女)
--   孫輩：陳嘉俊(志明之子)
--   寵物：Lucky(大文+秀英的寵物犬)

-- 清除舊資料（順序：relationships → members → families）
DELETE FROM relationships;
DELETE FROM members;
DELETE FROM families;

-- ── families ──
INSERT INTO families (id, name, created_at) VALUES
  ('fam-001', '陳家', '2024-01-01T00:00:00Z');

-- ── members ──
INSERT INTO members (id, family_id, display_name, member_kind, is_self, created_at) VALUES
  -- 祖父母代
  ('gp-1',     'fam-001', '陳榮光', 'person', 0, '2024-01-01T00:00:00Z'),
  ('gp-2',     'fam-001', '梁玉蘭', 'person', 0, '2024-01-01T00:01:00Z'),
  -- 本人同代（3 兄弟 + 大文配偶）
  ('m-self',   'fam-001', '陳大文', 'person', 1, '2024-01-01T00:02:00Z'),
  ('m-wife',   'fam-001', '李秀英', 'person', 0, '2024-01-01T00:03:00Z'),
  ('m-bro1',   'fam-001', '陳大雄', 'person', 0, '2024-01-01T00:04:00Z'),
  ('m-bro2',   'fam-001', '陳大偉', 'person', 0, '2024-01-01T00:05:00Z'),
  -- 子女代
  ('c-son1',   'fam-001', '陳志明', 'person', 0, '2024-01-01T00:06:00Z'),
  ('c-dil1',   'fam-001', '王美玲', 'person', 0, '2024-01-01T00:07:00Z'),
  ('c-dau1',   'fam-001', '陳嘉儀', 'person', 0, '2024-01-01T00:08:00Z'),
  -- 孫輩
  ('g-gs1',    'fam-001', '陳嘉俊', 'person', 0, '2024-01-01T00:09:00Z'),
  -- 寵物
  ('pet-lucky','fam-001', 'Lucky',  'pet',    0, '2024-01-01T00:10:00Z');

-- ── relationships ──
-- 祖父母婚姻
INSERT INTO relationships (id, family_id, from_member, to_member, edge_type, status) VALUES
  ('rel-01', 'fam-001', 'gp-1', 'gp-2', 'marriage', 'current');

-- 祖父母 → 本人同代三兄弟
INSERT INTO relationships (id, family_id, from_member, to_member, edge_type) VALUES
  ('rel-02', 'fam-001', 'gp-1', 'm-self', 'parent_child'),
  ('rel-03', 'fam-001', 'gp-2', 'm-self', 'parent_child'),
  ('rel-04', 'fam-001', 'gp-1', 'm-bro1', 'parent_child'),
  ('rel-05', 'fam-001', 'gp-2', 'm-bro1', 'parent_child'),
  ('rel-06', 'fam-001', 'gp-1', 'm-bro2', 'parent_child'),
  ('rel-07', 'fam-001', 'gp-2', 'm-bro2', 'parent_child');

-- 本人婚姻
INSERT INTO relationships (id, family_id, from_member, to_member, edge_type, status) VALUES
  ('rel-08', 'fam-001', 'm-self', 'm-wife', 'marriage', 'current');

-- 本人+配偶 → 子女
INSERT INTO relationships (id, family_id, from_member, to_member, edge_type) VALUES
  ('rel-09', 'fam-001', 'm-self', 'c-son1', 'parent_child'),
  ('rel-10', 'fam-001', 'm-wife', 'c-son1', 'parent_child'),
  ('rel-11', 'fam-001', 'm-self', 'c-dau1', 'parent_child'),
  ('rel-12', 'fam-001', 'm-wife', 'c-dau1', 'parent_child');

-- 志明婚姻
INSERT INTO relationships (id, family_id, from_member, to_member, edge_type, status) VALUES
  ('rel-13', 'fam-001', 'c-son1', 'c-dil1', 'marriage', 'current');

-- 志明+美玲 → 孫兒
INSERT INTO relationships (id, family_id, from_member, to_member, edge_type) VALUES
  ('rel-14', 'fam-001', 'c-son1', 'g-gs1', 'parent_child'),
  ('rel-15', 'fam-001', 'c-dil1', 'g-gs1', 'parent_child');

-- 寵物主人（大文 + 秀英 共同主人）
INSERT INTO relationships (id, family_id, from_member, to_member, edge_type) VALUES
  ('rel-16', 'fam-001', 'm-self', 'pet-lucky', 'pet_owner'),
  ('rel-17', 'fam-001', 'm-wife', 'pet-lucky', 'pet_owner');
