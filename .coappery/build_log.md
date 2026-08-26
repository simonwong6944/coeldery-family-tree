# CoEldery 85 家庭樹 — Build Log

> 本檔記錄每個細步嘅執行紀錄，依 rules.md 第 7 條（GitHub 防呆）要求，每細步完成後必須填齊以下八個欄位。

---

## [細步 1.5-A][實時紀錄] 設計規範入庫(B1/B2_B3/B3_pet_zoom + mockups)

### 1. 完整指令原文
任務：細步 1.5（第一批）— 設計規範入庫

任務性質：純檔案寫入。唔准寫任何 code、UI、component，唔准改動現有 src/ 內容。以下三份文字必須「一字不改」原封存入，包括表格、emoji、hex 值、禁止項清單。

Part 1 — 建立設計規範檔案：喺 repo 建立資料夾 .coappery/design/，並建立以下三個檔案：
- .coappery/design/B1.md
- .coappery/design/B2_B3.md
- .coappery/design/B3_pet_zoom.md

Part 2 — Mockup URL 附錄：喺 .coappery/design/ 建立 mockups.md，記低三張已核准 mockup 嘅 URL。

Part 3 — Build Log 實時紀錄：喺 .coappery/build_log.md append 一條 entry。

完成後 push 到 main，回報客觀證據。

### 2. 執行計畫
1. 建立 .coappery/design/ 資料夾
2. 逐一寫入 B1.md、B2_B3.md、B3_pet_zoom.md（一字不改原文）
3. 建立 mockups.md（三條 URL + 附註）
4. 建立 build_log.md（本 entry）
5. git add + commit + push main
6. 回報客觀證據（hash、timestamp、檔案清單、行數）

### 3. 檔案變更清單
- 新增：.coappery/design/B1.md
- 新增：.coappery/design/B2_B3.md
- 新增：.coappery/design/B3_pet_zoom.md
- 新增：.coappery/design/mockups.md
- 新增：.coappery/build_log.md（本檔）

### 4. 執行過嘅 Command
```
mkdir -p /home/user/coeldery-family-tree/.coappery/design
# 逐一 Write 五個檔案（Write tool，非 shell command）
git -C /home/user/coeldery-family-tree add .
git -C /home/user/coeldery-family-tree commit -m "細步 1.5-A：設計規範入庫..."
git -C /home/user/coeldery-family-tree push origin main
```

### 5. 所有 Error 與 Retry
無

### 6. 最終 Commit Hash + Timestamp
（將於 push 完成後填入）
— commit hash: [見下方 push 輸出]
— timestamp: [見下方 push 輸出]

### 7. 未解決事項
- Core Document v4 將於細步 1.5-B 入庫

### 8. src/ 改動確認
本細步唔改任何 src/ 內容，純 .coappery/ 資料夾操作。

---

## [細步 1.5-B][實時紀錄] Core Document v4 入庫

### 1. 完整指令原文
任務：細步 1.5-B — Core Document v4 入庫

任務性質：純檔案寫入。唔准寫任何 code、UI、component，唔准改動 src/ 或 .coappery/design/ 內容。以下 Core Document 全文必須「一字不改」原封存入，包括章節編號、表格、清單、術語。

Part 1 — Core Document 入庫：將 CoEldery 85 家庭樹系統 Core Document 最終版 v4 完整存入 .coappery/memory_vault.md。若已存在：喺檔尾加一條分隔線 ---，再加標題 ## Core Document v4，之後 append 全文。不得覆寫或刪除現有內容。

Part 2 — Build Log 實時紀錄：喺 .coappery/build_log.md append 一條 entry，標題 ## [細步 1.5-B][實時紀錄] Core Document v4 入庫，依 rules.md 第 14 條填齊八個欄位。

完成後 push 到 main，回報六項客觀證據。

### 2. 執行計畫
1. 讀取現有 memory_vault.md 確認內容（已有 13 行）
2. 喺檔尾 append 分隔線 + ## Core Document v4 標題 + 全文（一字不改）
3. 確認行數及 Core Document v4 區段起始/結束行號
4. Append 本 entry 至 build_log.md
5. git add + commit + push main
6. 回報六項客觀證據

### 3. 檔案變更清單
- 修改：.coappery/memory_vault.md（append Core Document v4，原 13 行 → 100 行）
- 修改：.coappery/build_log.md（append 本 entry）
- 無改動：src/、.coappery/design/ 四個檔案

### 4. 執行過嘅 Command
```
# 讀取 memory_vault.md（Read tool）
# Edit tool append Core Document v4 至 memory_vault.md 檔尾
# Edit tool append 本 entry 至 build_log.md
git -C /home/user/coeldery-family-tree add .coappery/memory_vault.md .coappery/build_log.md
git -C /home/user/coeldery-family-tree commit -m "細步 1.5-B：Core Document v4 入庫..."
git -C /home/user/coeldery-family-tree push origin main
```

### 5. 所有 Error 與 Retry
無

### 6. 最終 Commit Hash + Timestamp
（將於 push 完成後填入 — 見 GitHub commit 紀錄）

### 7. 未解決事項
無（細步 1.5-A 遺留嘅 Core Document v4 入庫工作已完成）

