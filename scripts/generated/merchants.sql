-- 由 scripts/generate-merchant-sql.mjs 產生 — 請勿手改（改 data/merchants.json 再產生）
-- 產生時間：2026-09-10T17:35:42.988Z
-- 商戶 7 間／標籤 6 個／地區 3 個／地標 3 個／節日推廣 3 張

INSERT INTO district (id, group_id, name) VALUES ('dt-mongkok', 'dg-kowloon', '旺角')
  ON CONFLICT(id) DO UPDATE SET group_id = excluded.group_id, name = excluded.name;
INSERT INTO district (id, group_id, name) VALUES ('dt-cwb', 'dg-hk-island', '銅鑼灣')
  ON CONFLICT(id) DO UPDATE SET group_id = excluded.group_id, name = excluded.name;
INSERT INTO district (id, group_id, name) VALUES ('dt-tseung-kwan-o', 'dg-kowloon', '將軍澳')
  ON CONFLICT(id) DO UPDATE SET group_id = excluded.group_id, name = excluded.name;
INSERT INTO landmark (id, district_id, name, landmark_type) VALUES ('lm-langham', 'dt-mongkok', '朗豪坊', 'mall')
  ON CONFLICT(id) DO UPDATE SET district_id = excluded.district_id, name = excluded.name, landmark_type = excluded.landmark_type;
INSERT INTO landmark (id, district_id, name, landmark_type) VALUES ('lm-cwb-times', 'dt-cwb', '銅鑼灣站', 'mtr')
  ON CONFLICT(id) DO UPDATE SET district_id = excluded.district_id, name = excluded.name, landmark_type = excluded.landmark_type;
INSERT INTO landmark (id, district_id, name, landmark_type) VALUES ('lm-tko-popcorn', 'dt-tseung-kwan-o', '將軍澳中心', 'mall')
  ON CONFLICT(id) DO UPDATE SET district_id = excluded.district_id, name = excluded.name, landmark_type = excluded.landmark_type;
INSERT INTO merchant_tag (id, category_id, name) VALUES ('tag-cake', 'cat-gift', '蛋糕')
  ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, name = excluded.name;
INSERT INTO merchant_tag (id, category_id, name) VALUES ('tag-bakery', 'cat-gift', '西餅')
  ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, name = excluded.name;
INSERT INTO merchant_tag (id, category_id, name) VALUES ('tag-gift-shop', 'cat-gift', '禮品')
  ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, name = excluded.name;
INSERT INTO merchant_tag (id, category_id, name) VALUES ('tag-flower-shop', 'cat-gift', '花店')
  ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, name = excluded.name;
INSERT INTO merchant_tag (id, category_id, name) VALUES ('tag-banquet', 'cat-food', '宴會')
  ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, name = excluded.name;
INSERT INTO merchant_tag (id, category_id, name) VALUES ('tag-delivery-food', 'cat-food', '到會')
  ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, name = excluded.name;
