# 交 85AI 團隊用 — Handoff Token 實作 Prompt / Spec

> 把下面整段（由「## 任務」起）複製去 85AI repo 嘅 AI code agent 或開發者。
> 目的：令 85AI 母 app 用戶撳「家庭樹」時，**免再輸電話／密碼**，直接以 `member_no` 進入家庭樹。
> 家庭樹側**已經實作完成**（接收端穩定），本任務**只需喺 85AI 側加簽發**。

---

## 任務

在 CoEldery85（85AI）加入一個「家庭樹 Handoff」入口，令已登入嘅用戶撳落去時，
85AI **伺服器端**簽發一個短命 token，並 **302 導向**：

```
https://family.coeldery85.com/?token=<signed_token>#/enter
```

家庭樹收到 token 後會自動驗證、種 session，用戶即入到樹（或首次設定）。
**key 只可在伺服器端使用，絕不可落前端。**

---

## 1. Token 格式（權威規格，必須逐字跟隨）

```
token = base64url( payloadJson ) + "." + base64url( HMAC_SHA256( key, base64url( payloadJson ) ) )
```

| 項目 | 規定 |
|------|------|
| `payloadJson` | `{"member_no":"CE85-XXXXXX","exp":<unix 秒>}` |
| 簽名輸入（signing input） | **就係 `base64url(payloadJson)` 呢個字串本身**（唔係 JSON 原文、唔係 payload bytes） |
| HMAC 演算法 | `HMAC-SHA256` |
| HMAC key | 環境變數／Secret：`FAMILY_TREE_API_KEY` |
| `base64url` | 標準 base64 之後：`+`→`-`、`/`→`_`、**去掉 `=` padding** |
| `exp` | Unix 秒；建議 **120 秒**（短命） |
| `member_no` | 85AI 現行會員編號，格式 `CE85-XXXXXX` |

> ⚠️ 常見出錯位：**係簽 `payloadB64`（base64url 後嘅字串），唔係簽 JSON 原文**。錯咗會 401。

## 2. Secret 要求

- 85AI 與家庭樹兩邊嘅 `FAMILY_TREE_API_KEY` **必須完全一致**。
- 兩邊都以 Cloudflare Secret / 環境變數儲存；**永不入 code / git / 前端 / log**。
- 若家庭樹回 401，**第一件事就係核對兩邊 key 值是否一致**。

## 3. 建議實作（Cloudflare Workers，用 Web Crypto）

新增一個 helper：

```js
/* base64url（無 padding）*/
function b64url(buf) {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signFamilyTreeHandoff(memberNo, apiKey, ttlSec = 120) {
  // 1. payload → base64url 字串
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify({
    member_no: memberNo,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  })))
  // 2. 用 FAMILY_TREE_API_KEY 對「payloadB64 字串」做 HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  // 3. token = payloadB64 + '.' + base64url(sig)
  return `${payloadB64}.${b64url(sig)}`
}
```

新增一個入口 route（**必須伺服器端、必須先確認用戶已登入**）：

```js
// 例：GET /api/family-tree/handoff
export const onRequestGet = async (ctx) => {
  const memberNo = await getCurrentMemberNo(ctx)   // ← 用 85AI 現有 session 認人（見下）
  if (!memberNo) {
    return Response.redirect('https://www.coeldery85.com/', 302)
  }
  const apiKey = ctx.env.FAMILY_TREE_API_KEY
  if (!apiKey) return new Response('server config error', { status: 500 })

  const token = await signFamilyTreeHandoff(memberNo, apiKey, 120)
  return Response.redirect(
    `https://family.coeldery85.com/?token=${token}#/enter`,
    302,
  )
}
```

> `getCurrentMemberNo(ctx)` 請按 85AI 現有認人機制實作（例如讀現有 session cookie / colinkery session / 現有 member 查詢）。
> **唔可以**由前端傳 `member_no` 入嚟當身份 —— 咁會俾人偽造。token 一定要伺服器用「當前登入者」簽。

新增環境變數：`FAMILY_TREE_API_KEY`（值與家庭樹一致）。

前端「家庭樹」入口只需指向呢條 route（例如 `location.href = '/api/family-tree/handoff'`，或 `<a href>`）。

## 4. 用戶體驗流程

1. 用戶已登入 85AI，撳「家庭樹」→ 302 去家庭樹帶 token。
2. 家庭樹驗簽成功 → 種 session cookie → 即清走 URL 上嘅 token。
   - 已有家庭樹密碼 → 直接入樹。
   - 未設過密碼 → 顯示「首次設定」（只需密碼＋暱稱＋生日，**免電話**）。
3. 之後再入家庭樹靠家庭樹自身 session（30 日），唔再需要 token。

## 5. 驗收標準

- [ ] 已登入用戶撳「家庭樹」→ **直接入到樹**（或首次設定），全程唔使再輸電話。
- [ ] 入到之後，**URL 上唔再見到 `?token=`**（家庭樹會自動清）。
- [ ] 未登入用戶撳「家庭樹」→ 唔會取得 token（導返登入）。
- [ ] 亂改／過期 token → 家庭樹回 401 → 自動回落去家庭樹登入頁（唔會白畫面）。
- [ ] `FAMILY_TREE_API_KEY` 冇落前端 bundle、冇入 git、冇入 log。
- [ ] token `exp` ≤ 120 秒。

## 6. 本地／手動測試方法

1. 用同一 `FAMILY_TREE_API_KEY` 產生一個 token（可用 85AI 側新 route 或任何 HMAC 腳本，規格見第 1 節）。
2. 瀏覽器開：`https://family.coeldery85.com/?token=<token>#/enter`
3. 預期：
   - 有對應會員 → 入到樹／入首次設定。
   - 錯 key 或改過 token → 回 401 並落家庭樹登入頁。

## 7. Out of scope（今次唔做）

- 唔改家庭樹 repo（接收端已完成）。
- 唔做長效 token（token 只係一次性短命 handoff）。
- 唔做 app 內金流／付款。

## 8. 參考

- 家庭樹側接收端：`POST https://family.coeldery85.com/api/family/enter`，body `{ "token": "<token>" }`
- 家庭樹側完整契約：家庭樹 repo `.coappery/handoff_contract.md`
- 家庭樹側驗證邏輯：`_verifyHandoff.ts`（HMAC-SHA256、constant-time 比對、驗 exp）