### 8. src/ 改動確認
本細步唔改任何 src/ 內容，亦唔改 .coappery/design/ 任何檔案。
只修改 .coappery/memory_vault.md（append）及 .coappery/build_log.md（append）。

---

## [細步 3a][實時紀錄] B 組共用件 module + B1 靜態

### 1. 完整指令原文
任務：細步 3a — 建立 /packages 共用件 module + B1 靜態 UI

任務性質：靜態 UI only。唔准寫任何互動邏輯、state management、mock data 陣列、carousel autoplay/swipe、B2/B3 頁，唔准安裝 rules.md 未列明嘅 npm 套件。

Part 1 — 建立四個共用 module（靜態 UI，放 /packages）：
- @coeldery/top-bar：56px 頂欄，返回鍵（文字按鈕）+ 置中標題（prop）+ 右側 icon slot，底 1px divider。
- @coeldery/bottom-tab-bar：80px，4 tab（家庭樹/家庭圈/家庭聚會/我的推薦），icon + 文字（≥18px Bold），active tab 用 #228B22 + 頂 3px 綠條。current tab 由 prop 傳入。
- @coeldery/household-card：白底 16px 圓角柔和陰影；支援夫婦並排頭像 + 綠色實心心形、單人版單頭像、可選寵物頭像（paw badge + 淺底）。全部資料由 props 傳入，唔內置 mock。
- @coeldery/upload-panel：「+ 上傳相片/短片」按鈕 + 選擇面板 UI 殼，唔做真實上傳或 R2 整合，但 docs 須註明未來 state machine（pending → uploading → verified 200 → db_write → completed）。

Part 2 — 用上述 module build B1「家庭樹」靜態頁（src/pages/）。

Part 3 — Build Log 實時紀錄。

### 2. 執行計畫
1. 讀取 B1.md、rules.md、index.css、zh-Hant.json
2. 更新 locales/zh-Hant.json（加入所有新 i18n keys）
3. 建立 packages/top-bar/index.tsx + module.json
4. 建立 packages/bottom-tab-bar/index.tsx + module.json
5. 建立 packages/household-card/index.tsx + module.json
6. 建立 packages/upload-panel/index.tsx + module.json
7. 建立 src/pages/B1HomePage.tsx（靜態，三代，用 4 modules）
8. 更新 src/App.tsx → render B1HomePage
9. npm run build → 確認零 error
10. Append 本 entry 至 build_log.md
11. git add + commit + push main
12. 回報 5-point evidence

### 3. 檔案變更清單
- 修改：locales/zh-Hant.json（大幅擴充，加入所有 i18n keys）
- 新增：packages/top-bar/index.tsx
- 新增：packages/top-bar/module.json
- 新增：packages/bottom-tab-bar/index.tsx
- 新增：packages/bottom-tab-bar/module.json
- 新增：packages/household-card/index.tsx
- 新增：packages/household-card/module.json
- 新增：packages/upload-panel/index.tsx
- 新增：packages/upload-panel/module.json
- 新增：src/pages/B1HomePage.tsx
- 修改：src/App.tsx（改 import B1HomePage）
- 修改：.coappery/build_log.md（append 本 entry）

### 4. 執行過嘅 Command
```
mkdir -p /home/user/coeldery-family-tree/packages/top-bar
mkdir -p /home/user/coeldery-family-tree/packages/bottom-tab-bar
mkdir -p /home/user/coeldery-family-tree/packages/household-card
mkdir -p /home/user/coeldery-family-tree/packages/upload-panel
# 逐一 Write 各 index.tsx 及 module.json（Write tool）
# Edit tool 更新 src/App.tsx
cd /home/user/coeldery-family-tree && npm run build
git -C /home/user/coeldery-family-tree add .
git -C /home/user/coeldery-family-tree commit -m "細步 3a：4 packages modules + B1 靜態 UI"
git -C /home/user/coeldery-family-tree push origin main
```

### 5. 所有 Error 與 Retry
無 — 首次 build 即成功（exit code 0，48 modules transformed，583ms）。

### 6. 最終 Commit Hash + Timestamp
（push 完成後見下方 git log 輸出）

### 7. 未解決事項
- UploadPanel isOpen 狀態由父層控制（細步 3a 靜態 UI 暫不做真實開關 state，props interface 已預留）
- Gen 2 / Gen 3 carousel swipe 互動留待後續細步實作
- B2（成員詳情）、B3（加入家人流程）頁面留待後續細步

### 8. src/ 改動確認
本細步修改：
- src/App.tsx（更換 import，render B1HomePage）
- src/pages/B1HomePage.tsx（新增，靜態 B1 主頁）
- locales/zh-Hant.json（大幅擴充 i18n keys）
- packages/ 新增四個 module（唔改其他現有 src/ 檔案）
- npm run build 結果：✅ exit code 0，零 TypeScript error，零 build error。

---

## [細步 3a-fix][實時紀錄] 規範修正 + 全面轉正式書面繁中

### 1. 完整指令原文
任務：細步 3a-fix — 規範修正 + 全面轉正式書面繁中

任務性質：只修正與文案轉換，不加新功能、不改頁面結構、不改組件 props interface（保持向下相容）。

