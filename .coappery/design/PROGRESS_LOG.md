CoEldery 家族樹 — 進度 LOG + 修復計劃（source of truth）
已定案設計（唔再當未決定）
一人可以喺多棵樹，已確認並設計。落地細節（待我讀 product_decisions.md/memory_vault.md 覆核，但方向鎖定）：同一 member_no 可屬多個 family；relationships 係獨立 edge，唔靠 parent_id/spouse_of 指針；record 層（真相）同 display 層（過濾）分離；「主樹」由 _resolvePrimaryTree 規則揀（child edge 最早 → 頂代 → created_at 最早）。電話／member 唯一性應為樹內唯一，唔係全域唯一。

已完成 ✅（今日）
Remote DB 對齊：手動建 member_auth（remote）、補 d1_migrations 0002–0012、verify 所有表齊。DB=coeldery-family-tree-db（尾 7ae8cf09164d）。
四後端檔改用 member_auth：login.ts/members.ts（去 phone 欄）/enter.ts/setup-with-session.ts。已 deploy（commit 20dcf7f）。
FAMILY_TREE_API_KEY 兩邊（coeldery85-com + coeldery-family-tree）換同一新 key，兩邊 redeploy。
確認 family-tree 靠手動 deploy（npm run build + wrangler pages deploy dist），push git 唔自動部署。
做錯 / 兜過嘅路 ❌
曾誤以為 production node 表冇 phone/password_hash/nickname（實為手動 ALTER 加咗）。
曾誤以為淨係要 apply 現成 migration（實為 migration 記錄同實表脫節）。
反覆撞 85AI index.tsx（83KB）工具讀取限制，多次要用戶重貼——待辦：改用 blob API 分段或用戶本地 grep，唔好再硬 raw 讀。
當前策略（用戶拍板）
先擺低 handoff，純用 family-tree 自身 login 行通全套，逐個清 bug；handoff 留最後接返。

待辦清單（一次過改，唔逐個試）
P1 定性「資料共用」：查係 (a) 加人清單列全體會員【正常】定 (b) /api/tree 混咗 family_id【真漏洞】。純調查唔改。
P2 清 password_hash 重測首次設定頁（先 grep 表名先出精準 SQL；WHERE 限 coeldery85_member_id）。
P3 login 鬼打牆：成功後 window.location.assign('/')（GitHub 4760f1a 疑已做，待驗）。
P4 加成員 error handling：check res.ok+data.ok，ok:false 出紅字唔當成功。
P5 一人多樹落實：grep「已登記/UNIQUE」check → 改全域唯一為樹內唯一；relationships.ts 放寬 same-family_id 硬檢查；對齊主樹邏輯。
Backlog：SESSION_DAYS 抽共用常數；relationships.ts POST 加 auth；www vs 非-www 域名統一；去掉 members.ts 硬編碼「陳家」。
