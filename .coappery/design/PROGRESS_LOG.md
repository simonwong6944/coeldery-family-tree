# CoEldery 家族樹 — 進度 LOG（source of truth）

最後更新：2026-09-10（家庭聚會協作：發起 → 候選 → 逐人投票 → 確認 → 邀請卡）

---

## 一、已定案設計（唔再當未決定）

- **家庭聚會 = 重用商戶平台**（`merchant` 表，唔開新 schema）：按**場合**（生日／結婚週年／節日／忌辰）過濾商戶 + 一鍵致電／WhatsApp／導航；**App 內不涉交易、不抽佣**（成交留喺商戶）。
- **忌辰硬攔截**（family_gather.md §7）：忌辰場合**不得出現任何廣告／贊助位**，故先過濾 `ad_tier = 0`（自然排序），只列鮮花／拜祭相關商戶。
- 家庭樹 = 一個家庭一棵樹（product_decisions v1.6）：一個 `family_id`，全家共用，成員以關係邊（edge）連住。
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
3. **家庭聚會**：v1 核心（場合商戶瀏覽）＋ **協作流程（發起／候選／逐人投票／確認／自動家庭圈邀請卡）已完成**（見第七、八節）；未做 = coupon（雙動作）、推薦獎勵券、聚會提醒推送、支出分攤、名額上限、投票截止自動鎖定。
4. 技術債：`ImportantDatesSection.tsx` 326 行（超 SOP 200），建議拆 component；`FocusTree.tsx` 亦接近上限。

---

## 七、家庭聚會 tab v1 核心（2026-09-10 追加）

規格：`.coappery/family_gather.md` v1.1 §1–4、§7。**不涉交易、不抽佣、不開新 schema**（重用 `merchant` 平台）。

- **`src/pages/FamilyGather.tsx` 105 行**（原 48 行 placeholder → 真頁）：場合 chips（全部／生日／結婚週年／節日／忌辰）→ 過濾 → 商戶卡（相／名／分類／地址）→ **一鍵 📞 致電、💬 WhatsApp（`wa.me`）、📍 導航（`map_url`）**。單次 `GET /api/merchants`，場合過濾喺前端（分類粒度細，避免多次請求）。
- **過濾邏輯抽為純函式 `src/utils/gatherScenes.ts`（73 行）**：`filterMerchants()`／`matchScene()`／`gatherSceneFromHash()`，無 React 依賴，可 node 直測。
- **場合 → 分類對照**（§3.2）：生日／週年／節日 = `cat-food`（餐廳、蛋糕）+ `cat-gift`（禮品、鮮花）；忌辰 = `cat-gift` + `cat-funeral`（拜祭相關）。**次要匹配用商戶標籤（tags）** 補足粗分類。
- **忌辰硬攔截**（§7）：`scene=memorial` 時**先**排除 `ad_tier > 0`（一切付費／贊助），只列自然排序商戶，並顯示莊重提示；無聚會發起／慶祝 CTA。
- **贊助標示**：非忌辰模式，`ad_tier > 0` 商戶加「贊助」徽章（誠實標示，rules）。
- **入口**：`#/family-gather?scene=…`；`App.tsx` route 改 `startsWith` 以支援 query；B4 推薦卡「了解更多」→ `#/family-gather?scene=festival`（原為 `onCtaClick={()=>undefined}`）。
- i18n 新增 `gather.*`（13 key）；文字全 i18n、顏色全 CSS var；lint 0 error。
- **測試**：`scripts/test-gather-scenes.mjs`（10/10 通過，含「忌辰零廣告」硬攔截斷言 + hash 場合解析）；順帶喺 `test-kinship.mjs` 註解補 `--ignoreConfig`（TS6 起必需）。

**已知限制（下一步）**：生產商戶種子資料暫時只有 3 個（`cat-food`／`cat-health`／`cat-funeral`），**冇 `cat-gift`（禮品與花藝）商戶**，故生日／週年／節日場景只出 1 個、忌辰場景可能空（此為資料問題，非程式問題 —— 有自然排序鮮花商戶即會顯示）。聚會發起／候選日期／邀請卡與投票（待 SSO）未做；coupon 未做。

---