Part 1：新增 rules.md 第 15 條（語體規範）
Part 2：稱謂對照表寫入 memory_vault.md
Part 3：全 app 文案轉正式書面繁中（更新 locales/zh-Hant.json）
Part 4：消除硬編中文（改用 i18n）— household-card PetAvatar、B1HomePage PeekCard + IndicatorDots aria-label、bottom-tab-bar dead code 清除
Part 5：消除全部 hardcode rgba（新增 CSS shadow 變數，全 repo 替換）
Part 6：TopBarRightSlot icon label 12px → 16px Bold；建立 Pending Changes Log（關係標籤字級矛盾待決）
Part 7：Build Log 實時紀錄

### 2. 執行計畫
1. 讀取 rules.md、B1.md、zh-Hant.json、index.css、所有 packages、B1HomePage
2. Append 第 15 條至 rules.md
3. Append 稱謂對照表至 memory_vault.md
4. 全面改寫 locales/zh-Hant.json（書面繁中，稱謂表，新增 household_of / common.indicator_position keys）
5. household-card PetAvatar：顯示文字改用 t('household_card.pet_label', {...})
6. bottom-tab-bar：刪走 TabConfig.icon 及 TabConfig.ariaLabel 兩個 dead code 欄位
7. B1HomePage：PeekCard 改用 t('gen2.household_of')，IndicatorDots aria-label 改用 t('common.indicator_position')
8. index.css 新增 6 個 shadow/overlay CSS 變數
9. 全 repo 替換 hardcode rgba → var(...)（household-card 3 處，B1HomePage 3 處，upload-panel 3 處）
10. TopBarRightSlot icon label fontSize 12px → 16px Bold
11. 建立 .coappery/pending_changes.md，登記關係標籤字級 16px vs 18px 矛盾待決項
12. npm run build → 確認零 error
13. Append 本 entry 至 build_log.md
14. git add + commit + push main
15. 回報七項客觀證據

### 3. 檔案變更清單
- 修改：.coappery/rules.md（append 第 15 條語體規範）
- 修改：.coappery/memory_vault.md（append 書面稱謂對照表）
- 新增：.coappery/pending_changes.md（關係標籤字級矛盾待決）
- 修改：locales/zh-Hant.json（全面正式書面繁中，新增 household_of / common.indicator_position）
- 修改：packages/household-card/index.tsx（PetAvatar 顯示改 t()，3 處 rgba → var）
- 修改：packages/bottom-tab-bar/index.tsx（刪 TabConfig.icon + ariaLabel dead code）
- 修改：packages/upload-panel/index.tsx（3 處 rgba → var）
- 修改：src/index.css（新增 6 個 shadow/overlay CSS 變數）
- 修改：src/pages/B1HomePage.tsx（PeekCard i18n，IndicatorDots aria-label i18n，3 處 rgba → var，icon label 12px→16px）
- 修改：.coappery/build_log.md（append 本 entry）

### 4. 執行過嘅 Command
```
# 全部為 Read / Edit / Write / MultiEdit tool 操作
cd /home/user/coeldery-family-tree && npm run build
git -C /home/user/coeldery-family-tree add .
git -C /home/user/coeldery-family-tree commit -m "細步 3a-fix：規範修正 + 全面轉正式書面繁中"
git -C /home/user/coeldery-family-tree push origin main
```

### 5. 所有 Error 與 Retry
- Part 4 第一次 MultiEdit 嘗試同時修改 IndicatorDots + PeekCard，IndicatorDots 部分因 old_string 不匹配失敗；改用獨立 Edit tool 重做，成功。
- 右側 PeekCard 第一次 edit 因 old_string 含錯誤字元失敗；確認實際行內容後重做，成功。

### 6. 最終 Commit Hash + Timestamp
（push 完成後見 git log 輸出）

### 7. 未解決事項
- 關係標籤字級 16px vs 18px 矛盾：已登記 .coappery/pending_changes.md，待產品負責人決策。

### 8. src/ 改動確認
本細步修改：
- src/index.css（新增 6 個 shadow/overlay CSS 變數，無其他變動）
- src/pages/B1HomePage.tsx（PeekCard i18n / IndicatorDots aria-label i18n / rgba 替換 / icon label 16px）
- locales/zh-Hant.json（全面書面繁中 + 新 key）
- packages/household-card/index.tsx（PetAvatar t() / rgba 替換）
- packages/bottom-tab-bar/index.tsx（dead code 清除）
- packages/upload-panel/index.tsx（rgba 替換）
- 不改：src/App.tsx、src/utils/i18n.ts、src/pages/HomePage.tsx、packages/top-bar/
- npm run build 結果：待確認（見下方 build log）

---

## [細步 3a-fix-2][實時紀錄] 頂欄純 icon + 紅心 + 卡自適應 + peek 露半卡

### 1. 完整指令原文
任務：細步 3a-fix-2 — 頂欄純 icon + 紅心 + 卡片自適應 + peek 露半卡

任務性質：只修正靜態 UI 與規範文件，不加任何互動、state、mock array、swipe handler、autoplay 或新 npm 套件。

