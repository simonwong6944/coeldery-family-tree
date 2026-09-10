# 商戶資料錄入（merchant data）

> 相關決定：`product_decisions.md` v1.11／v1.5；准入與廣告規則見 `family_gather.md` §1、§6。

## 一句話
編輯 **`data/merchants.json`** → 跑 `node scripts/generate-merchant-sql.mjs --out scripts/generated/merchants.sql`
→ 由產品負責人套用落 D1（本機先測，再 `--remote`）。**唔需要改任何程式碼**。

## 檔案格式
`data/merchants.json` 四部分：`districts`／`landmarks`／`tags`／`merchants`／`promotions`（可省略任何一部分）。

| 欄位 | 說明 |
|---|---|
| `merchants[].id` | 唯一（例 `mc-my-restaurant`）；一改就等於新商戶 |
| `merchants[].name` | 顯示名 |
| `merchants[].category_id` | 現有分類：`cat-food`（飲食）／`cat-health`（醫療保健）／`cat-home`（家居服務）／`cat-gift`（禮品與花藝）／`cat-funeral`（殯儀與身後事）／`cat-elderly`（長者日常） |
| `merchants[].landmark_id` | 可空；要喺 `landmarks` 或 migration 既有（`lm-times-sq`／`lm-kwuntong-mtr`／`lm-newtown-plz`） |
| `merchants[].is_listed` | **0 = 完全唔會出現喺 App**；1 = 上架（須已收費） |
| `merchants[].ad_tier` | 0 = 自然排序；1 = 廣告基礎；2 = 廣告置頂（**UI 會標示「贊助」**） |
| `merchants[].tags[]` | **決定流程曝光**：`訂餐廳`＝餐廳／茶餐廳／酒樓／到會／宴會；`訂蛋糕`＝蛋糕／糕點／西餅／甜品；`買禮物`／`送花`＝禮品／禮盒／鮮花／花店／花籃 |
| `promotions[]` | **`festival_id` 必填**（節日曆 id，例 `mid-autumn-2026`）；`quota_total` null = 名額不限；**推廣唔可以綁個人** |
| `rewards[]` | **Type B 推薦獎勵券**：`required_referrals` 必填（成功推薦幾多位家人解鎖，例 `5`）；**唔綁節日**；`quota_total` null = 名額不限 |

> 標籤（tags）係關鍵：商戶**有標籤**時只用標籤判斷屬唔屬於該「需要」（例：茶餐廳唔會出現喺「訂蛋糕」）；**完全冇標籤**嘅舊商戶才用主分類後備。

## 步驟
```powershell
# 1. 產生 SQL（會先驗證，錯即停）
node scripts/generate-merchant-sql.mjs --out scripts/generated/merchants.sql

# 2. 本機測試（wrangler pages dev 需另開一個 terminal）
npx wrangler d1 execute coeldery-family-tree-db --local --file scripts/generated/merchants.sql

# 3. 生產（由產品負責人執行；rules §19）
npx wrangler d1 execute coeldery-family-tree-db --remote --file scripts/generated/merchants.sql
```

## 安全特性
- 全部用 **UPSERT**（`ON CONFLICT(id) DO UPDATE`）→ 可重複執行更新資料。
- **唔會**重設 `promotion.claimed_count`（已領取名額保留）。
- `merchant_tag_map` 用 `INSERT OR IGNORE` → 唔會清走現有標籤。
- 驗證會擋：id 重複／未知分類／未知標籤／未知地標／`is_listed` 唔係 0-1／`ad_tier` 唔係 0-2／**推廣冇節日**／推廣節日唔存在／`quota_total` 格式錯。

## ⚠️ 示範資料
現時 `data/merchants.json` 內 **7 間商戶同 3 張推廣係示範資料**（名稱含「（示範）」、電話用 `2000-xxxx` 假號碼），目的係令「訂餐廳／訂蛋糕／買禮物／送花」同節日推廣流程即刻睇得到效果。
**正式上線前必須**：換成真實已收費商戶（或將 `is_listed` 改 0 隱藏）。

## 節日（festival）
節日曆由 `migrations/0016_festival_promotions.sql` 種子定義（一年更新一次）。要加減節日 → 改該 migration 或直接 `d1 execute`；
`is_lunar = 1` 者每年日期浮動，須每年核實更新。**推廣只可以綁呢啲節日 id。**

## 兩類優惠券（統一 coupon engine，雙動作零金流）
| | Type A 節日推廣券 | Type B 推薦獎勵券 |
|---|---|---|
| 表 | `promotion` | `reward` |
| 綁定 | **節日**（`festival_id` 必填） | **成功推薦人數**（`required_referrals`） |
| 出現位置 | 節日聚會 → 揀商戶清單內 | 家庭聚會首頁「推薦獎勵」→ 解鎖後自選 |
| 由 `data/merchants.json` 邊個欄位定義 | `promotions[]` | `rewards[]` |
| 共同機制 | 一人一次（`UNIQUE(…, member_no)`）、名額原子控管、領取後一鍵 WhatsApp 向商戶確認、商戶線下核銷、平台記錄 | 同左 |

> 忌辰等莊重場合**一律唔會**顯示任何券（rules §23）。

## 驗證清單
- [ ] `node scripts/generate-merchant-sql.mjs` 冇 error
- [ ] 本機套用後：`/api/merchants` 見到新商戶；`/api/merchants-meta` 見到新地區／標籤
- [ ] 「訂餐廳／訂蛋糕／買禮物／送花」清單出到正確商戶（標籤正確）
- [ ] 節日聚會揀商戶時見到該節日推廣（`/api/promotions?festival_id=…`）
- [ ] `is_listed = 0` 嘅商戶**完全**唔出現（包括推廣）