INSERT INTO merchant (id, name, landmark_id, category_id, is_listed, ad_tier, phone, whatsapp, map_url, address, description, photo_url, paid_note) VALUES ('mc-demo-banquet-cwb', '（示範）銅鑼灣金鳳酒樓', 'lm-cwb-times', 'cat-food', 1, 2, '2000-1001', '85220001001', 'https://maps.google.com/?q=銅鑼灣', '銅鑼灣軒尼詩道 100 號 2 樓', '粵菜酒樓，可擺 10–20 席，設長者優惠。', NULL, '示範資料')
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, landmark_id = excluded.landmark_id, category_id = excluded.category_id, is_listed = excluded.is_listed, ad_tier = excluded.ad_tier, phone = excluded.phone, whatsapp = excluded.whatsapp, map_url = excluded.map_url, address = excluded.address, description = excluded.description, photo_url = excluded.photo_url, paid_note = excluded.paid_note;
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-banquet-cwb', 'tag-yumcha');
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-banquet-cwb', 'tag-banquet');
INSERT INTO merchant (id, name, landmark_id, category_id, is_listed, ad_tier, phone, whatsapp, map_url, address, description, photo_url, paid_note) VALUES ('mc-demo-cha-tko', '（示範）將軍澳好味茶餐廳', 'lm-tko-popcorn', 'cat-food', 1, 0, '2000-1002', '85220001002', 'https://maps.google.com/?q=將軍澳中心', '將軍澳唐德街 1 號', '家庭式茶餐廳，可電話留位。', NULL, '示範資料')
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, landmark_id = excluded.landmark_id, category_id = excluded.category_id, is_listed = excluded.is_listed, ad_tier = excluded.ad_tier, phone = excluded.phone, whatsapp = excluded.whatsapp, map_url = excluded.map_url, address = excluded.address, description = excluded.description, photo_url = excluded.photo_url, paid_note = excluded.paid_note;
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-cha-tko', 'tag-cha-chaan');
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-cha-tko', 'tag-delivery-food');
INSERT INTO merchant (id, name, landmark_id, category_id, is_listed, ad_tier, phone, whatsapp, map_url, address, description, photo_url, paid_note) VALUES ('mc-demo-cake-mk', '（示範）甜美餅店', 'lm-langham', 'cat-gift', 1, 0, '2000-2001', '85220002001', 'https://maps.google.com/?q=旺角朗豪坊', '旺角亞皆老街 8 號地下', '生日蛋糕、節日禮盒；可指定取貨時間。', NULL, '示範資料')
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, landmark_id = excluded.landmark_id, category_id = excluded.category_id, is_listed = excluded.is_listed, ad_tier = excluded.ad_tier, phone = excluded.phone, whatsapp = excluded.whatsapp, map_url = excluded.map_url, address = excluded.address, description = excluded.description, photo_url = excluded.photo_url, paid_note = excluded.paid_note;
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-cake-mk', 'tag-cake');
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-cake-mk', 'tag-bakery');
INSERT INTO merchant (id, name, landmark_id, category_id, is_listed, ad_tier, phone, whatsapp, map_url, address, description, photo_url, paid_note) VALUES ('mc-demo-cake-cwb', '（示範）華麗西餅', 'lm-cwb-times', 'cat-gift', 1, 1, '2000-2002', '85220002002', 'https://maps.google.com/?q=銅鑼灣站', '銅鑼灣波斯富街 20 號', '西餅、鮮果蛋糕、壽桃。', NULL, '示範資料')
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, landmark_id = excluded.landmark_id, category_id = excluded.category_id, is_listed = excluded.is_listed, ad_tier = excluded.ad_tier, phone = excluded.phone, whatsapp = excluded.whatsapp, map_url = excluded.map_url, address = excluded.address, description = excluded.description, photo_url = excluded.photo_url, paid_note = excluded.paid_note;
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-cake-cwb', 'tag-cake');
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-cake-cwb', 'tag-bakery');
INSERT INTO merchant (id, name, landmark_id, category_id, is_listed, ad_tier, phone, whatsapp, map_url, address, description, photo_url, paid_note) VALUES ('mc-demo-flower-mk', '（示範）心意花店', 'lm-langham', 'cat-gift', 1, 0, '2000-3001', '85220003001', 'https://maps.google.com/?q=旺角花墟', '旺角花墟道 30 號', '鮮花束、花籃、拜祭花；可即日送貨。', NULL, '示範資料')
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, landmark_id = excluded.landmark_id, category_id = excluded.category_id, is_listed = excluded.is_listed, ad_tier = excluded.ad_tier, phone = excluded.phone, whatsapp = excluded.whatsapp, map_url = excluded.map_url, address = excluded.address, description = excluded.description, photo_url = excluded.photo_url, paid_note = excluded.paid_note;
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-flower-mk', 'tag-flower');
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-flower-mk', 'tag-flower-shop');
INSERT INTO merchant (id, name, landmark_id, category_id, is_listed, ad_tier, phone, whatsapp, map_url, address, description, photo_url, paid_note) VALUES ('mc-demo-flower-tko', '（示範）康樂花藝', 'lm-tko-popcorn', 'cat-gift', 1, 0, '2000-3002', '85220003002', 'https://maps.google.com/?q=將軍澳中心', '將軍澳唐俊街 12 號', '花束、禮品花籃、開張花牌。', NULL, '示範資料')
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, landmark_id = excluded.landmark_id, category_id = excluded.category_id, is_listed = excluded.is_listed, ad_tier = excluded.ad_tier, phone = excluded.phone, whatsapp = excluded.whatsapp, map_url = excluded.map_url, address = excluded.address, description = excluded.description, photo_url = excluded.photo_url, paid_note = excluded.paid_note;
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-flower-tko', 'tag-flower');
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-flower-tko', 'tag-flower-shop');
INSERT INTO merchant (id, name, landmark_id, category_id, is_listed, ad_tier, phone, whatsapp, map_url, address, description, photo_url, paid_note) VALUES ('mc-demo-gift-mk', '（示範）滿堂禮品', 'lm-langham', 'cat-gift', 1, 0, '2000-4001', '85220004001', 'https://maps.google.com/?q=旺角', '旺角彌敦道 700 號', '節日禮盒、餅食禮券、補品禮盒（可代客送貨）。', NULL, '示範資料')
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, landmark_id = excluded.landmark_id, category_id = excluded.category_id, is_listed = excluded.is_listed, ad_tier = excluded.ad_tier, phone = excluded.phone, whatsapp = excluded.whatsapp, map_url = excluded.map_url, address = excluded.address, description = excluded.description, photo_url = excluded.photo_url, paid_note = excluded.paid_note;
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-gift-mk', 'tag-gift-shop');
INSERT OR IGNORE INTO merchant_tag_map (merchant_id, tag_id) VALUES ('mc-demo-gift-mk', 'tag-gift-box');
INSERT INTO promotion (id, merchant_id, festival_id, title, description, terms, quota_total, valid_from, valid_to, is_active) VALUES ('promo-demo-mid-autumn-banquet', 'mc-demo-banquet-cwb', 'mid-autumn-2026', '中秋家庭聚餐 9 折', '10 位或以上訂枱可享 9 折，送月餅乙盒。', '須提前 7 日預約；不與其他優惠同時使用。', 50, NULL, NULL, 1)
  ON CONFLICT(id) DO UPDATE SET merchant_id = excluded.merchant_id, festival_id = excluded.festival_id, title = excluded.title, description = excluded.description, terms = excluded.terms, quota_total = excluded.quota_total, valid_from = excluded.valid_from, valid_to = excluded.valid_to, is_active = excluded.is_active;