第一部分：更新 .coappery/rules.md（新增第16條頂欄輔助圖示例外；修改第15條色彩限制，允許 --color-accent 用於情感裝飾心形）
第二部分：更新 .coappery/design/B1.md（§2.3 新增純 icon 說明；夫婦心形由 --color-primary 改為 --color-accent；表格、互動章節同步更新）
第三部分（程式碼）：
  3a. 頂欄純 icon：移除文字標籤，改統一 line-style SVG（IconAddMember / IconShare / IconBell）；TopBar 改三欄 flex 佈局取代 absolute 置中
  3b. 心改紅色：household-card HeartIcon fill 改為 var(--color-accent)
  3c. 卡片闊度自適應：Gen2 focused 卡改 flex 1 1 auto + min-width 0 + maxWidth 320px
  3d. peek 露半張真卡：PeekCard 移除 writing-mode 直排文字，改為 overflow:hidden + translateX 偏移露出真實 HouseholdCard 的邊緣（opacity 0.5 + grayscale 15% + scale 0.92）
第四部分：locales/zh-Hant.json 移除已不再使用的 household_of / peek_left_hint / peek_right_hint 三個 key
第五部分：Build Log 實時紀錄

### 2. 執行計畫
1. 讀取 rules.md、B1.md、memory_vault.md、src/index.css、B1HomePage.tsx、household-card/index.tsx、top-bar/index.tsx、zh-Hant.json、build_log.md
2. 更新 rules.md：第1條色彩（accent 例外）+ 第2條（icon-only 例外連結）+ 第15條末（新增第16條）
3. 更新 B1.md：§2.3 末加純 icon 說明；Gen1/Gen2 心形色改 --color-accent；表格 + 互動行更新
4. 重寫 src/pages/B1HomePage.tsx：三個 line-style SVG icon；TopBarRightSlot 純 icon；PeekCard 改真卡露半；Gen2 focused 卡 flex 自適應
5. 更新 packages/top-bar/index.tsx：三欄 flex 佈局（取代 h1 absolute 置中）
6. 更新 packages/household-card/index.tsx：HeartIcon fill 改 var(--color-accent)
7. 更新 locales/zh-Hant.json：移除 household_of / peek_left_hint / peek_right_hint
8. npm run build 確認零 error
9. 執行驗證 grep（rgba / 粵語 / writing-mode / props interface / rules.md / B1.md）
10. Append 本 entry 至 build_log.md
11. git add + commit + push main
12. 回報八項客觀證據

### 3. 檔案變更清單
- 修改：.coappery/rules.md（第1條 accent 例外 + 第2條連結 + 新增第16條）
- 修改：.coappery/design/B1.md（§2.3 純 icon 說明；Gen1/Gen2 心色 + 表格 + 互動章節）
- 修改：src/pages/B1HomePage.tsx（三個 SVG icon；純 icon rightSlot；PeekCard 真卡露半；Gen2 flex 自適應；移除 PeekCard 直排文字）
- 修改：packages/top-bar/index.tsx（三欄 flex 佈局）
- 修改：packages/household-card/index.tsx（HeartIcon fill → var(--color-accent)）
- 修改：locales/zh-Hant.json（移除 household_of / peek_left_hint / peek_right_hint）
- 修改：.coappery/build_log.md（append 本 entry）

### 4. 執行過嘅 Command
```
# 全部為 Read / Edit / Write / MultiEdit tool 操作
cd /home/user/coeldery-family-tree && npm run build
grep -rniE "rgba\(" src/ packages/ locales/
grep -rnE "嘅|喺|咗|啦|㗎|屋企|撳|而家|邊個|邊位|唔該|幾多" src/ packages/ locales/
grep -rn "writing-mode" src/ packages/
git add .
git commit -m "細步 3a-fix-2：頂欄純 icon + 紅心 + 卡自適應 + peek 露半卡"
git push origin main
```

### 5. 所有 Error 與 Retry
無 — 首次 build 即成功（exit code 0，48 modules transformed，407ms）。

### 6. 最終 Commit Hash + Timestamp
（push 完成後填入）

### 7. 未解決事項
- 關係標籤字級 16px vs 18px 矛盾：已登記 .coappery/pending_changes.md，待產品負責人決策（沿用 3a-fix 登記）。
- B1.md token 表第13行仍寫「僅限通知紅點 + 新動態紅點」——本細步修正了 Gen1/Gen2 心形及互動章節描述，但 §2.1 token 表 --red-accent 說明未同步更新（留待下一 fix 決定是否修改 token 表，避免過度改動設計規範）。

### 8. src/ 改動確認
本細步修改：
- src/pages/B1HomePage.tsx（頂欄純 icon SVG / PeekCard 真卡露半 / Gen2 flex 自適應）
- packages/top-bar/index.tsx（三欄 flex 佈局）
- packages/household-card/index.tsx（HeartIcon 改 --color-accent）
- locales/zh-Hant.json（移除 3 個廢棄 key）
- 不改：src/App.tsx、src/index.css、src/utils/i18n.ts、packages/bottom-tab-bar/、packages/upload-panel/
- npm run build 結果：✅ exit code 0，零 TypeScript error，零 build error，48 modules，407ms。
- rgba() grep：只命中 src/index.css（CSS 變數定義）✅
- 粵語 grep：零命中 ✅
- writing-mode grep：零命中 ✅
- props interface：MemberInfo / PetInfo / HouseholdCardProps / TopBarProps / BottomTabBarProps / UploadPanelProps 全部未變 ✅

