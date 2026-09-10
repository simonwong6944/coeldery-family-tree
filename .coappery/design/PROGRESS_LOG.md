# CoEldery 家族樹 — 進度 LOG（source of truth）

最後更新：2026-09-10（成長相簿 + 認人/登入全面修復 session）

---

## 一、已定案設計（唔再當未決定）

- **家庭樹 = 一個家庭一棵樹**（product_decisions v1.6）：一個 `family_id`，全家共用，成員以關係邊（edge）連住。
- 關係為獨立 edge（唔塞入 node）；**記錄層（真相）／顯示層（濾鏡）分離**。
- **「本人」＝ 登入者 `member_no` 對應嘅節點**（唔再係全家共用嘅 `is_self` flag）。
- **成長相簿 = 每位成員（含寵物）一個**，一律放 B2 成員詳情頁；**不設動態 tab／BB 專屬相簿**（product_decisions v1.6）。
- 一人可屬多棵樹（同一 `member_no` 多個 node）；加人時若該人已有 node → **同樹重用 / 跨樹合併**，唔開重複節點。
- Deploy：手動（`npm run build` + `npx wrangler pages deploy dist --project-name coeldery-family-tree`）；push git **唔會**自動部署。
- DB：`coeldery-family-tree-db`（尾 `7ae8cf09164d`）；**production migration 由產品負責人 `--remote` 執行**（rules §19）。

---

## 二、本 session（2026-09-10）完成

### A. 修復（全部已 push + deploy）

1. **登入鬼打牆**：`setup.ts` 統一寫 `member_auth`（原本仍寫 node 舊欄），與 `login.ts` 對齊。
2. **加人掛錯樹**：`members.ts` 改用登入者 `primaryFamilyId`（原「全庫最早樹」＋硬編碼「陳家」）。
3. `me.ts` 暱稱改讀 `member_auth`。
4. **本人跨帳號覆蓋**：B1 焦點／「本人」標籤改用登入者 `member_id`（唔再用 `is_self`）。
5. **`getCurrentMember` 舊 key 大修**：6 檔共 14 處 `{familyId}/{memberId}` → `{primaryFamilyId}/{primaryMemberId}`（修復家庭圈／提醒／留言／讚好／重要日子）。
6. **加人去重（v1「一個家庭一棵樹」）**：同 `member_no` 已有 node → 同樹重用、跨樹合併。
7. **本人可改自己顯示名**：`PATCH display_name`（只准本人）＋ `setup` 同步 ＋ `MemberDetail` 改名掣（放寬紅線 4 之本人例外）。
8. **登入 ↔ Auth Gate 死循環**：`login.needs_setup` 亦考慮「有無節點」；`setup` 只於「有密碼**且**有節點」才 409，否則補齊節點。
9. i18n：修 `empty_state.cta_btn`（不存在 key）→ `empty_state.cta`。

### B. 新功能

- **兩步登入**（先認電話 → 自動分流「首次設定／輸入密碼」）；`family_session` cookie 30 日免再登入。
- **成長相簿**：migration 0013/0014、API（GET/POST/DELETE + 配額 `_params.ts`）、相簿頁（**月曆 + 時間軸 + 全屏 lightbox**）、`MemberDetail` 區塊、**單向同步家庭圈**、共用上傳 helper。
- **入場手勢**：單擊＝聚焦、雙擊＝成長相簿、長按＝成員詳情。
- **Handoff token**：家庭樹接收端（`App.tsx`／`enter.ts`／`_verifyHandoff.ts`）＋契約文件＋產生器＋測試腳本；85AI 側已簽發（`/api/family-tree/handoff`）＋ `session/init` 環境閘。

### C. 文件

- `product_decisions.md` v1.6；`memory_vault.md` Core 3.3 標註（取消動態 tab）。
- `handoff_contract.md`、`handoff_85ai_prompt.md`、`handoff_85ai_session_init_fix_prompt.md`。
- migrations `0013_growth_album.sql`、`0014_growth_album_sync_post.sql` —— remote 已套用。

---

## 三、上一 session（2026-09-09 前後）歷史

- Remote DB 對齊：建 `member_auth`、補 `d1_migrations` 0002–0012。
- 舊 `20dcf7f`：`login.ts`/`members.ts`/`enter.ts`/`setup-with-session.ts` 改用 `member_auth`。
- `FAMILY_TREE_API_KEY` 兩邊換同一 key。
- **原待辦 P1–P5 全部已於本 session 處理**：
  - P1「資料共用」＝ `members.ts` 全庫最早樹 bug → 已修。
  - P2 清 `password_hash` / 首次設定 → 已由 `member_auth` 統一 + login/setup 修正解決。
  - P3 login 鬼打牆 → 已修（needs_setup + cookie 流程）。
  - P4 加成員 error handling → 後端已回明確錯誤；前端可再議。
  - P5 一人多樹 → 加人合併 + 本人跟帳號 落實。

