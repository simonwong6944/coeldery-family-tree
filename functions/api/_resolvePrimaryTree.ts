/**
 * _resolvePrimaryTree — 共用「主樹計算」helper
 *
 * 給定 member_no，查出該用戶在各家族樹的所有 person 節點，
 * 按優先次序選出主樹（primaryFamilyId / primaryMemberId），
 * 並返回其所屬的全部 familyIds。
 *
 * ── 主樹優先次序 ──
 *   (1) 優先：節點 X 存在 parent_child edge 且 to_member = X.id
 *             （X 係子女，該樹有其父母）→ 取 created_at 最早者
 *   (2) 其次：節點 Y 存在 parent_child edge 且 from_member = Y.id
 *             （Y 係頂代父母）→ 取 created_at 最早者
 *   (3) 再其次：所有節點中 created_at 最早者
 *
 * ── 返回 null 的情況 ──
 *   - member_no 對應的 person 節點一個都冇
 *   - 由 caller 自行決定如何回應（此 helper 不做任何 HTTP 操作）
 *
 * Cloudflare Pages Function — edge runtime（無第三方依賴）
 * binding: DB (D1)
 */

export type PrimaryTreeResult = {
  primaryFamilyId: string
  primaryMemberId: string
  familyIds:       string[]
} | null

/**
 * resolvePrimaryTree
 *
 * @param db       - D1Database binding（由 caller 傳入）
 * @param memberNo - 85AI member_no（已通過 session 驗證）
 */
export async function resolvePrimaryTree(
  db:       D1Database,
  memberNo: string,
): Promise<PrimaryTreeResult> {

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
    return null
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
   *           （X 係子女，該樹有其父母）
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
    primaryFamilyId: primaryNode.family_id,
    primaryMemberId: primaryNode.id,
    familyIds,
  }
}
