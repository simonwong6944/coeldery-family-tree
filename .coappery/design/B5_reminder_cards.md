Design Prompt（完整文字版） — 老有樹「提醒卡流程 + 事件詳情頁」

0. 全局規範（4 屏一致 · 不可偏離）

0.1 平台
iPhone 9:16 portrait（design baseline 390 × 844）
Mobile max-width ≈ 480px，內 padding 左右 16 px

0.2 設計 Tokens（Hex / 規格）

| Token | Hex / 規格 | 用途 |
|-------|-----------|------|
| --green-primary | #228B22 | 主 CTA、聚焦邊框、品牌強調、tab highlight、揀中 chip |
| --green-glow | rgba(34,139,34,0.25) | 主 CTA 光暈 |
| --green-glow-strong | rgba(34,139,34,0.35) | FAB 光暈（慶祝版） |
| --red-accent | #FF2800 | 僅限 8 px 紅點（帶 2 px 白外圈） |
| --bg-cream | #faf7f0 | 頁面背景 |
| --surface-card | #ffffff | 慶祝卡底色 |
| --bg-engagement | #fafaf2 | 慶祝讚好/祝福摘要 sub-card 底 |
| --bg-solemn | #e8e4da | 忌辰版 header 卡底（暗米褐） |
| --bg-solemn-row | #f0ece4 | 忌辰版思念列 row 底 |
| --text-primary | #2b2b2b | 主要文字 |
| --text-muted | #6b6b6b | 次要文字 |
| --divider | #e2ddd2 | 分隔線 |
| --shadow-soft | 0 2px 8px rgba(0,0,0,0.08) | 卡陰影 |
| --shadow-modal | 0 8px 32px rgba(0,0,0,0.15) | Modal 大陰影 |

🚫 絕對禁止：粉紅色、CoAppery orange #F97316、大面積 red、簡體字、icon-only 按鈕、placeholder 假名、慶祝/商業元素入忌辰版。

0.3 字體
中文：Noto Sans TC Bold
英文 / 數字：Montserrat Bold
Fallback："PingFang HK", "Microsoft JhengHei", sans-serif

0.4 字級

| 用途 | Size | Weight |
|------|------|--------|
| 頂部標題 | 20 px | Bold |
| Header H1 | 22 px | Bold |
| 內文 / Caption | 18 px | Regular |
| Card 標題（行動掣） | 20 px | Bold |
| Card 副標 | 16 px | Regular muted |
| Timestamp | 16 px | Regular muted |
| Button label | 18 px | Bold |

0.5 尺寸 / 圓角 / 點擊區

| 元素 | 規格 |
|------|------|
| 點擊熱區 | ≥ 44 × 44 px |
| 主行動按鈕高度 | ≥ 56 px |
| Card 圓角 | 16 px |
| Pill / Chip 圓角 | 28 px |
| 圖片圓角 | 8 px |
| Spacing scale | 8 / 12 / 16 / 24 / 32 / 48 |

0.6 共用頂底
頂部列 56 px：返回 + 置中標題 + 右側細 icon
底部 Tab Bar 80 px：4 tab — 家庭樹 / 家庭圈 / 家庭聚會 / 我的推薦；active tab = #228B22 + 3 px 綠指示條

---

1. 版本 A — Feed 溫馨提示卡

| # | 元素 | 名稱 / 內容 / 字體 | 位置 / 顏色 / 規格 |
|---|------|-------------------|-------------------|
| 1 | Feed Top Bar | 「家庭圈」 | 56 px；20 px Bold #2b2b2b |
| 2 | Feed 卡（普通） | 陳太 post | 白底 16 r、16 padding、card-shadow；cap 18 reg |
| 3 | 提醒卡 A | 主體 | 白底 16 r、16 padding；左 4 px #228B22 直條作為識別 |
| 3.1 | 細標「溫馨提示」 | 🎂 + 文字 | padding bottom 8 px；14–16 px Bold #228B22 |
| 3.2 | 主標 | 「🎂 陳大文 下個月生日」 | 18 px Bold #2b2b2b |
| 3.3 | 副標 | 「10 月 15 日 · 仲有 30 日」 | margin-top 4 px；16 px Regular #6b6b6b |
| 3.4a | Outline pill 「送上祝福」 | 文字 18 px Bold #228B22 | 白底、2 px solid #228B22 邊框、pill 28 r、高 ≥ 56 px、margin-top 16 px |
| 3.4b | Filled pill 「去安排」 | 文字 18 px Bold #ffffff | #228B22 填色、pill 28 r、高 ≥ 56 px、--shadow-cta 光暈 |
| 4 | 其他普通卡 | 孫女 / 細仔 | 同 post card 規格 |
| 5 | Bottom Tab Bar | 家庭圈 active | 80 px；18 px Bold；active #228B22 + 3 px 綠條 |

