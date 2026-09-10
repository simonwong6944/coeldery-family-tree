/**
 * _referrals — 推薦（Type B 推薦獎勵券）共用 helper
 *
 * 規格：family_gather.md §6（Type B 推薦獎勵券）、§8（推薦飛輪）；product_decisions v1.12
 *
 * 「成功推薦」定義（v1，兩條路徑都會將 referral 標為 joined）：
 *   ① 被邀請人自己完成首次設定（`family/setup.ts` 建 member_auth 時以電話配對）
 *   ② 邀請人喺「加成員」時加入該位家人（`members.ts` 以電話配對）
 */

/** 電話 normalize：去非數字 → 去 852 → 留最後 8 位；唔合格回 null */
export function normalizePhone8(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let n = raw.replace(/\D/g, '')
  if (n.startsWith('852')) n = n.slice(3)
  if (n.length > 8) n = n.slice(-8)
  return /^\d{8}$/.test(n) ? n : null
}

/** 隱藏中間號碼（例：9123****） */
export function maskPhone(phone: string): string {
  if (phone.length !== 8) return '****'
  return phone.slice(0, 4) + '****'
}

/** 該會員「已成功加入」嘅推薦人數 */
export async function joinedReferralCount(db: D1Database, memberNo: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM referral
       WHERE inviter_member_no = ? AND status = 'joined'`
    )
    .bind(memberNo)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/** 已邀請（未加入）人數 */
export async function invitedReferralCount(db: D1Database, memberNo: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM referral
       WHERE inviter_member_no = ? AND status = 'invited'`
    )
    .bind(memberNo)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/**
 * 標記「成功加入」：以電話將所有未計帳嘅邀請標為 joined。
 * 由 setup.ts（被邀請人自己設定）同 members.ts（邀請人加成員）呼叫。
 * 回傳更新咗幾多筆。
 */
export async function markReferralJoined(
  db: D1Database,
  phone: string,
  inviteeMemberNo: string | null,
  inviterMemberNo?: string | null,
): Promise<number> {
  const where = inviterMemberNo
    ? 'invitee_phone = ? AND inviter_member_no = ? AND status = ?'
    : 'invitee_phone = ? AND status = ?'
  const binds: unknown[] = inviterMemberNo ? [phone, inviterMemberNo, 'invited'] : [phone, 'invited']
  const res = await db
    .prepare(
      `UPDATE referral
       SET status = 'joined', invitee_member_no = COALESCE(?, invitee_member_no),
           joined_at = datetime('now')
       WHERE ${where}`
    )
    .bind(inviteeMemberNo, ...binds)
    .run()
  return res.meta?.changes ?? 0
}