---

## 四、待辦 / Backlog（現行）

1. 成長相簿 **短片支援**（上傳影片 + ≤90 秒驗證；後端 `media_kind='video'`／`duration_seconds`／`poster_url` 已預留）。
2. 無效電話測 `check-phone`/`login` 會回 **502**（因 85AI 對無效號碼回非 200）→ 應回 `is_member:false`（小 UX）。
3. **Handoff 最終驗收**：方法 B（兩邊 key 一致）＋ 真人由 85AI 入口行全流程。
4. 可選加固：認領節點防「一個 `member_no` 對多節點」。
5. `SESSION_DAYS` 抽共用常數；域名 www / 非-www 統一。
6. 家庭聚會 tab（現為 placeholder）、推薦獎勵 / coupon、v2+ 願景（傳家訊息等）。

---

## 五、教訓（避免重蹈）

- 改共用 helper 嘅**回傳 shape**（如 `_currentMember`）時，**必須同時 grep 所有 call site** —— 本 session 就係咁發現 14 處用舊 key 而靜靜壞掉。
- 生產 D1 一律由產品負責人 `--remote` 執行（rules §19）。
- 測 API **唔好用 `Invoke-WebRequest`**（會彈安全警告卡住）；用 `curl.exe` + `-d "@file"` 避開 PowerShell 引號問題。
- PowerShell 讀寫含中文檔案要用 `[System.IO.File]::ReadAllText/WriteAllText`（避免編碼破壞）。
- Cloudflare Pages 嘅 `d1 execute --file` 於本機／remote 皆曾失敗；改用 `--command` 內聯 SQL，或 production 用 `d1 migrations apply`。

---

## 六、同日下午追加（2026-09-10）：稱謂引擎 + 可編輯性 P1–P7

### A. 以「本人」為中心嘅親屬稱謂推算（原 v2+，拉前實作）
- 新模組 `packages/kinship-engine`：由本人節點 BFS（`parent_child`／`marriage`），步驟 pattern → i18n `kin.*` 稱謂（父/母/子/女/兄/弟/姊/妹/祖父母/外祖父母/孫/外孫/伯叔姑舅姨/堂表/媳婦女婿/岳父母家翁家姑…；fallback「親屬」）。
- 整合：`B1HomePage` 算 `kinKeys` → `FocusTree` → `LayerCarousel` → `HouseholdChip` 關係標籤。
- 測試：`scripts/test-kinship.mjs`（15/15 通過）。commit `465aa7d`。

### B. 樹跳動修正
- `FocusTree` 焦點卡置中原本用 `scrollIntoView({block:'nearest'})` → 會連頁面垂直捲動，令切換成員時成棵樹跳動、被推去畫面中間。
- 改為手動**只捲橫向**（`scrollLeft`）。commit `3b2f694`。

### C. 可編輯性補齊 P1–P7（每批即 deploy）
- P1 性別編輯（`4be30f9`）— 修好稱謂「父／母」。
- P2 重要日子編輯（`c107ef2`）。
- P3 成長相簿項目編輯（`0f24f33`）。
- P4 我的帳號：改暱稱 + 改密碼（`06d7145`）；抽出 `_password.ts` 共用。
- P5 關係邊編輯（relation_type／status／日期）+ 刪除（`8228ce1`）。
- P6 家族樹改名（`e5c2c0b`）。
- P7 出生日期編輯 + PATCH 補家族歸屬驗證（`704b0e4`）。
- 重構：`growthAlbumActions.ts`、`MemberBasicsSection.tsx`；`MemberDetail` 225→176、`GrowthAlbumPage` 219→178 行。

### D. 文件同步
- `rules.md`：第 12／20 條移出「智能稱謂／自動稱謂推算」；新增 **第 22 條（成員資料可編輯範圍）**。
- `product_decisions.md`：新增 [決策]「可編輯性補齊 + 自動稱謂推算拉前」+ **v1.7** 修訂記錄。

### E. 現行 backlog（更新）
1. 短片支援已完成；剩：無效電話測 `check-phone` 回 502 → 應回「非會員」（小 UX）。
2. Handoff 最終驗收（方法 B + 真人入口）。
3. 家庭聚會 tab（placeholder）、推薦獎勵 / coupon、v2+ 願景（傳家訊息等）。
4. 技術債：`ImportantDatesSection.tsx` 326 行（超 SOP 200），建議拆 component；`FocusTree.tsx` 亦接近上限。

