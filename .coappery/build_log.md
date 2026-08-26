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