互動邏輯：撳「送上祝福」→ inline comment composer（唔跳頁）；撳「去安排」→ push 慶祝詳情頁（Phone 3）。

---

2. 版本 B — 入 App 彈出卡（迫近）

2.1 背景遮罩
底層 feed dim opacity ≈ 0.30
半透明遮罩 rgba(43,43,43,0.55)

2.2 Modal 中央卡（由上而下）

| # | 元素 | 內容 | 規格 |
|---|------|------|------|
| 1 | 大圓頭像 | 陳大文 80 px 直徑 | 2 px solid #228B22 ring |
| 2 | Headline | 「陳大文 明天生日 🎂」 | 22 px Bold #2b2b2b 置中；margin-top 12 px |
| 3 | 溫暖副標 | 「記得同佢講聲生日快樂 💚」 | 18 px Regular #2b2b2b 置中；margin-top 8 px |
| 4 | Primary pill「一鍵祝福」 | 文字 18 px Bold white | #228B22 填色、pill 28 r、≥ 56 px、green-glow 強光暈（0 4px 14px rgba(34,139,34,0.35)）、全寬 |
| 5 | Secondary pill「去安排」 | 文字 18 px Bold #228B22 | 白底 + 2 px solid #228B22 邊框、pill 28 r、≥ 56 px、全寬；margin-top 12 px |
| 6 | Tertiary text「稍後提醒」 | 文字 16 px Regular #6b6b6b | 純文字、padding ≥ 12 px vertical、tap ≥ 44 × 44 px；margin-top 16 px；置中 |

2.3 視覺層次
一鍵祝福 🔴🔴🔴 dominant（實心綠 + glow）
去安排 🔴🔴 secondary（outline 綠）
稍後提醒 🔴 tertiary（純文字 muted）

2.4 互動
「一鍵祝福」→ 預填留言直接 post 入 feed，唔跳頁
「去安排」→ push 慶祝詳情頁（Phone 3）
「稍後提醒」→ set local notification 6 / 12 / 24 小時後

🚫 半透明遮罩唔可以純靠 tap 關閉（避免長者 miss）。

---

3. 事件詳情頁 — 慶祝版（陳大文 生日）

3.1 Top Bar
返回鍵 + 標題「事件詳情」20 px Bold #2b2b2b + 右側細 share 按鈕（icon + text）

3.2 Header Card（白底 16 r、20 padding、margin 16）

| 元素 | 規格 |
|------|------|
| 左側 icon block 80 × 80 px | 背景 --green-primary with rgba(34,139,34,0.08)；icon 🎂 + 小日曆疊加 |
| H1 | 陳大文 的生日 22 px Bold #2b2b2b |
| 日期行 | 10 月 15 日（星期三） 18 px Regular #6b6b6b；margin-top 4 px |
| 關係 pill | 仔（綠底米白字、14–16 px Bold、padding 8/12、圓角 28 px） |
| 右下倒數 | 仲有 18 日 🎉 16 px Bold #228B22 |

3.3 Middle 「可以為他做什麼？」
H2 可以為他做什麼？ 18 px Bold #2b2b2b
Sub 揀一樣你想做嘅就 OK 16 px Regular #6b6b6b，margin-bottom 16 px
3 個 Action Card stacked vertical，間距 16 px
每卡：白底 + 16 r + --shadow-soft + 16 padding；高度 ≥ 80 px
每卡佈局：[icon 48] [Title 20 B] [Sub 16 muted] [chevron ›]

| # | Icon 48 px | Title 20 B | Sub 16 muted | 行動 |
|---|-----------|-----------|-------------|------|
| 1 | 🎁 | 送上祝福 | 電子賀卡、語音祝福 | inline compose sheet |
| 2 | 🎉 | 去安排 | 禮物、聚會、活動 | 跳去家庭聚會 tab |
| 3 | 👨‍👩‍👧‍👦 | 邀請其他家庭成員 | 請大家一齊參與 | 家人多選 chip sheet |

3.4 Bottom 「大家的祝福」
H2 大家的祝福 18 px Bold #2b2b2b
Rows stacked，間距 8 px
每 row sub-card：--bg-engagement #fafaf2、12 r、padding 12 px
Row 內：頭像 32 px + 姓名 16 px Bold #2b2b2b + timestamp 16 px Regular #6b6b6b + 內容 18 px Regular #2b2b2b
樣例：陳美玲 / 1 小時前 / 「祝大文生日快樂 🎂 工作順利，身體健康！」

