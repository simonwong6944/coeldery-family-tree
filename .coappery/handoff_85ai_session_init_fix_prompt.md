# 交 85AI 團隊用 — `/api/session/init` 生產安全閘修正 Prompt

> 把下面整段（由「## 任務」起）複製去 85AI repo 嘅 AI code agent 或開發者。
> 背景：家庭樹 Handoff 已接通（85AI 簽發 → 家庭樹接收）。但簽發端嘅暫時方案
> `/api/session/init`（以**前端傳入嘅 `member_no`** 種 `app_session` cookie）喺**生產**可被濫用，
> 令整個 handoff 安全鏈失效。本任務為佢加環境閘。

---

## 任務

為 `POST /api/session/init` 加**環境閘**：**只在非生產環境（preview / local）可用**；
生產環境一律拒絕（403），唔可以由前端傳 `member_no` 種 session。

## 風險說明（為何要做）

現時流程：

```
前端傳 member_no → POST /api/session/init → 種 app_session cookie
  → POST /api/family-tree/handoff → 簽出合法家庭樹 token
  → 家庭樹 /api/family/enter → 種 family_session（＝家庭樹合法登入）
```

問題：`member_no` 係可枚舉（`CE85-000001`, `000002`, …）。

1. 攻擊者可用任意 `member_no` 換到**該會員嘅家庭樹 token**，**繞過家庭樹嘅電話＋密碼登入**。
2. 若目標會員**未設家庭樹密碼**（`needs_setup:true`），攻擊者可**直接設定密碼、騎劫帳號**。

即係：**簽發端身分可信度 = 整個 handoff 安全鏈嘅根**。暫時方案可以存在，但**唔可以喺生產開住**。

## 建議做法

用**明確嘅環境開關**（預設關閉，只在 preview/local 開）：

```js
// 例：POST /api/session/init
export const onRequestPost = async (ctx) => {
  // ① 環境閘：非生產才准用（生產一律 403）
  const allowDevSessionInit = ctx.env.DEV_SESSION_INIT_ENABLED === 'true'
  if (!allowDevSessionInit) {
    return Response.json({ ok: false, error: 'not available' }, { status: 403 })
  }

  // ② …其後照舊種 app_session…
}
```

環境變數：

- 生產（production）：**唔設** `DEV_SESSION_INIT_ENABLED`（或設 `false`）→ 端點回 403。
- Preview / 本機：設 `DEV_SESSION_INIT_ENABLED=true`。
- （可選）亦可用 Cloudflare Pages 內建環境資訊雙重檢查（例如分支／環境判斷），但**以明確開關為主**。

> 亦可以考慮**直接移除** `session/init`（若 preview 測試已唔需要），最乾淨。

## 長遠方向（唔係今次做，但要知）

- `app_session` 必須由 **85AI 真正嘅登入流程**（伺服器確認為本人後）建立；
  **絕不可以由前端傳入 `member_no` 直接種 session**。
- 家庭樹側已守好（只信簽名 token、驗 `exp`、constant-time 比對）；但**簽發端一旦可偽造，全鏈即破**。

## 驗收標準

- [ ] 生產環境呼叫 `POST /api/session/init` → **403**（唔會種 cookie）。
- [ ] Preview / 本機（有設 `DEV_SESSION_INIT_ENABLED=true`）→ 行為照舊（測試用）。
- [ ] 生產環境**無法**用前端 `member_no` 取得 `app_session`。
- [ ] 因此生產環境**無法**經 `session/init` → `family-tree/handoff` 取得合法家庭樹 token。
- [ ] 正常（真實登入後）嘅 `app_session` → `family-tree/handoff` → 家庭樹 enter **仍然可行**（唔可以順手擋埋正常流程）。

## Out of scope

- 唔改家庭樹 repo。
- 唔實作 85AI 真正登入流程（長遠項，另立任務）。

## 參考

- 家庭樹 handoff 契約：家庭樹 repo `.coappery/handoff_contract.md`
- 家庭樹接收端：`https://family.coeldery85.com/api/family/enter`
