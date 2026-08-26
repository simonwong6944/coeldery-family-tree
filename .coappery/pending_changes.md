# CoEldery 85 家庭樹 — Pending Changes Log

> 本檔記錄設計規範矛盾、待決策項目及未完成整合事項，由產品負責人定奪後方可執行。
> 格式：細步編號、問題描述、相關規範來源、建議選項。

---

## [細步 3a-fix][PENDING] 關係標籤字級 16px vs 18px 待統一

**問題描述：**
B1.md §2.3「字級規格表」列明關係標籤（如「長子」、「妻子」）字級為 **16px Regular**。
然而 B2_B3.md 長者優化修訂部分指出關係標籤應 **≥ 18px**，與 B1.md 存在矛盾。

**現行實作：**
- `packages/household-card/index.tsx` Avatar 組件的關係標籤：`fontSize: '16px'`（依 B1.md §2.3）
- `src/pages/B1HomePage.tsx` Gen3Member 的關係標籤：`fontSize: '16px'`（依 B1.md §2.3）

**相關規範來源：**
- B1.md §2.3：關係標籤 16px Regular
- B2_B3.md（長者優化修訂）：關係標籤 ≥ 18px
- rules.md §2：正文字級 ≥ 18px；關係標籤 ≥ 16px（明確允許 16px）

**建議選項：**
- 選項 A（保守）：維持 16px，遵從 B1.md §2.3 及 rules.md §2（≥ 16px 已達標）
- 選項 B（長者友善優先）：改為 18px，與正文字級一致，提升可讀性

**待決策人：** 產品負責人
**優先級：** Medium（視覺無重大影響，但影響長者使用體驗）
**登記日期：** 2026-08-26（細步 3a-fix）

---