INSERT INTO promotion (id, merchant_id, festival_id, title, description, terms, quota_total, valid_from, valid_to, is_active) VALUES ('promo-demo-mid-autumn-cake', 'mc-demo-cake-mk', 'mid-autumn-2026', '中秋禮盒 $50 優惠', '訂購中秋禮盒滿 $300 減 $50。', '每張訂單限用一次。', 100, NULL, NULL, 1)
  ON CONFLICT(id) DO UPDATE SET merchant_id = excluded.merchant_id, festival_id = excluded.festival_id, title = excluded.title, description = excluded.description, terms = excluded.terms, quota_total = excluded.quota_total, valid_from = excluded.valid_from, valid_to = excluded.valid_to, is_active = excluded.is_active;
INSERT INTO promotion (id, merchant_id, festival_id, title, description, terms, quota_total, valid_from, valid_to, is_active) VALUES ('promo-demo-mid-autumn-flower', 'mc-demo-flower-mk', 'mid-autumn-2026', '中秋花束免運費', '節日期間訂花束免運費。', '限香港島、九龍區。', NULL, NULL, NULL, 1)
  ON CONFLICT(id) DO UPDATE SET merchant_id = excluded.merchant_id, festival_id = excluded.festival_id, title = excluded.title, description = excluded.description, terms = excluded.terms, quota_total = excluded.quota_total, valid_from = excluded.valid_from, valid_to = excluded.valid_to, is_active = excluded.is_active;
