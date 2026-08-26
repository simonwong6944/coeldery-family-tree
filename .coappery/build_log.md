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
