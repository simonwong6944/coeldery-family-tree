# 老有樹 — Handoff Token 契約（85AI → 家庭樹）

> 目的：用戶由 CoEldery85 母 app 撳入家庭樹時，**免再輸電話／密碼**，直接帶 `member_no` 入去。
> 狀態：**家庭樹側已實作**（`src/App.tsx`、`functions/api/family/enter.ts`、`functions/api/family/_verifyHandoff.ts`）；
>        **等 85AI 側簽發 token**（跨 repo）。

---

## 1. 傳遞方式

85AI 導向：

```
https://family.coeldery85.com/?token=<signed_token>#/enter
```

- 家庭樹只讀 `?token=`（**簽名 token**），**完全不讀** `?member=` 或任何明文身份參數。
- 前端收到後即 `POST /api/family/enter`，成功與否都會**即刻清走 URL 上的 token**（`history.replaceState`），避免留喺位址列／歷史。

## 2. Token 格式

```
base64url( payloadJson ) + "." + base64url( HMAC-SHA256( signingInput ) )
```

| 項目 | 規定 |
|------|------|
| `payloadJson` | `{"member_no":"CE85-XXXXXX","exp":<unix 秒>}` |
| `signingInput` | **就係 `base64url(payloadJson)` 呢個字串本身**（即簽 `payloadB64`，唔係 JSON 原文） |
| HMAC key | `FAMILY_TREE_API_KEY`（兩邊**必須一致**） |
| base64url | 無 padding，`+`→`-`、`/`→`_` |
| `exp` | Unix 秒；家庭樹會檢查 `exp > now`；建議 **60–120 秒**短命 |

## 3. 家庭樹接收端行為

```
POST /api/family/enter   body: { token }
  ├─ 驗 HMAC 簽名（constant-time）+ 驗 exp
  │     失敗 → 401（不 fallback、不種 cookie）
  ├─ 成功 → 取 member_no → 查 member_auth
  │     有   → needs_setup:false
  │     冇   → needs_setup:true
  ├─ 種 family_session cookie（HttpOnly/Secure/SameSite=Lax，30 日）
  └─ 回 200 { ok:true, needs_setup:boolean }
```

前端跟住：
- `needs_setup:true` → 顯示**首次設定**（免電話：只需密碼＋暱稱＋生日）→ `POST /api/family/setup-with-session`
- `needs_setup:false` → 直接入樹 `#/`
- 失敗／網絡錯 → 回落現有 `#/login` 流程

## 4. 85AI 側職責

1. 當用戶（已登入 85AI）撳「家庭樹」入口時，用 `FAMILY_TREE_API_KEY` 簽一個短命 token。
2. 導向 `https://family.coeldery85.com/?token=<token>#/enter`。
3. Token **短命、用一次**；家庭樹側不儲存 token。
4. Key 值與家庭樹 Cloudflare Secret `FAMILY_TREE_API_KEY` **必須一致**（若食 401，先核對 key）。

### 簽發範例（Node / Worker）

```js
import crypto from 'node:crypto'
const key = process.env.FAMILY_TREE_API_KEY
const b64url = (b) => Buffer.from(b).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const payloadB64 = b64url(JSON.stringify({
  member_no: 'CE85-000001',
  exp: Math.floor(Date.now() / 1000) + 120,
}))
const sigB64 = b64url(crypto.createHmac('sha256', key).update(payloadB64).digest())
const token  = `${payloadB64}.${sigB64}`
```

## 5. 本機測試

```bash
FAMILY_TREE_API_KEY=xxx node scripts/gen-handoff-token.mjs CE85-000001 120
# 會印出 token 同完整入口 URL，貼去瀏覽器即可測
```

（產生器：`scripts/gen-handoff-token.mjs`）

## 6. 安全底線

- 只信簽名 token；任何明文身份參數一律不讀。
- `FAMILY_TREE_API_KEY` 只存 Cloudflare Secret，**永不入 code / git / 前端**。
- 驗證失敗一律 401，不洩露具體原因（防 oracle）。
- exp 短命（建議 ≤ 2 分鐘），降低 token 被截取風險。
