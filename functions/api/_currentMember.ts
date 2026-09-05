/**
 * _currentMember — 共用 helper
 *
 * 第一版臨時方案：用當前 family 的 is_self = 1 成員頂住「登入用戶」。
 * 將來接認證時，只需修改此一個檔案，所有 feed 寫入 API 自動套用新邏輯。
 *
 * 回傳格式：
 *   { ok: true,  familyId: string, memberId: string }   — 成功
 *   { ok: false, response: Response }                    — 失敗（已含 status / JSON）
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 */

import type { Env } from './_types'

export type CurrentMemberOk = {
  ok: true
  familyId: string
  memberId: string
}

export type CurrentMemberErr = {
  ok: false
  response: Response
}

export type CurrentMemberResult = CurrentMemberOk | CurrentMemberErr

/**
 * 攞當前 family 的 is_self 成員。
 *
 * 步驟：
 *   1. SELECT 最早建立的 family（與現有 members.ts 邏輯一致）
 *   2. 喺該 family 找 is_self = 1 的成員
 *   3. 搵唔到 family → 409
 *   4. 搵唔到 is_self member → 409（引導用戶先設定本人）
 */
export async function getCurrentMember(db: D1Database): Promise<CurrentMemberResult> {
  // 1. 攞第一棵 family
  const family = await db
    .prepare('SELECT id FROM families ORDER BY created_at ASC LIMIT 1')
    .first<{ id: string }>()

  if (!family) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: '找不到家族，請先建立成員' },
        { status: 409 }
      ),
    }
  }

  // 2. 攞 is_self 成員
  const selfMember = await db
    .prepare('SELECT id FROM members WHERE family_id = ? AND is_self = 1 LIMIT 1')
    .bind(family.id)
    .first<{ id: string }>()

  if (!selfMember) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, error: '未設定本人，請先於成員資料設定本人' },
        { status: 409 }
      ),
    }
  }

  return {
    ok: true,
    familyId: family.id,
    memberId: selfMember.id,
  }
}
