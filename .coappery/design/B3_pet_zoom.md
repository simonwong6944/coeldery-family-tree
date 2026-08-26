（Design Prompt — CoEldery 85「家庭樹」B3 加入家人精靈（寵物版 wizard 放大版）
圖片已生成。三部大手機並排：A 第 1 步揀類型 / B 第 2 步填寫寵物資料 / C 第 4 步完成（寵物版）。下方為完整設計 prompt，可直接餵俾前端工具 build。

1. 圖片總覽
格式：單張高擬真 16:9 design review 板
內容：3 部 iPhone 9:16 portrait 手機並排
對象：香港 60+ 長者
風格：Minimal、溫暖、長者友善
語言：全繁體中文（香港用語），絕無簡體字
設計同步：與 B1（家庭樹主頁）/ B2（成員詳情）共用同一組 design tokens，視覺一致
2. 共用 Design Tokens（三 frame 一致）
2.1 色彩（Hex，嚴格跟足）
Token	Hex	用途
--green-primary	#228B22	CTA、關係、進度點、選中 chip、剔號、聚焦邊框
--red-accent	#FF2800	僅限通知點；本圖幾乎唔會用
--bg-cream	#faf7f0	頁面背景
--surface-card	#ffffff	卡片底色
--text-primary	#2b2b2b	主要文字
--text-muted	#6b6b6b	次要文字、helper
--divider	#e2ddd2	空心指示點外框、輸入框 border
--shadow-soft	0 2px 8px rgba(0,0,0,0.08)	卡片柔和陰影
--shadow-cta	0 4px 12px rgba(34,139,34,0.25)	CTA 綠色光暈
🚫 禁止：CoAppery orange #F97316、粉紅色、大面積紅、簡體字、icon-only 按鈕、placeholder 假名（User、#228B22、lorem ipsum）。

2.2 字體
中文：Noto Sans TC Bold（思源黑體 Bold）
英文 / 數字：Montserrat Bold
Fallback："PingFang HK", "Microsoft JhengHei", sans-serif
2.3 字級（放大版規格）
用途	Size	Weight
大標題	26px	Bold
輸入框 label / 已填值	18px / 20px	Regular / Bold
Chip 文字	18px	Bold
按鈕文字	18px	Bold
Helper / 次要文字	16px	Regular muted
2.4 尺寸 / 圓角 / 點擊區
點擊熱區：≥ 44×44px
主 CTA 高度：≥ 56px
輸入框高度：≥ 64px
Chip 高度：≥ 52px
卡片圓角：16px
Pill 按鈕圓角：28px
Spacing scale：8 / 12 / 16 / 24 / 32
2.5 共用結構
每部機頂都有 Step Indicator：

4 個圓點橫排（當前 #228B22 實心 ●，其餘 #e2ddd2 空心 ○）
旁註 第 X 步 / 共 4 步（16px muted）
Padding：上下 12px，左右 16px
位置：頂部列之上額外一行
每部機共用：

頂部列 56px：返回 + 標題「加入家人」+ 右側細 icon；底部 1px --divider
底部 Tab Bar 80px：4 tab（家庭樹 active 家庭樹 / 家庭圈 / 家庭聚會 / 我的推薦），每 tab icon + 18px Bold 文字，當前 tab 用 #228B22 + 頂 3px 綠指示條
所有 icon 旁必配文字（禁止 icon-only）
3. FRAME 1 — 放大 A：第 1 步「揀類型」
3.1 Step Indicator
● ○ ○ ○　第 1 步 / 共 4 步

3.2 內容結構
頂部列（緊湊）

大標題（置中 26px Bold）：「你想加邊位家人？」

24px 空隙

兩張超大型選擇卡（每張 ≥ 140px 高，佔畫面大半）：

16px 圓角、柔和陰影 0 4px 14px rgba(0,0,0,0.06)
卡片左側 48px 大 icon，右側 bold 20px 標題 + 16px muted 副標
整卡 tap area 巨大
卡間距 16px
卡	Icon	標題 20px Bold	副標 16px muted
A	👨‍👩‍👧 48px	家庭成員（人）	仔、女、孫仔、大新抱、配偶⋯⋯
B	🐾 48px	寵物	貓、狗、雀仔、魚⋯⋯
底部 pill「下一步」（#228B22 + 白字 18px Bold、≥ 56px 高、28px 圓角、green glow shadow）

4. FRAME 2 — 放大 B：第 2 步「填寫寵物資料」（重點 hero frame）
4.1 Step Indicator
○ ● ○ ○　第 2 步 / 共 4 步

