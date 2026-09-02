-- seed_4f.sql — Task 4f 驗證樣本樹
-- 樹結構：
--   曾祖父 Great (單身)
--       └── 祖父 Grandpa ──婚── 祖母 Grandma（配偶卡）
--                 ├── 伯父 Simon ──婚── Cindy（配偶卡，primary=Simon）
--                 │           └── 孫女 Lily
--                 └── 姑媽 Aunt（光身，兄弟姊妹共享祖父母）
--
-- 驗證點：
--   (a) Great → Grandpa（獨立連線，Grandpa 光身定位）
--   (b) Grandpa/Grandma → Simon（配偶卡 primary 起點），Grandpa/Grandma → Aunt（分叉）
--   (c) Simon → Lily（配偶卡 primary 半邊），Cindy 側無子女
--   (d)(e) scroll/resize 後連線對準

-- ─── families ───
INSERT OR IGNORE INTO families (id, name)
VALUES ('fam001', '測試家族');

-- ─── members ───
-- 曾祖父（level -2 相對 Simon）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, is_self)
VALUES ('great001', 'fam001', 'person', '曾祖父 Great', 0);

-- 祖父（level -1）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, is_self)
VALUES ('grandpa001', 'fam001', 'person', '祖父 Grandpa', 0);

-- 祖母（level -1，與 Grandpa 配偶）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, is_self)
VALUES ('grandma001', 'fam001', 'person', '祖母 Grandma', 0);

-- Simon（level 0，is_self=1，為 BFS 錨點）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, is_self)
VALUES ('simon001', 'fam001', 'person', 'Simon', 1);

-- Cindy（level 0，Simon 的配偶）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, is_self)
VALUES ('cindy001', 'fam001', 'person', 'Cindy', 0);

-- 姑媽 Aunt（level 0，Simon 的兄弟姊妹）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, is_self)
VALUES ('aunt001', 'fam001', 'person', '姑媽 Aunt', 0);

-- 孫女 Lily（level 1）
INSERT OR IGNORE INTO members (id, family_id, member_kind, display_name, is_self)
VALUES ('lily001', 'fam001', 'person', '孫女 Lily', 0);

-- ─── relationships ───

-- 曾祖父 → 祖父（parent_child）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type)
VALUES ('rel001', 'fam001', 'great001', 'grandpa001', 'parent_child');

-- 祖父 ↔ 祖母（marriage）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type, status)
VALUES ('rel002', 'fam001', 'grandpa001', 'grandma001', 'marriage', 'current');

-- 祖父 → Simon（parent_child）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type)
VALUES ('rel003', 'fam001', 'grandpa001', 'simon001', 'parent_child');

-- 祖母 → Simon（parent_child，共兩條父母邊 → Simon 有兩個父母）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type)
VALUES ('rel004', 'fam001', 'grandma001', 'simon001', 'parent_child');

-- 祖父 → 姑媽 Aunt（parent_child，與 Simon 共享父母 → 兄弟姊妹分叉）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type)
VALUES ('rel005', 'fam001', 'grandpa001', 'aunt001', 'parent_child');

-- 祖母 → 姑媽 Aunt（parent_child）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type)
VALUES ('rel006', 'fam001', 'grandma001', 'aunt001', 'parent_child');

-- Simon ↔ Cindy（marriage）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type, status)
VALUES ('rel007', 'fam001', 'cindy001', 'simon001', 'marriage', 'current');

-- Simon → Lily（parent_child，從 primary 半邊連線落 Lily）
INSERT OR IGNORE INTO relationships (id, family_id, from_member, to_member, edge_type)
VALUES ('rel008', 'fam001', 'simon001', 'lily001', 'parent_child');