---

## [細步 3a-fix-3][實時紀錄] app 名老有樹 + 中層卡修正 + 真人頭像 + 桌面置中限寬

### 1. 完整指令原文
任務：細步 3a-fix-3 — 改 app 名 + 修中層卡窄 bug + 真人頭像 mockup + 桌面置中限寬

任務性質：只修正靜態 UI，不加任何互動、state、swipe handler、autoplay 或新 npm 套件（placeholder 圖片只用外部 URL，不入 repo）。

第一部分：頂欄 app 名改「老有樹」— 修改 locales/zh-Hant.json 之 top_bar.title。底部四 tab 名稱維持原樣。
第二部分：修中層 focus 卡在手機下比上下層窄之 bug — B1HomePage.tsx Gen2 carousel band 改用 position relative 容器，peek 卡改為 position absolute 疊加，focus 卡 width calc(100% - 32px) 與 Gen1/Gen3 對齊。
第三部分：換真人／真寵物 placeholder 頭像（外部 URL）— 加 avatarUrl 至七個成員 / 寵物資料物件；household-card Avatar + PetAvatar 加 onError fallback；檔案頂部加注解。
第四部分：桌面置中限寬 — src/App.tsx 加 max-width 480px + margin 0 auto wrapper。
第五部分：Build Log 實時紀錄（本 entry）。

### 2. 執行計畫
1. 讀取 B1HomePage.tsx（完整）、household-card/index.tsx、App.tsx、build_log.md
2. Part 1：Edit locales/zh-Hant.json — top_bar.title 改「老有樹」
3. Part 4：Edit src/App.tsx — 加桌面置中 wrapper
4. Part 2+3：MultiEdit B1HomePage.tsx — 頂部注解 + avatarUrl 常數 + 7 成員加 avatarUrl + Gen2 carousel 改 position absolute peek
5. Part 3b：Edit household-card/index.tsx Avatar onError fallback；Edit PetAvatar onError fallback
6. Part 3b：Edit Gen3Member onError fallback（B1HomePage.tsx）
7. Part 5：Append 本 entry 至 build_log.md
8. npm run build 確認零 error
9. 執行驗證 grep（rgba / 粵語 / tab 名 / props interface）
10. git add + commit + push main
11. wrangler pages deploy 回報 Preview URL

### 3. 檔案變更清單
- 修改：locales/zh-Hant.json（top_bar.title: 家庭樹 → 老有樹）
- 修改：src/App.tsx（加桌面置中限寬 wrapper，max-width 480px，margin 0 auto）
- 修改：src/pages/B1HomePage.tsx（頂部注解；7 avatarUrl 常數及成員資料；Gen2 carousel position absolute peek fix；Gen3Member 加 avatarUrl + onError fallback）
- 修改：packages/household-card/index.tsx（Avatar + PetAvatar 各加 onError fallback，fallback div display 邏輯配合）
- 修改：.coappery/build_log.md（append 本 entry）

### 4. 執行過嘅 Command
```
# 全部為 Read / Edit / MultiEdit / Write tool 操作
cd /home/user/coeldery-family-tree && npm run build
grep -rniE "rgba\(" src/ packages/
grep -rnE "嘅|喺|咗|啦|㗎|屋企|撳|而家|邊個|邊位|唔該|幾多" src/ packages/ locales/
grep -n "family_tree\|family_circle\|family_gathering\|my_recommendations" locales/zh-Hant.json
git add .
git commit -m "細步 3a-fix-3：老有樹 + 中層卡修正 + 真人頭像 + 桌面置中限寬"
git push origin main
npx wrangler pages deploy dist --project-name coeldery-family-tree
```

### 5. 所有 Error 與 Retry
- App.tsx boxShadow 首次使用 rgba(0,0,0,0.08) hardcode，grep 發現後改為 var(--shadow-soft)，再次 build 確認通過。
- 其餘首次 build 即成功（exit code 0，48 modules transformed，414ms）。

### 6. 最終 Commit Hash + Timestamp
- commit hash: b31b52abdd9171fea9ab1495944b6f9c91541d35
- timestamp: 2026-08-26 16:10:35 +0000
- branch: main
- Preview URL: https://a061bd02.coeldery-family-tree.pages.dev

### 7. 未解決事項
- 關係標籤字級 16px vs 18px 矛盾：持續登記 .coappery/pending_changes.md，待產品負責人決策。
- Gen2 peek 卡（女兒一家、幼子一家）未加 avatarUrl（非本次範圍，目前仍用首字母 fallback）。
- B1.md token 表第13行 --red-accent 說明未同步（持續留待下次決策）。

### 8. src/ 改動確認
本細步修改：
- src/App.tsx（加桌面置中 wrapper）
- src/pages/B1HomePage.tsx（頂部注解；7 avatarUrl；Gen2 carousel position absolute peek；Gen3Member onError）
- packages/household-card/index.tsx（Avatar + PetAvatar onError fallback）
- locales/zh-Hant.json（top_bar.title 改「老有樹」，底部 tab 名稱未變）
- 不改：src/index.css、src/utils/i18n.ts、packages/top-bar/、packages/bottom-tab-bar/、packages/upload-panel/
- npm run build 結果：✅ exit code 0，零 TypeScript error，零 build error，48 modules，414ms。
- rgba() grep：只命中 src/index.css（CSS 變數定義）✅
- 粵語 grep：零命中 ✅
- Tab 名稱：家庭樹 / 家庭圈 / 家庭聚會 / 我的推薦（未變）✅
- 頂欄標題：「老有樹」✅
- props interface：MemberInfo / PetInfo / HouseholdCardProps / TopBarProps / BottomTabBarProps / UploadPanelProps 全部未變 ✅