4.2 內容結構
頂部列
大標題（26px Bold）：「填寫寵物資料」
24px 空隙
兩個大字輸入框（每個 ≥ 64px 高、16px 圓角、白底、1px solid #e2ddd2 邊框、padding 16px）：
輸入 1「寵物名」：
左內側 🐾 paw icon prefix（綠色）
已填值：「Lucky」（20px Bold #2b2b2b）
輸入 2「寵物生日」：
左內側 📅 calendar icon 或 paw‑birthday icon（綠色）
已填值：「2025年3月10日」（20px Bold #2b2b2b）
Helper text（輸入 2 下方 16px muted）： 用嚟自動提你寵物生日 🐾
24px 空隙
主人多選區：
Label（18px Bold）：「👤 主人（可多選）」
Wrap chip pills（每個 ≥ 52px 高、28px pill 圓角、間距 12px）：
已選 chips：filled #228B22 背景 + 白字 18px Bold，含 ✓ 號
陳大文 ✓
陳太 ✓
未選 chips：白底 + 2px #228B22 邊框 + #228B22 18px Bold 文字
孫仔
孫女
底部 row（間距 16px）：
左：次要文字掣 ← 上一步（純文字、muted gray、無 fill）
右：主 pill 下一步（#228B22 + 白字 18px Bold、≥ 56px 高、28px 圓角、green glow shadow）
底部 Tab Bar（家庭樹 active）
4.3 多選 chip 互動規範
Tap chip → 即時 toggle 選中狀態（綠底 ↔ 白底綠邊）
至少 1 個 chip 選中時「下一步」先 enable；全部唔選時 muted 顯示
揀過嘅 chip 順序保留，唔影響下一頁預設
5. FRAME 3 — 放大 C：第 4 步「完成」（寵物版）
5.1 Step Indicator
○ ○ ○ ●　第 4 步 / 共 4 步

5.2 內容結構
頂部列
48px top padding 將英雄元素推到視覺中線
巨大森林綠剔號：
圓形 #228B22 底，~140px 直徑
內含白色 SVG-style 剔號（10px stroke，clean SVG 而非 emoji 風格）
可加極淡外圈 rgba(34,139,34,0.18) 6px 光暈
32px 空隙
慶祝 headline（24px Bold #228B22）：「成功加入！🎉」
16px 空隙
溫暖字幕（18px regular #6b6b6b）：「Lucky 而家喺你嘅家庭樹啦 🌳」
48px 空隙
主 pill「返回家庭樹」：
背景 #228B22、白字 18px Bold、≥ 56px 高、28px 圓角、水平 padding ≥ 32px
green glow shadow 0 4px 12px rgba(34,139,34,0.25)
底部 Tab Bar（家庭樹 active）
5.3 完成步互動規範
剔號入場動畫：scale 0.6 → 1.0 spring（duration ~480ms）
headline 字幕 fade-in（200ms delay 後 320ms ease-out）
底部 pill 喺 headline 入場完成後 100ms 內 fade-in
用戶撳「返回家庭樹」→ 路由回首頁 B1（新加入嘅 household 卡會有 1.5s 淡綠光暈 highlight）
6. 無障礙 / 長者規範（全圖通用）
Body 文字 ≥ 18px；helper 16px 最細
點擊區 ≥ 44×44px；輸入框 ≥ 64px；chip ≥ 52px；CTA ≥ 56px
對比：主文字 vs 米白 ≥ 7:1；綠色 vs 米白 ≥ 4.5:1
紅點永遠帶 2px 白外圈（唔可以純靠顏色區分）
全部 icon 旁配文字
觸控以單軸捲動為主（精靈步之間切換用整頁轉場，唔可以多軸同時）
內容語言：繁體中文（香港用語）；用 大新抱、大仔、阿女、孫仔、孫女、細仔、本人、太太、阿太 等本地稱謂
7. 嚴格不做（全圖）
❌ 付款 / 交易 / 金流 UI
❌ 簡體中文字
❌ 粉紅色、CoAppery orange #F97316
❌ Icon-only 按鈕
❌ 大面積 red surface
❌ Desktop / 寬版 layout
❌ 冷漠空狀態風格
❌ Placeholder（User、#228B22、lorem ipsum）
8. 過場與節奏（前端實作補充）
Step 切換過場：前進 slide‑from‑right（240ms ease-out）/ 後退 slide‑from‑left（240ms ease-in）
Step indicator 進度點：dot scale-spring（0.8 → 1.0，280ms）
揀類型卡：ripple press + 邊框由 #e2ddd2 變 #228B22 + 2px（160ms ease）
多選 owner chip：fade + scale‑spring toggle（200ms）
完成步剔號：precise SVG 描繪，唔用 emoji，保證清晰
完成步文案：fade-in stagger（剔號 → headline → subtitle → CTA），間隔 120ms）