3.5 FAB「＋ 寫下祝福」
右下浮動、距右 edge 20 px、距底部 Tab Bar 上 96 px
Pill 28 r、高 ≥ 56 px、padding 20 px 水平
#228B22 填色、白字 18 px Bold
--green-glow-strong 0 4px 14px rgba(34,139,34,0.35)

---

4. 事件詳情頁 — 忌辰莊重版（陳李秀英）

本版絕對唔可以同慶祝版撞樣。所有慶祝元素、綠色 accent、商業按鈕都禁用。

4.1 Top Bar
同慶祝版（白底），標題「事件詳情」

4.2 Header Card（#e8e4da 暗米褐卡底 · 16 r · 20 padding · 16 margin）

| 元素 | 規格 |
|------|------|
| 細灰 botanical 線雕 | 百合 / 蠟燭 / 白鴿 outline，#9a958a stroke、純 line-art、32 px、置中頂部 |
| H1 | 紀念·陳李秀英 (1928–2020) 享年 92 歲 22 px Bold #2b2b2b（無 emoji、無綠色） |
| 副標 | 我們永遠懷念她 18 px Regular #6b6b6b，margin-top 8 px |
| 內文段 | 二十年過去，您永遠喺我哋心中 18 px Regular #2b2b2b，margin-top 8 px |

🚫 慶祝版倒數行 仲有 18 日 🎉 → 唔存在於忌辰版。

4.3 Middle 「可以為他做什麼？」
H2 可以為他做什麼？ 18 px Bold #2b2b2b（結構同慶祝版，用字唔變以保持系統感）
Sub 揀一樣適合嘅就 OK 16 px Regular #6b6b6b
3 個 Action Card（同慶祝版結構同位置，內容莊重化）：
白底 + 16 r + 1 px solid #e2ddd2 邊框 + --shadow-soft 柔和陰影、16 padding
高度 ≥ 80 px
佈局：[icon 48 純灰 line-art] [Title 20 B 深字] [Sub 16 muted] [chevron 純灰]

| # | Icon 48 px（純 #9a958a line-art） | Title 20 B #2b2b2b | Sub 16 muted #6b6b6b | 行動 |
|---|----------------------------------|-------------------|---------------------|------|
| 1 | 🕊️ 灰色線雕鴿子 | 獻上思念 | 寫一段思念嘅文字 | inline compose sheet |
| 2 | 🕯️ 灰色線雕蠟燭 | 送上鮮花 | 虛擬鮮花悼念 | 開虛擬花束組裝 sheet |
| 3 | 📖 灰色線雕相簿 | 翻睇相簿 | 懷念從前嘅時光 | 開陳李秀英相簿頁 |

🚫 絕對唔可以出現：🎁 禮物、🎉 去安排、聚會、🍰 訂蛋糕、🍴 餐廳、👨‍👩‍👧‍👦 邀請家庭成員慶祝、🎁 買禮物、訂花店實體、任何商業轉化按鈕。

4.4 Bottom 「大家的思念」
H2 大家的思念 18 px Bold #2b2b2b
Rows stacked，間距 8 px
每 row sub-card：#f0ece4 暖灰褐、12 r、padding 12 px
Row 內：頭像 32 px（灰度處理）+ 姓名 16 px Bold + timestamp 16 px Regular muted + 內容 18 px Regular #2b2b2b
樣例：
陳大文 · 1 小時前 · 「媽，我永遠掛住您 ❤️」
陳美玲 · 昨日 · 「媽，您嘅笑聲我哋會一直記住 🕊️」
陳志明 · 昨日 · 「阿媽，您安息 🙏」

🚫 僅允許 🕊️ 🙏 🕯️ ❤️ 等悼念/祈禱類 emoji；🎂 🎉 🎈 🎁 🎊 🍰 全部禁用於此頁。

4.5 FAB「＋ 留下思念」
位置同比慶祝版（右下、距底部 Tab Bar 上 96 px）
白底 + 2 px solid #6b6b6b 灰色邊框 + #2b2b2b 深字 18 px Bold
高度 ≥ 56 px、pill 28 r
🚫 無 green glow

---

5. 慶祝版 vs 忌辰版差異速查表