---

## [細步 SOP-store][實時紀錄] 兩份 CoAppery SOP 入庫

### 1. 完整指令原文
任務：細步 SOP-store — 將兩份 CoAppery SOP 存入 repo

任務性質：純文件寫入。不得改動 src/、packages/、locales/ 任何檔案，不寫 code、不改 UI。

第一部分：新建 .coappery/SOP_module_development.md，存入「CoAppery 模組化開發 SOP」全文。
第二部分：新建 .coappery/SOP_ai_workflow.md，存入「CoAppery AI 協作開發流程 SOP」全文。
第三部分：於 .coappery/build_log.md append ## [細步 SOP-store] entry，依規則 14 填齊八欄。

完成後 push 到 main，回報 Repo URL、完整 commit hash、timestamp、branch、變更檔案清單、兩份 SOP 行數、src/packages/locales/ 完全未變確認。

### 2. 執行計畫
1. 讀取 .coappery/rules.md、.coappery/memory_vault.md、.coappery/build_log.md 確認現狀
2. Write .coappery/SOP_module_development.md（模組化開發 SOP 全文）
3. Write .coappery/SOP_ai_workflow.md（AI 協作開發流程 SOP 全文）
4. wc -l 確認兩份 SOP 行數
5. Append 本 entry 至 build_log.md
6. git add + git status 確認只有 .coappery/ 內檔案變動
7. git commit + push main
8. 回報六項客觀證據

### 3. 檔案變更清單
- 新增：.coappery/SOP_module_development.md（模組化開發 SOP，67 行）
- 新增：.coappery/SOP_ai_workflow.md（AI 協作開發流程 SOP，93 行）
- 修改：.coappery/build_log.md（append 本 entry）
- 不改：src/、packages/、locales/ 全部未動

### 4. 執行過嘅 Command
```
# 全部為 Read / Write / Edit tool 操作
wc -l .coappery/SOP_module_development.md .coappery/SOP_ai_workflow.md
git add .coappery/SOP_module_development.md .coappery/SOP_ai_workflow.md .coappery/build_log.md
git status
git commit -m "細步 SOP-store：兩份 CoAppery SOP 入庫（模組化開發 + AI 協作流程）"
git push origin main
```

### 5. 所有 Error 與 Retry
- git push 首次失敗（token 過期）；re-run setup_github_environment 後重新注入 token 至 remote URL，push 成功。

### 6. 最終 Commit Hash + Timestamp
- commit hash: c85e08ca713c7e32e0885dea5317f287326b1a28
- timestamp: 2026-08-26 16:49:44 +0000
- branch: main

### 7. 未解決事項
無。兩份 SOP 均為初版（2026-08-26 建立），修訂記錄表已預留，實戰中如需修訂依機制更新。

### 8. src/ 改動確認
本細步完全未改動以下目錄及其所有檔案：
- src/（含 App.tsx、index.css、pages/、utils/）
- packages/（含 top-bar/、bottom-tab-bar/、household-card/、upload-panel/）
- locales/（含 zh-Hant.json）
只新增 / 修改 .coappery/ 目錄內三個文件檔案。npm run build 本步不執行（無 code 變動）。

---

## [細步 design-sync][實時紀錄] 設計規範語體對齊書面繁中

### 1. 完整指令原文
任務：細步 design-sync — 將 .coappery/design/ 內四份設計規範（B1.md、B2_B3.md、B3_pet_zoom.md、mockups.md）的語體，對齊 rules.md 第 15 條（正式書面繁中）及 memory_vault.md 書面稱謂對照表。

任務性質：純文件修訂。不得改動 src/、packages/、locales/ 任何檔案，不寫 code、不改 UI。

改動範圍以兩類分類為準：
- 第一類（改）：會原樣出現於 app 使用者畫面的 UI 文字例子（按鈕、標題、提示語、稱謂標籤、精靈步文案等）
- 第二類（保留）：純設計意圖描述、技術規格說明（如「柔和陰影」「杜絕大面積紅」等）

完成後 push 到 main，回報客觀證據並確認 grep 零命中。

### 2. 執行計畫
1. 讀取 rules.md（第 15 條 grep 模式）、memory_vault.md（書面稱謂對照表）
2. 讀取四份 design 文件全文，逐行分類並標記待改處
3. 對 B1.md 應用修改（分批執行：先 10 處 + 後 2 處補充）
4. 對 B2_B3.md 應用修改（Python 腳本一次替換 18 處，補充 7 處）
5. 對 B3_pet_zoom.md 應用修改（Python 腳本一次替換 6 處，補充 1 處）
6. mockups.md 確認無需修改（純 URL）
7. 執行 grep 驗證，確認殘留命中均為第二類（設計意圖）
8. Append 本 entry 至 build_log.md
9. git add + commit + push main
10. 回報八項客觀證據