## 八、家庭聚會協作落地（2026-09-10 追加）：發起 → 候選 → 逐人投票 → 確認 → 邀請卡

> ⚠️ **`migrations/0015_gatherings.sql` 之 remote migration 待產品負責人執行**（rules §19：AI 只可跑 `--local`）。
> 未執行前，線上聚會 API 會因表不存在而失敗。

**為何可以即做（原為階段二）**：spec §5.1 將「逐人投票／RSVP」列階段二，前置為 SSO。但 **per-member 登入**（`member_auth` + `family_session` + `getCurrentMember` 回 `primaryMemberId`）已於較早 session 交付 —— 每位家人各自裝置有自己身份，前置條件消失，故階段一＋二一併落地。

### A. 資料（migration 0015）
- `gathering`：聚會主體（場合／對象／標題／目標日期／status：draft→voting→confirmed／cancelled／`invite_post_id`）。
- `gathering_option`：候選項 —— `kind` = `date`／`place`／`cake`／`gift`、商戶（可空）、日期／時間、**取貨地點**、**負責人**、status（candidate／confirmed／dropped）。
- `gathering_vote`：逐人投票（`UNIQUE(option_id, voter_member_id)`，可改／可收回）。

### B. API（新）
`/api/gatherings`（GET 清單／POST 發起）｜`/api/gatherings/[id]`（GET 詳情＋票數＋我嘅一票、PATCH 改／確認／取消、DELETE）｜`/api/gathering-options`（POST）｜`/api/gathering-options/[id]`（PATCH／DELETE）｜`/api/gathering-votes`（POST）。共用 helper：`functions/api/_gatherings.ts`。

### C. 關鍵行為
- **忌辰（memorial）API 層禁止發起聚會**（回 400）—— 唔靠前端藏按鈕（rules §23 / spec §7）。忌辰提醒卡「去安排」只跳莊重分支（鮮花／拜祭，零廣告）。
- `date`／`place` 屬唯一類別：確認一項 → 同類其他自動 `dropped`；`cake`／`gift` 可確認多項。
- 投票 = upsert（yes／no／maybe，`choice='none'` 收回）；身份 = 登入者 `primaryMemberId`。
- 首次加候選 → 聚會自動 `draft → voting`。
- **確認聚會 → 自動生成家庭圈邀請卡**（`posts` 單向同步：標題／日期／地點／蛋糕取貨；封面用已確認地點商戶相片）；取消或刪除聚會會一併清走貼文。
- 加候選時商戶必須 `is_listed = 1`（沿用 merchant 准入）。

### D. 前端
- `#/gather/:id` → `GatherDetail`：最終安排 + 四類候選（投票／確認／負責人／一鍵聯絡）+ 狀態動作（確認／重新開放／取消／刪除／分享邀請卡）。
- `FamilyGather` 加「我的聚會」＋「發起聚會」（`GatherList`／`GatherPlanForm`／`GatherAddOption`／`GatherOptionCard`／`gatherStyles.ts`）；純邏輯 `utils/gatherPlan.ts`、client `utils/gatherApi.ts`。
- 忌辰場景唔顯示「發起聚會」；提醒卡「去安排」帶 `?plan=1&occasion=&subject=&date=` 自動開表單。

### E. 測試
- `scripts/test-gathering-e2e.mjs` **30/30**：未登入 401、忌辰攔截、建立、候選、商戶資料、投票 upsert／收回、唯一類別落選、蛋糕取貨、確認 → 邀請卡內容、取消 → 清卡、刪除 → 404。
- `scripts/test-gather-plan.mjs` **26/26**（純邏輯）；`test-gather-scenes.mjs` 10/10。
- 本機跑法：`npx wrangler d1 migrations apply coeldery-family-tree-db --local` → 種測試資料（見測試檔頭註解）→ `npx wrangler pages dev dist --d1=coeldery-family-tree-db --local --port 8787` → `node scripts/test-gathering-e2e.mjs`。

### F. 本地 D1 小插曲（教訓）
- 本機 `d1 migrations apply --local` 於 0014 報 `duplicate column name: synced_post_id`（本機早前已手動加過該欄）→ 手動補一筆 `d1_migrations` 記錄後，0015 正常套用。**改 schema 後記得同步本機 migration 記錄，否則 apply 會中途停低。**

