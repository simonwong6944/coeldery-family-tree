-- seed_kc_wong.sql — KC Wong 四代驗證資料
-- 結構：KC Wong(is_self=1) + 配偶 Mary
--   KC Wong 有兄弟 Simon Wong
--   子女代：Peter Wong + 配偶 Amy、Alice Wong
--   孫代：Tom Wong (Peter之子)、Emma Wong (Peter之女)
--   曾孫代：Jack Wong (Tom之子)

DELETE FROM relationships;
DELETE FROM members;
DELETE FROM families;

INSERT INTO families (id, name, created_at) VALUES
  ('fam-kc', 'KC Wong Family', '2024-01-01T00:00:00Z');

INSERT INTO members (id, family_id, display_name, member_kind, is_self, created_at) VALUES
  -- KC Wong 父母代
  ('kc-gp1',   'fam-kc', 'Robert Wong', 'person', 0, '2024-01-01T00:00:00Z'),
  ('kc-gp2',   'fam-kc', 'Helen Wong',  'person', 0, '2024-01-01T00:01:00Z'),
  -- KC Wong 同代（KC + 兄弟 Simon）
  ('kc-self',  'fam-kc', 'KC Wong',     'person', 1, '2024-01-01T00:02:00Z'),
  ('kc-wife',  'fam-kc', 'Mary Wong',   'person', 0, '2024-01-01T00:03:00Z'),
  ('kc-bro1',  'fam-kc', 'Simon Wong',  'person', 0, '2024-01-01T00:04:00Z'),
  -- 子女代（KC 的子女：Peter + Alice）
  ('kc-son1',  'fam-kc', 'Peter Wong',  'person', 0, '2024-01-01T00:05:00Z'),
  ('kc-dil1',  'fam-kc', 'Amy Wong',    'person', 0, '2024-01-01T00:06:00Z'),
  ('kc-dau1',  'fam-kc', 'Alice Wong',  'person', 0, '2024-01-01T00:07:00Z'),
  -- 孫代（Peter 的子女：Tom + Emma）
  ('kc-gs1',   'fam-kc', 'Tom Wong',    'person', 0, '2024-01-01T00:08:00Z'),
  ('kc-gs2',   'fam-kc', 'Emma Wong',   'person', 0, '2024-01-01T00:09:00Z'),
  -- 曾孫代（Tom 之子：Jack）
  ('kc-ggs1',  'fam-kc', 'Jack Wong',   'person', 0, '2024-01-01T00:10:00Z');

INSERT INTO relationships (id, family_id, from_member, to_member, edge_type) VALUES
  -- Robert + Helen 係夫婦
  ('r01', 'fam-kc', 'kc-gp1',  'kc-gp2',  'marriage'),
  -- Robert/Helen 係 KC 父母
  ('r02', 'fam-kc', 'kc-gp1',  'kc-self', 'parent_child'),
  ('r03', 'fam-kc', 'kc-gp2',  'kc-self', 'parent_child'),
  -- Robert/Helen 係 Simon 父母
  ('r04', 'fam-kc', 'kc-gp1',  'kc-bro1', 'parent_child'),
  ('r05', 'fam-kc', 'kc-gp2',  'kc-bro1', 'parent_child'),
  -- KC + Mary 係夫婦
  ('r06', 'fam-kc', 'kc-self', 'kc-wife', 'marriage'),
  -- KC/Mary 係 Peter 父母
  ('r07', 'fam-kc', 'kc-self', 'kc-son1', 'parent_child'),
  ('r08', 'fam-kc', 'kc-wife', 'kc-son1', 'parent_child'),
  -- KC/Mary 係 Alice 父母
  ('r09', 'fam-kc', 'kc-self', 'kc-dau1', 'parent_child'),
  ('r10', 'fam-kc', 'kc-wife', 'kc-dau1', 'parent_child'),
  -- Peter + Amy 係夫婦
  ('r11', 'fam-kc', 'kc-son1', 'kc-dil1', 'marriage'),
  -- Peter/Amy 係 Tom 父母
  ('r12', 'fam-kc', 'kc-son1', 'kc-gs1',  'parent_child'),
  ('r13', 'fam-kc', 'kc-dil1', 'kc-gs1',  'parent_child'),
  -- Peter/Amy 係 Emma 父母
  ('r14', 'fam-kc', 'kc-son1', 'kc-gs2',  'parent_child'),
  ('r15', 'fam-kc', 'kc-dil1', 'kc-gs2',  'parent_child'),
  -- Tom 係 Jack 父
  ('r16', 'fam-kc', 'kc-gs1',  'kc-ggs1', 'parent_child');