### 3. 檔案變更清單
- 修改：.coappery/design/B1.md — 13 處第一類修改
  - §4.3 indicator 例子：「大仔一家」→「長子一家」
  - §5 空狀態鼓勵文案：「你嘅」→「您的」、「屋企人」→「家人」
  - §6 稱謂例子：大仔/大新抱/阿女/孫仔 → 長子/長媳/女兒/孫兒
  - §6 Gen3 標籤：孫仔/孫女 → 孫兒/孫女
  - §6 狀態表：大仔+大新抱/阿女一家/細仔一家/孫仔+孫女 → 長子+長媳/女兒一家/幼子一家/孫兒+孫女
  - §6 Lucky 標籤：「大新抱嘅狗」→「長媳的狗」
  - §6 紅點描述：大新抱 → 長媳
  - §7 互動行為：撳 → 點擊（×7）；嗰對應房嘅仔女 → 對應一家的子女；切房 → 切換家庭
  - §8 稱謂清單：大新抱/阿仔/阿女/孫仔 → 長媳/長子/女兒/孫兒
  - §9 Placeholder 說明：「喺 UI 入面」→「在 UI 畫面中」
  - Gen1 卡描述：「我」「太太」→「本人」「妻子」
- 修改：.coappery/design/B2_B3.md — 25 處第一類修改
  - 成員姓名例子：陳大文/大仔 → 陳大文/長子
  - 「睇佢嘅動態」→「查閱動態」；「去家庭圈，可以」→「前往家庭圈，可」
  - 「大仔嘅成長相簿」→「長子的成長相簿」
  - 關係標籤：「大仔一家嘅狗仔」→「長子一家的狗」
  - 「Lucky 嘅成長相簿」→「Lucky 的成長相簿」
  - 精靈大標題（×2）：「你想加邊位家人？」→「您想加入哪位家人？」
  - chip 副標（×2）：孫仔 → 孫兒；雀仔 → 小鳥
  - 生日 helper（×1）：「用嚟自動提你生日」→「用於自動提醒您的生日」
  - 精靈步 3 標題：「邀請佢加入家庭樹」→「邀請對方加入家庭樹」
  - 精靈步 3 helper：「用WhatsApp掃碼傳送邀請俾佢」→「以WhatsApp掃碼發送邀請」
  - 精靈步 3 footnote：「寵物成員會跳過呢步」→「寵物成員將跳過此步驟」
  - 精靈完成文案（×2）：「大仔而家喺你嘅家庭樹啦」→「長子現已加入您的家庭樹」；「Lucky而家喺你嘅家庭樹啦」→「Lucky現已加入您的家庭樹」
  - §5 稱謂清單：大新抱/大仔/阿女/孫仔/細仔/太太/阿太 → 長媳/長子/女兒/孫兒/幼子/妻子（移除阿太）
  - §2.4 互動規範：撳 → 點擊（×6）
  - 下一步按鈕說明：「點咗先 enable」→「點選後 enable」
- 修改：.coappery/design/B3_pet_zoom.md — 7 處第一類修改
  - 精靈大標題：「你想加邊位家人？」→「您想加入哪位家人？」
  - 卡片副標：孫仔/大新抱/雀仔 → 孫兒/長媳/小鳥
  - 寵物生日 helper：「用嚟自動提你寵物生日」→「用於自動提醒您的寵物生日」
  - 未選 chip：孫仔 → 孫兒
  - 完成文案：「Lucky而家喺你嘅家庭樹啦」→「Lucky現已加入您的家庭樹」
  - §6 稱謂清單：大新抱/大仔/阿女/孫仔/細仔/太太/阿太 → 長媳/長子/女兒/孫兒/幼子/妻子（移除阿太）
  - §5.3 返回互動：「用戶撳」→「用戶點擊」；「新加入嘅」→「新加入的」
- 無改動：.coappery/design/mockups.md（純 URL 記錄，無粵語 UI 文字）
- 修改：.coappery/build_log.md（append 本 entry）

### 4. 執行過嘅 Command
```
# 全部為 Read / Edit / MultiEdit / Python script tool 操作
grep -rnE "嘅|喺|咗|啦|㗎|屋企|撳|而家|邊個|邊位|唔該|幾多|大新抱|大仔|阿女|孫仔|細仔|阿太" .coappery/design/
git add .coappery/design/B1.md .coappery/design/B2_B3.md .coappery/design/B3_pet_zoom.md .coappery/build_log.md
git status
git commit -m "細步 design-sync：設計規範語體對齊書面繁中（Rule 15 + 稱謂表）"
git push origin main
```

### 5. 所有 Error 與 Retry
- B1.md 第二批 MultiEdit（§7 互動行為 + Placeholder）首次失敗（old_string 不匹配）；讀取 B1.md 行 155–183 確認當前確切內容後重試，成功。
- B2_B3.md 第一批 MultiEdit 首個 edit（文件標頭第2行）找不到字串（因含特殊字元 `餵俾`），改用 Python 腳本繞過；其餘 18 處全部成功。
- 第二輪 grep 仍命中 B2_B3.md §2.4 撳（互動規範行），判定需改，補充替換成功。