| 維度 | 慶祝版（Phone 3） | 忌辰版（Phone 4） |
|------|-----------------|-----------------|
| Header 卡背景 | 白 #ffffff | 米褐 #e8e4da |
| Header 裝飾 | 綠 icon box + 🎂 | 灰百合/蠟燭 line-art |
| H1 | 陳大文 的生日 + 🎂 | 紀念·陳李秀英 (1928–2020) 享年 92 歲（無 emoji） |
| 倒數行 | 仲有 18 日 🎉 綠色 | 不存在 |
| Middle Action icon | 🎁 / 🎉 / 👨‍👩‍👧‍👦 | 🕊️ / 🕯️ / 📖（純灰 line-art） |
| Action 1 | 送上祝福 | 獻上思念 |
| Action 2 | 去安排（→ 聚會 tab） | 送上鮮花（→ 虛擬花束） |
| Action 3 | 邀請家庭成員 | 翻睇相簿 |
| Bottom H2 | 大家的祝福 | 大家的思念 |
| Row 底色 | 奶白 #fafaf2 | 暖灰褐 #f0ece4 |
| FAB | 綠色實心 + 綠 glow | 白底 + 灰邊框，冇 glow |
| 綠色 accent 入卡 | ✅ 有 | 🚫 完全冇 |

兩版共用同樣結構 skeleton（Header / Middle 3-Action / Bottom List），差異只在視覺 × emoji × 文案 × 顏色 / 商業 vs 悼念。

---

6. 已定跳轉關係

```
Feed A 「送上祝福」 → (inline comment)            ❌ 不跳
Feed A 「去安排」     → Events Detail 慶祝版 Phone 3
                       ├─ Action1 送上祝福     → inline compose
                       ├─ Action2 去安排       → 家庭聚會 tab
                       └─ Action3 邀請家人     → 多選 chip sheet
Modal B 「一鍵祝福」 → (inline comment 直接 post) ❌ 不跳
Modal B 「去安排」     → Events Detail 慶祝版 Phone 3 (同上)
Feed C 「獻上思念」   → Events Detail 忌辰版 Phone 4
                       ├─ Action1 獻上思念    → inline compose sheet
                       ├─ Action2 送上鮮花    → 虛擬花束 sheet
                       └─ Action3 翻睇相簿    → 陳李秀英相簿頁
```

---

7. 無障礙 / 長者 Checklist

- 內文字體 ≥ 18 px
- 點擊區 ≥ 44 × 44 px
- 主行動按鈕 ≥ 56 px
- 對比：主文字 vs 米白 ≥ 7:1；綠色 vs 米白 ≥ 4.5:1
- 紅點永遠帶 2 px 白外圈
- 全部 icon 配文字
- 全繁體中文（香港用語）

---

8. 嚴格不做

❌ 付款 / 交易 / 金流
❌ 訂蛋糕 / 餐廳 / 商業轉化
❌ 簡體中文字
❌ 粉紅色、CoAppery orange #F97316
❌ Icon-only 按鈕
❌ 大面積 red surface
❌ 冷漠 / 商業風格
❌ 忌辰版入面任何綠色 accent、入面任何慶祝 / 商業元素
❌ Placeholder 假名

---

9. 動效過場

- Feed A 入：fade + slide-from-top 280 ms ease-out
- Modal B 入：dim 240 ms + modal scale 0.94 → 1.0 spring 320 ms
- 慶祝版 FAB 互動：lift scale 1.05 + glow 強化
- 忌辰版 FAB 互動：lift scale 1.03（柔和）
- Tab 切換：cross-fade 200 ms

---

## 實作備註（Genspark 砌頁用）
- 本頁為靜態 mockup，以下功能只做外觀，唔做真實邏輯（Out of Scope，待後端/狀態管理）：
  - inline comment composer（送祝福/一鍵祝福 post 入 feed）——只做視覺回饋
  - 「稍後提醒」local notification 6/12/24 小時——只做掣外觀
  - 虛擬花束 sheet、多選 chip sheet、相簿頁——只做掣外觀或跳去佔位
  - 彈出卡 B 嘅觸發邏輯（撳走記憶、迫近判斷）——mockup 只靜態展示個樣
  - 慶祝版三掣、忌辰版三掣嘅實際跳轉——只做掣外觀
- rgba 規矩：所有 rgba() token（green-glow、遮罩、陰影等）必須定義喺 src/index.css 做 CSS 變數，組件內只可用 var(--xxx) 引用，嚴禁喺組件直接寫 rgba()。
- 慶祝版 vs 忌辰版共用同一結構 skeleton，建議用同一組件 + props 切換，避免重複砌。
- emoji 暫用作 icon，將來可換 SVG。
