PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE families (
  id         TEXT PRIMARY KEY,           -- nanoid / UUID（由 API 層生成）
  name       TEXT NOT NULL,              -- 家族樹名稱，例如「陳家」
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "families" ("id","name","created_at") VALUES('ab4abd4ff61bce9bc4a4cc0f4c805477','陳家','2026-09-05 09:25:47');
CREATE TABLE members (
  id           TEXT PRIMARY KEY,
  family_id    TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_kind  TEXT NOT NULL CHECK (member_kind IN ('person','pet')),
  display_name TEXT NOT NULL,            -- 姓名 / 寵物名稱
  birth_date   TEXT,                     -- ISO 8601 date，可為 null
  avatar_url   TEXT,                     -- 預留：Cloudflare R2 URL
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  -- 預留 CoEldery 85 SSO 接入欄（階段二填充）
  coeldery85_member_id TEXT              -- null 直至階段二接駁 85 SSO
, deceased_date TEXT, is_self INTEGER NOT NULL DEFAULT 0, gender TEXT
  CHECK (gender IN ('male','female') OR gender IS NULL));
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('8853d74dc25a76d6aa7453fc6af54b3b','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Simon Wong','1976-11-09','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788677498/family-feed/rc5tzsl9iegggjkhffgm.jpg','2026-09-05 09:25:47',NULL,NULL,1,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('619c75f3768c778c990793cc3d084ad4','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Cindy Wong','1978-10-18','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788677619/family-feed/xz0as5c10yn63rebfw3j.jpg','2026-09-05 09:26:30',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('43e111f9ccf130c0e92cea98a88cacf0','ab4abd4ff61bce9bc4a4cc0f4c805477','person','KC Wong','1951-07-04','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788677793/family-feed/buvqjixmjsua1t1o2qkf.jpg','2026-09-05 09:27:05',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('d8593c044fbf417cf59d6f2385dae601','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Sky Wong','2006-01-13','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788678080/family-feed/efqvnc2azly9rz3kjypp.jpg','2026-09-05 09:28:49',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('d623ba264392eed2e6142c10a7569846','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Haydan Wong','2009-11-04','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788678119/family-feed/tzglnbhvvuh8fv9egpnj.jpg','2026-09-05 09:30:03',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('2a50b10b9bb23032bd380031fe206fda','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Suzanne','1974-09-26',NULL,'2026-09-05 09:31:08',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('d4503a6b98e074d3dd6eec3187862088','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Sebina Wong','1979-05-07',NULL,'2026-09-05 10:04:57',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('4f4deade6ccd1f51ad75b5a6b78e7cda','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Ashlyn','2001-08-21',NULL,'2026-09-05 10:05:48',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('00ad7f9980e501d445d17f5d887a2852','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Anson','2005-08-27',NULL,'2026-09-05 10:06:42',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('9ecd85e2d6d1136df0758af57a86534d','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Herbert','1978-06-05',NULL,'2026-09-05 10:09:04',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('df01b42985a8eea97d255121356e54cf','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Hoi Yin','2009-02-14',NULL,'2026-09-05 10:10:14',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('122dfab9ff750661a47651359e057499','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Chole','2012-09-11',NULL,'2026-09-05 10:11:12',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('fc3d166818ea448b0c0e26943b9a4924','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Cheng Wing','1956-11-03',NULL,'2026-09-05 13:01:26',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('eb1d5f86d03d0372b4fe76fa5f578b09','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Co Co','1952-06-18','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788678235/family-feed/qmimguepvyl0coaendre.jpg','2026-09-05 14:08:07',NULL,NULL,0,NULL);
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('b1045cbaddeb7b4bb4dfddc42da21517','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Choi Wan','1953-09-07',NULL,'2026-09-05 14:57:51',NULL,NULL,0,'female');
INSERT INTO "members" ("id","family_id","member_kind","display_name","birth_date","avatar_url","created_at","coeldery85_member_id","deceased_date","is_self","gender") VALUES('383ea2836fb187895f32ce10be39e78e','ab4abd4ff61bce9bc4a4cc0f4c805477','person','Sharon','1976-02-14',NULL,'2026-09-05 15:25:32',NULL,NULL,0,'female');
CREATE TABLE relationships (
  id            TEXT PRIMARY KEY,
  family_id     TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  from_member   TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member     TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  edge_type     TEXT NOT NULL CHECK (edge_type IN ('parent_child','marriage','pet_owner')),
  relation_type TEXT CHECK (relation_type IN ('biological','adopted','step') OR relation_type IS NULL),
  status        TEXT CHECK (status IN ('current','divorced','widowed','separated') OR status IS NULL),
  start_date    TEXT,                    -- ISO 8601 date，婚姻起始日／認養日
  end_date      TEXT,                    -- ISO 8601 date，婚姻終止日（離婚/喪偶）
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (from_member != to_member)
);
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('b28bdb730bc5f40cfdc45c9f2e17f9e6','ab4abd4ff61bce9bc4a4cc0f4c805477','619c75f3768c778c990793cc3d084ad4','8853d74dc25a76d6aa7453fc6af54b3b','marriage',NULL,'current',NULL,NULL,'2026-09-05 09:26:30');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('53926b6179a67c3d72fcf73a8c5d6e8e','ab4abd4ff61bce9bc4a4cc0f4c805477','43e111f9ccf130c0e92cea98a88cacf0','8853d74dc25a76d6aa7453fc6af54b3b','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 09:27:05');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('f517ccf2b32d88694e3856179e58b453','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','d8593c044fbf417cf59d6f2385dae601','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 09:28:49');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('cd1b5fb142adf908fc4b0a82bbb76265','ab4abd4ff61bce9bc4a4cc0f4c805477','619c75f3768c778c990793cc3d084ad4','d8593c044fbf417cf59d6f2385dae601','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 09:29:13');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('897d11f6bfae1f2300bdd0d21aec664d','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','d623ba264392eed2e6142c10a7569846','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 09:30:03');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('f5d2e361c2ffa6acc0f2de690fe594ca','ab4abd4ff61bce9bc4a4cc0f4c805477','619c75f3768c778c990793cc3d084ad4','d623ba264392eed2e6142c10a7569846','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 09:30:03');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('0ca75d865d514bd2b7a510e4a619aa12','ab4abd4ff61bce9bc4a4cc0f4c805477','43e111f9ccf130c0e92cea98a88cacf0','2a50b10b9bb23032bd380031fe206fda','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 09:31:08');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('04adf27b7ef216b50a4862f427ba5e16','ab4abd4ff61bce9bc4a4cc0f4c805477','43e111f9ccf130c0e92cea98a88cacf0','d4503a6b98e074d3dd6eec3187862088','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 10:04:57');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('33729b761d342252bb5d4db0551f2fe7','ab4abd4ff61bce9bc4a4cc0f4c805477','2a50b10b9bb23032bd380031fe206fda','4f4deade6ccd1f51ad75b5a6b78e7cda','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 10:05:49');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('fbbde23bfa9d335c39024dab23822c21','ab4abd4ff61bce9bc4a4cc0f4c805477','2a50b10b9bb23032bd380031fe206fda','00ad7f9980e501d445d17f5d887a2852','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 10:06:42');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('1e8d62907221f4b3c7f75dff7ae48f45','ab4abd4ff61bce9bc4a4cc0f4c805477','9ecd85e2d6d1136df0758af57a86534d','d4503a6b98e074d3dd6eec3187862088','marriage',NULL,'current',NULL,NULL,'2026-09-05 10:09:04');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('c74aa4956c396a28709ef40f8f75372b','ab4abd4ff61bce9bc4a4cc0f4c805477','9ecd85e2d6d1136df0758af57a86534d','df01b42985a8eea97d255121356e54cf','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 10:10:14');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('199a346f80e81612e8c9d238bffc2815','ab4abd4ff61bce9bc4a4cc0f4c805477','9ecd85e2d6d1136df0758af57a86534d','122dfab9ff750661a47651359e057499','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 10:11:12');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('1c9145b085a93d9472e721d3c1caa063','ab4abd4ff61bce9bc4a4cc0f4c805477','fc3d166818ea448b0c0e26943b9a4924','619c75f3768c778c990793cc3d084ad4','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 13:01:26');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('55e35d47ab036dcc82da5235f4e507c1','ab4abd4ff61bce9bc4a4cc0f4c805477','eb1d5f86d03d0372b4fe76fa5f578b09','8853d74dc25a76d6aa7453fc6af54b3b','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 14:08:07');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('01ceafd7a1d7ddd9320e9695e8b95da0','ab4abd4ff61bce9bc4a4cc0f4c805477','43e111f9ccf130c0e92cea98a88cacf0','eb1d5f86d03d0372b4fe76fa5f578b09','marriage',NULL,'current',NULL,NULL,'2026-09-05 14:08:46');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('d3e3504a974efe91605b0861104caf4a','ab4abd4ff61bce9bc4a4cc0f4c805477','b1045cbaddeb7b4bb4dfddc42da21517','619c75f3768c778c990793cc3d084ad4','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 14:57:51');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('76c7f02308d1802ddbaa9230d594ad04','ab4abd4ff61bce9bc4a4cc0f4c805477','b1045cbaddeb7b4bb4dfddc42da21517','fc3d166818ea448b0c0e26943b9a4924','marriage',NULL,'current',NULL,NULL,'2026-09-05 15:24:26');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('0cd77aaa19d15ab62fc4109ae4c87ab8','ab4abd4ff61bce9bc4a4cc0f4c805477','fc3d166818ea448b0c0e26943b9a4924','383ea2836fb187895f32ce10be39e78e','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 15:25:33');
INSERT INTO "relationships" ("id","family_id","from_member","to_member","edge_type","relation_type","status","start_date","end_date","created_at") VALUES('69e32a535cf4ee4dad6573a568e1d935','ab4abd4ff61bce9bc4a4cc0f4c805477','b1045cbaddeb7b4bb4dfddc42da21517','383ea2836fb187895f32ce10be39e78e','parent_child',NULL,NULL,NULL,NULL,'2026-09-05 15:25:33');
CREATE TABLE posts (
  id               TEXT PRIMARY KEY,                                     -- nanoid（由 API 層生成）
  family_id        TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  author_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE, -- 貼文作者；第一版用 is_self member
  body_text        TEXT,                                                 -- 貼文文字，可為 NULL
  photo_url        TEXT,                                                 -- Cloudinary URL，可為 NULL
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "posts" ("id","family_id","author_member_id","body_text","photo_url","created_at") VALUES('baa6fcda79aa619e392823c0d69f15ed','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','Hello Family Free',NULL,'2026-09-05 16:06:41');
INSERT INTO "posts" ("id","family_id","author_member_id","body_text","photo_url","created_at") VALUES('54aa649025b633f02d523ae9eb850e90','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','Happy Fathers Day','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788678323/family-feed/np5algh3mmype5s3cvsm.jpg','2026-09-06 07:05:27');
INSERT INTO "posts" ("id","family_id","author_member_id","body_text","photo_url","created_at") VALUES('3f08a852ade2ba28128a7518cdbec192','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','Nice trip','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788700812/family-feed/byevhiid8rsatyl3zecl.jpg','2026-09-06 13:20:14');
INSERT INTO "posts" ("id","family_id","author_member_id","body_text","photo_url","created_at") VALUES('f48ece8d1a8aa5d4a8327f80f56f7528','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','祝Choi Wan生日快樂，身體健康，福壽安康。',NULL,'2026-09-06 13:47:03');
INSERT INTO "posts" ("id","family_id","author_member_id","body_text","photo_url","created_at") VALUES('e58a422b4fe58364549ca74055273e4a','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','祝Choi Wan生日快樂，身體健康，福壽安康','https://res.cloudinary.com/ex2zrh2h/image/upload/v1788703286/family-feed/odny71usvpptod7jbdhm.jpg','2026-09-06 14:01:26');
INSERT INTO "posts" ("id","family_id","author_member_id","body_text","photo_url","created_at") VALUES('9934a29193ce5179908c8c351e16e97a','ab4abd4ff61bce9bc4a4cc0f4c805477','8853d74dc25a76d6aa7453fc6af54b3b','祝Chole生日快樂，身體健康，福壽安康。',NULL,'2026-09-08 10:06:31');
CREATE TABLE post_comments (
  id               TEXT PRIMARY KEY,
  post_id          TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "post_comments" ("id","post_id","author_member_id","body","created_at") VALUES('2a20028c2830f4c0be6703829229d877','baa6fcda79aa619e392823c0d69f15ed','8853d74dc25a76d6aa7453fc6af54b3b','Hello','2026-09-05 16:27:02');
CREATE TABLE post_likes (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,  -- 邊個讚
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (post_id, member_id)
);
INSERT INTO "post_likes" ("id","post_id","member_id","created_at") VALUES('8ad889ef367e7858f25ba34766c8abae','baa6fcda79aa619e392823c0d69f15ed','8853d74dc25a76d6aa7453fc6af54b3b','2026-09-05 16:26:56');
INSERT INTO "post_likes" ("id","post_id","member_id","created_at") VALUES('b6f47148b5ca1f149ef3c66a33cfecd1','f48ece8d1a8aa5d4a8327f80f56f7528','8853d74dc25a76d6aa7453fc6af54b3b','2026-09-08 08:50:03');
CREATE TABLE member_important_dates (
  id           TEXT    PRIMARY KEY,
  member_id    TEXT    NOT NULL,
  label        TEXT    NOT NULL,
  date         TEXT    NOT NULL,
  is_recurring INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
INSERT INTO "member_important_dates" ("id","member_id","label","date","is_recurring","created_at") VALUES('8fd65656f687878f1db2102e07f4c164','8853d74dc25a76d6aa7453fc6af54b3b','結婚紀念日','2004-12-18',1,'2026-09-06 06:23:17');
INSERT INTO "member_important_dates" ("id","member_id","label","date","is_recurring","created_at") VALUES('abc7d8340b7090645e7a45d21e365cc4','8853d74dc25a76d6aa7453fc6af54b3b','拍拖紀念日','1997-12-02',1,'2026-09-06 06:24:14');
INSERT INTO "member_important_dates" ("id","member_id","label","date","is_recurring","created_at") VALUES('1fdb70c03b50a1437c40aadde3391513','8853d74dc25a76d6aa7453fc6af54b3b','發佈會','2026-09-30',0,'2026-09-06 16:09:57');
CREATE TABLE district_group (
  id         TEXT PRIMARY KEY,           -- 簡短固定 id，如 'hk-island'
  name       TEXT NOT NULL,              -- 顯示名，如 '港島'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "district_group" ("id","name","created_at") VALUES('dg-hk-island','港島','2026-09-06 16:43:45');
INSERT INTO "district_group" ("id","name","created_at") VALUES('dg-kowloon','九龍','2026-09-06 16:43:45');
INSERT INTO "district_group" ("id","name","created_at") VALUES('dg-nt','新界','2026-09-06 16:43:45');
CREATE TABLE district (
  id         TEXT PRIMARY KEY,
  group_id   TEXT NOT NULL REFERENCES district_group(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,              -- 如 '灣仔'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "district" ("id","group_id","name","created_at") VALUES('dt-wanchai','dg-hk-island','灣仔','2026-09-06 16:43:45');
INSERT INTO "district" ("id","group_id","name","created_at") VALUES('dt-kwuntong','dg-kowloon','觀塘','2026-09-06 16:43:45');
INSERT INTO "district" ("id","group_id","name","created_at") VALUES('dt-shatin','dg-nt','沙田','2026-09-06 16:43:45');
CREATE TABLE landmark (
  id            TEXT PRIMARY KEY,
  district_id   TEXT NOT NULL REFERENCES district(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,           -- 如 '新城市廣場'
  landmark_type TEXT,                    -- 'mall' / 'market' / 'mtr' / 'other'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "landmark" ("id","district_id","name","landmark_type","created_at") VALUES('lm-times-sq','dt-wanchai','時代廣場','mall','2026-09-06 16:43:45');
INSERT INTO "landmark" ("id","district_id","name","landmark_type","created_at") VALUES('lm-kwuntong-mtr','dt-kwuntong','觀塘站','mtr','2026-09-06 16:43:45');
INSERT INTO "landmark" ("id","district_id","name","landmark_type","created_at") VALUES('lm-newtown-plz','dt-shatin','新城市廣場','mall','2026-09-06 16:43:45');
CREATE TABLE merchant_category (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,              -- 如 '飲食'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "merchant_category" ("id","name","sort_order","created_at") VALUES('cat-food','飲食',1,'2026-09-06 16:43:45');
INSERT INTO "merchant_category" ("id","name","sort_order","created_at") VALUES('cat-health','醫療保健',2,'2026-09-06 16:43:45');
INSERT INTO "merchant_category" ("id","name","sort_order","created_at") VALUES('cat-home','家居服務',3,'2026-09-06 16:43:45');
INSERT INTO "merchant_category" ("id","name","sort_order","created_at") VALUES('cat-gift','禮品與花藝',4,'2026-09-06 16:43:45');
INSERT INTO "merchant_category" ("id","name","sort_order","created_at") VALUES('cat-funeral','殯儀與身後事',5,'2026-09-06 16:43:45');
INSERT INTO "merchant_category" ("id","name","sort_order","created_at") VALUES('cat-elderly','長者日常',6,'2026-09-06 16:43:45');
CREATE TABLE merchant_tag (
  id          TEXT PRIMARY KEY,
  category_id TEXT REFERENCES merchant_category(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,             -- 如 '茶餐廳'
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-cha-chaan','cat-food','茶餐廳','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-yumcha','cat-food','酒樓（點心）','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-delivery','cat-food','外賣到府','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-western-dr','cat-health','西醫','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-chinese-dr','cat-health','中醫','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-homevisit','cat-health','上門診療','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-cleaning','cat-home','家居清潔','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-nursing','cat-home','居家護理','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-flower','cat-gift','鮮花','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-gift-box','cat-gift','節日禮盒','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-funeral-svc','cat-funeral','殯儀服務','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-tribute','cat-funeral','拜祭用品','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-pharmacy','cat-elderly','藥房','2026-09-06 16:43:45');
INSERT INTO "merchant_tag" ("id","category_id","name","created_at") VALUES('tag-transport','cat-elderly','接送服務','2026-09-06 16:43:45');
CREATE TABLE merchant (
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
, whatsapp TEXT, map_url TEXT, banner_url TEXT, video_url TEXT, poster_url TEXT);
INSERT INTO "merchant" ("id","name","landmark_id","category_id","is_listed","ad_tier","phone","address","description","photo_url","paid_note","created_at","whatsapp","map_url","banner_url","video_url","poster_url") VALUES('mc-cha-kwuntong','觀塘大家姐茶餐廳','lm-kwuntong-mtr','cat-food',1,0,'2345-6789','九龍觀塘巧明街 88 號地下','地道港式茶餐廳，提供早午晚餐，設無障礙座位，歡迎長者。',NULL,'2025-03 年費已收，轉數快確認','2026-09-06 16:43:45','85223456789','https://www.google.com/maps/search/?api=1&query=%E4%B9%9D%E9%BE%8D%E8%A7%80%E5%A1%98%E5%B7%A7%E6%98%8E%E8%A1%9788%E8%99%9F%E5%9C%B0%E4%B8%8B','https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=720&q=80','https://www.w3schools.com/html/mov_bbb.mp4',NULL);
INSERT INTO "merchant" ("id","name","landmark_id","category_id","is_listed","ad_tier","phone","address","description","photo_url","paid_note","created_at","whatsapp","map_url","banner_url","video_url","poster_url") VALUES('mc-clinic-wanchai','灣仔長青西醫診所','lm-times-sq','cat-health',1,1,'2111-3333','香港灣仔謝斐道 200 號 3 樓','家庭科西醫，長者友善診所，可預約上門出診。',NULL,'2025-03 廣告 tier 1，已收廣告費','2026-09-06 16:43:45','85221113333','https://www.google.com/maps/search/?api=1&query=%E9%A6%99%E6%B8%AF%E7%81%A3%E4%BB%94%E8%AC%9D%E6%96%90%E9%81%93200%E8%99%9F3%E6%A8%93','https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=720&q=80',NULL,NULL);
INSERT INTO "merchant" ("id","name","landmark_id","category_id","is_listed","ad_tier","phone","address","description","photo_url","paid_note","created_at","whatsapp","map_url","banner_url","video_url","poster_url") VALUES('mc-funeral-shatin','沙田至誠殯儀服務','lm-newtown-plz','cat-funeral',1,2,'2688-9900','新界沙田石門安群街 3 號','提供全程殯儀安排、法事統籌、遺體接送，24 小時服務。',NULL,'2025-03 廣告 tier 2 置頂，年費已收','2026-09-06 16:43:45','85226889900','https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E7%95%8C%E6%B2%99%E7%94%B0%E7%9F%B3%E9%96%80%E5%AE%89%E7%BE%A4%E8%A1%973%E8%99%9F','https://images.unsplash.com/photo-1501854140801-50d01698950b?w=720&q=80',NULL,NULL);
CREATE TABLE merchant_tag_map (
  merchant_id TEXT NOT NULL REFERENCES merchant(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES merchant_tag(id) ON DELETE CASCADE,
  PRIMARY KEY (merchant_id, tag_id)
);
INSERT INTO "merchant_tag_map" ("merchant_id","tag_id") VALUES('mc-cha-kwuntong','tag-cha-chaan');
INSERT INTO "merchant_tag_map" ("merchant_id","tag_id") VALUES('mc-cha-kwuntong','tag-delivery');
INSERT INTO "merchant_tag_map" ("merchant_id","tag_id") VALUES('mc-clinic-wanchai','tag-western-dr');
INSERT INTO "merchant_tag_map" ("merchant_id","tag_id") VALUES('mc-clinic-wanchai','tag-homevisit');
INSERT INTO "merchant_tag_map" ("merchant_id","tag_id") VALUES('mc-funeral-shatin','tag-funeral-svc');
INSERT INTO "merchant_tag_map" ("merchant_id","tag_id") VALUES('mc-funeral-shatin','tag-tribute');
CREATE INDEX idx_members_family_id ON members(family_id);
CREATE INDEX idx_members_kind ON members(family_id, member_kind);
CREATE INDEX idx_rel_family     ON relationships(family_id);
CREATE INDEX idx_rel_from       ON relationships(from_member);
CREATE INDEX idx_rel_to         ON relationships(to_member);
CREATE INDEX idx_rel_edge_type  ON relationships(family_id, edge_type);
CREATE INDEX idx_posts_family_created
  ON posts (family_id, created_at);
CREATE INDEX idx_post_comments_post
  ON post_comments (post_id);
CREATE INDEX idx_post_likes_post
  ON post_likes (post_id);
CREATE INDEX idx_mid_member ON member_important_dates(member_id);
CREATE INDEX idx_district_group ON district (group_id);
CREATE INDEX idx_landmark_district ON landmark (district_id);
CREATE INDEX idx_merchant_tag_category ON merchant_tag (category_id);
CREATE INDEX idx_merchant_landmark   ON merchant (landmark_id);
CREATE INDEX idx_merchant_category   ON merchant (category_id);
CREATE INDEX idx_merchant_is_listed  ON merchant (is_listed);