### 6. 最終 Commit Hash + Timestamp
（push 完成後填入）

### 7. 未解決事項
- 各設計文件文件標頭（header）行及純設計意圖描述行仍含粵語詞（如「嘅」「喺」「咗」等），均已確認為第二類（設計意圖描述，不出現於使用者畫面），依規則保留，非遺漏。

### 8. src/ 改動確認
本細步完全未改動以下目錄及其所有檔案：
- src/（含 App.tsx、index.css、pages/、utils/）
- packages/（含 top-bar/、bottom-tab-bar/、household-card/、upload-panel/）
- locales/（含 zh-Hant.json）
只修改 .coappery/design/ 內三個文件（B1.md、B2_B3.md、B3_pet_zoom.md）及 build_log.md。npm run build 本步不執行（無 code 變動）。

---

## [細步 3b-1][實時紀錄] B2 三個共用 module

### 1. 完整指令原文
任務：細步 3b-1 — 起 B2 三個新共用 module（先 module，後 page）

本步只起三個新 module，唔砌 page、唔改任何現有檔案。不加互動邏輯、不加 state、不加 mock 業務資料（module 只靠 props）、不加 swipe、不加新 npm 套件。所有色彩用 src/index.css 既有 CSS 變數（禁硬編 rgba/hex）；所有文字經 t('key') 並將新 key 加入 locales/zh-Hant.json（正式書面繁中，依 rules.md 第 15 條 + memory_vault 稱謂表）。

三個 module：@coeldery/member-header、@coeldery/photo-album-grid、@coeldery/entry-card。

### 2. 執行計畫
1. 讀取 B2_B3.md §2、rules.md、SOP_module_development.md、src/index.css、packages/household-card/index.tsx（參考 variant + module.json 寫法）、locales/zh-Hant.json
2. 建立 packages/member-header/（index.tsx + module.json）
3. 建立 packages/photo-album-grid/（index.tsx + module.json）
4. 建立 packages/entry-card/（index.tsx + module.json）
5. 更新 locales/zh-Hant.json（加入三個 module 所需 i18n keys）
6. npm run build 確認零 error
7. grep 驗證（rgba / 粵語）
8. Append 本 entry 至 build_log.md
9. git add + commit + push main
10. 回報八項客觀證據

### 3. 檔案變更清單
- 新增：packages/member-header/index.tsx（152 行）
- 新增：packages/member-header/module.json
- 新增：packages/photo-album-grid/index.tsx（226 行）
- 新增：packages/photo-album-grid/module.json
- 新增：packages/entry-card/index.tsx（230 行）
- 新增：packages/entry-card/module.json
- 修改：locales/zh-Hant.json（新增 member_header / photo_album_grid / entry_card 三組 i18n keys）
- 修改：.coappery/build_log.md（append 本 entry）
- 不改：src/、packages/household-card/、packages/top-bar/、packages/bottom-tab-bar/、packages/upload-panel/

### 4. 執行過嘅 Command
```
mkdir -p packages/member-header packages/photo-album-grid packages/entry-card
# Write tool 逐一寫入六個新檔案
# Edit tool 更新 locales/zh-Hant.json
cd /home/user/coeldery-family-tree && npm run build
grep -rniE "rgba\(" src/ packages/
grep -rnE "嘅|喺|咗|啦|㗎|撳|而家|邊個|邊位|大新抱|大仔|阿女|孫仔|細仔|阿太" packages/ locales/
wc -l packages/member-header/index.tsx packages/photo-album-grid/index.tsx packages/entry-card/index.tsx
git add packages/member-header/ packages/photo-album-grid/ packages/entry-card/ locales/zh-Hant.json .coappery/build_log.md
git commit -m "細步 3b-1：B2 三個共用 module（member-header / photo-album-grid / entry-card）"
git push origin main
```

### 5. 所有 Error 與 Retry
- member-header/index.tsx 初版 289 行，超出 SOP 規則 B 上限 250 行；改寫為緊湊風格（inline style 合併），壓縮至 152 行，build 再次通過。

### 6. 最終 Commit Hash + Timestamp
（push 完成後填入）

### 7. 未解決事項
- 三個 module 均為靜態 UI shell，onClick 回調由父層傳入（細步 3b-2 B2 page 砌合時連接）。
- UploadPanel 共用於 B2 相簿區「＋ 上傳相片／短片」按鈕，細步 3b-2 砌 page 時直接引用現有 packages/upload-panel/。

### 8. src/ 改動確認
本細步完全未改動以下目錄及其所有檔案：
- src/（含 App.tsx、index.css、pages/、utils/）
- packages/household-card/、packages/top-bar/、packages/bottom-tab-bar/、packages/upload-panel/（現有四個 module 全部未動）
只新增 packages/ 內三個新 module（6 個新檔案）及更新 locales/zh-Hant.json。
npm run build 結果：✅ exit code 0，零 TypeScript error，零 build error，48 modules，480ms。
rgba() grep：只命中 src/index.css（CSS 變數定義）✅
粵語 grep：packages/ + locales/ 零命中 ✅
三個 module 行數：member-header 152 行 / photo-album-grid 226 行 / entry-card 230 行（全部 ≤250 ✅）
