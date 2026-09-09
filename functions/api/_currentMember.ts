/**
 * _currentMember — 共用 helper
 *
 * 讀 family_session cookie → 查 family_sessions → 取 member_no →
 * 計算「主樹」(primaryFamilyId / primaryMemberId) → 回傳。
 *
 * ── 認證路徑 ──
 *   1. 從 request Cookie header 讀 family_session token
 *   2. SELECT member_no FROM family_sessions WHERE token=? AND expires_at > datetime('now')
 *   3. 搵到 member_no → 查該 member_no 在各樹的所有 person 節點
 *   4. 無任何節點 → 401（session 存在但未完成 setup）
 *   5. 有節點 → 按主樹優先次序計算 primaryMemberId / primaryFamilyId
 *
 * ── 主樹優先次序 ──
 *   (1) 優先：節點 X 存在 parent_child edge 且 to_member = X.id（X 係子女）→ 最早者
 *   (2) 其次：節點 Y 存在 parent_child edge 且 from_member = Y.id（Y 做父母）→ 最早者
 *   (3) 再其次：所有節點中最早建立者
 *
 * ── 失敗情況（一律 401）──
 *   - 冇 family_session cookie
 *   - cookie 存在但 session 已過期 / token 無效
 *   - session 有效但 member_no 無對應 person 節點（未完成 setup）
 *   - request 未傳入（optional）→ 無 cookie = 未登入
 *
 * ── 移除嘅舊行為（is_self fallback）──
 *   舊版在 cookie 無效 / session 過期 / 找不到 member 時，
 *   會 fallback 攞「最早建立的 family + is_self=1 成員」。
 *   此安全漏洞已完全移除。
 *
 * 回傳格式：
 *   { ok: true,  memberNo, primaryFamilyId, primaryMemberId, familyIds }  — 成功
 *   { ok: false, response: Response }                                       — 失敗（401）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

export type CurrentMemberOk = {
  ok:              true
  memberNo:        string
  primaryFamilyId: string
  primaryMemberId: string
  familyIds:       string[]
}

export type CurrentMemberErr = {
  ok:       false
  response: Response
}

export type CurrentMemberResult = CurrentMemberOk | CurrentMemberErr

/* ── 401 回傳工廠 ── */
function unauthorized(): CurrentMemberErr {
  return {
    ok:       false,
    response: Response.json({ ok: false, error: '請先登入' }, { status: 401 }),
  }
}

/* ── 從 Cookie header string parse 出指定 cookie 值（純 JS，無第三方 dep）── */
function parseCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const prefix = `${name}=`
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length)
    }
  }
  return undefined
}

/**
 * getCurrentMember
 *
 * @param db      - D1Database binding（必填）
 * @param request - 原生 Request（可選）；冇傳一律視為未登入，回 401
 */
export async function getCurrentMember(
  db:      D1Database,
  request?: Request,
): Promise<CurrentMemberResult> {

  /* ════════════════════════════════════════════════════════════
   * 步 1：讀 cookie → 查 session → 取 member_no
   * ════════════════════════════════════════════════════════════ */
  if (!request) return unauthorized()

  const cookieHeader = request.headers.get('cookie')
  const token        = parseCookieValue(cookieHeader, 'family_session')
  if (!token) return unauthorized()

  const sess = await db
    .prepare(
      `SELECT member_no
       FROM family_sessions
       WHERE token = ? AND expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ member_no: string }>()

  if (!sess) return unauthorized()

  const memberNo = sess.member_no

  /* ════════════════════════════════════════════════════════════
   * 步 2：查該 member_no 的所有 person 節點（主樹計算 SQL 段落）
   *
   * 查出 member_no 對應的全部本地 person 節點，
   * 按 created_at ASC 排序，供後續主樹優先次序判斷。
   * ════════════════════════════════════════════════════════════ */
  const nodeRows = await db
    .prepare(
      `SELECT id, family_id, created_at
       FROM members
       WHERE coeldery85_member_id = ? AND member_kind = 'person'
       ORDER BY created_at ASC`
    )
    .bind(memberNo)
    .all<{ id: string; family_id: string; created_at: string }>()

  if (!nodeRows.results || nodeRows.results.length === 0) {
    /* session 有效但無對應 node（未完成 setup）→ 視為未登入 */
    return unauthorized()
  }

  const nodes = nodeRows.results

  /* familyIds：去重，按節點 created_at ASC 順序排列 */
  const familyIds: string[] = []
  for (const n of nodes) {
    if (!familyIds.includes(n.family_id)) familyIds.push(n.family_id)
  }

  /* ════════════════════════════════════════════════════════════
   * 步 3：主樹優先次序計算
   *
   * (1) 優先：節點 X，存在 parent_child edge 且 to_member = X.id
   *           （X 係子女，該樹有佢父母）
   * (2) 其次：節點 Y，存在 parent_child edge 且 from_member = Y.id
   *           （Y 做父母，係頂代）
   * (3) 再其次：nodes[0]（created_at 最早，ORDER BY 已保證）
   * ════════════════════════════════════════════════════════════ */

  /* (1) 揾作為子女的節點（from_member = 父，to_member = 自己） */
  let primaryNode: { id: string; family_id: string } | null = null

  for (const node of nodes) {
    const edge = await db
      .prepare(
        `SELECT id FROM relationships
         WHERE family_id = ? AND edge_type = 'parent_child' AND to_member = ?
         LIMIT 1`
      )
      .bind(node.family_id, node.id)
      .first<{ id: string }>()

    if (edge) {
      primaryNode = { id: node.id, family_id: node.family_id }
      break   /* nodes 已按 created_at ASC，第一個符合即為最早 */
    }
  }

  /* (2) 若無子女節點，揾作為父母的節點（from_member = 自己） */
  if (!primaryNode) {
    for (const node of nodes) {
      const edge = await db
        .prepare(
          `SELECT id FROM relationships
           WHERE family_id = ? AND edge_type = 'parent_child' AND from_member = ?
           LIMIT 1`
        )
        .bind(node.family_id, node.id)
        .first<{ id: string }>()

      if (edge) {
        primaryNode = { id: node.id, family_id: node.family_id }
        break   /* 同上，取最早 */
      }
    }
  }

  /* (3) 兩者都無，取 created_at 最早節點 */
  if (!primaryNode) {
    primaryNode = { id: nodes[0].id, family_id: nodes[0].family_id }
  }

  return {
    ok:              true,
    memberNo,
    primaryFamilyId: primaryNode.family_id,
    primaryMemberId: primaryNode.id,
    familyIds,
  }
}
