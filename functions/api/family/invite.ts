/**
 * POST /api/family/invite
 * 向被邀請者發送 WhatsApp 邀請訊息。
 *
 * 認證：讀 family_session cookie → 查 family_sessions 取得 member_no。
 *       冇 cookie / session 過期 → 401。
 *
 * Request body (JSON):
 * {
 *   phone:          string   // 被邀請者電話（server-side normalize 後須為 8 位數字）
 *   invitee_name?:  string   // 被邀請者稱呼（可選）
 * }
 *
 * Response:
 *   200  { ok: true,  sent: boolean, reason?: string }
 *        sent:false 都係 200 — 邀請已受理但 WA 未設定或發送失敗
 *   400  phone 格式錯誤 / JSON 無效
 *   401  無效 session
 *   500  伺服器內部錯誤
 *
 * WA token 可插拔：
 *   WHATSAPP_TOKEN / WHATSAPP_PHONE_ID 未設定 → console.log + sent:false
 *   兩者皆設定 → 真實呼叫 WhatsApp Business Cloud API
 *
 * ⚠️ 安全鐵律：
 *   WHATSAPP_TOKEN 絕對唔可出現喺回應 body、log 正文、或任何前端可見位置。
 *
 * Cloudflare Pages Function — edge runtime
 * binding: DB (D1)
 * secret:  WHATSAPP_TOKEN, WHATSAPP_PHONE_ID
 */

import type { Env } from '../_types'

/* ════════════════════════════════════════════════════════════
 * 從 Cookie header string parse 出指定 cookie 值
 * （複製 me.ts / login.ts / setup.ts 同款 helper，避免 cross-import）
 * ════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════
 * phone normalize：去非數字 → 去 852/+852 prefix → 留最後 8 位
 * 結果須恰好 8 位數字，否則回 null（交由 caller 回 400）
 * ════════════════════════════════════════════════════════════ */
function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let n = raw.replace(/\D/g, '')
  if (n.startsWith('852')) n = n.slice(3)
  if (n.length > 8) n = n.slice(-8)
  return /^\d{8}$/.test(n) ? n : null
}

/* ════════════════════════════════════════════════════════════
 * WA helper：可插拔式 WhatsApp Business Cloud API 發送
 *
 * 未設 token/phone_id → log + 回 { sent:false, reason:'wa_not_configured' }
 * 兩者俱備          → 真實 fetch，成功回 { sent:true }
 *                      失敗 log（唔 log token）+ 回 { sent:false, reason:'wa_send_failed' }
 * ════════════════════════════════════════════════════════════ */
async function sendWhatsAppInvite(
  env: Env,
  toPhone: string,
  inviteText: string,
): Promise<{ sent: boolean; reason?: string }> {
  const token   = env.WHATSAPP_TOKEN
  const phoneId = env.WHATSAPP_PHONE_ID

  /* ── 未設定 → 略過真發 ── */
  if (!token || !phoneId) {
    console.log('[invite] WA 未設定，略過真發', { toPhone })
    return { sent: false, reason: 'wa_not_configured' }
  }

  /* ── 兩者俱備 → 真實呼叫 WhatsApp Business Cloud API ── */
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        // ⚠️ token 只用於 Authorization header，絕不寫入 log 或 response
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `852${toPhone}`,   // WhatsApp 需要完整國際號碼（不含 +）
        type: 'template',
        template: {
          // TODO: 換成已審批 template 名同參數（待 Meta 審批後更新）
          // 現時 'family_tree_invite' 為 placeholder template 名
          name: 'family_tree_invite',
          language: { code: 'zh_HK' },
          components: [
            {
              type: 'body',
              parameters: [
                // TODO: 按已審批 template 的參數順序填入對應值
                // 暫時傳入邀請文字作為單一 text 參數（placeholder）
                { type: 'text', text: inviteText },
              ],
            },
          ],
        },
      }),
    })

    if (res.ok) {
      return { sent: true }
    }

    /* fetch 成功但 API 回錯（e.g. 4xx/5xx）→ log 狀態碼，唔 log token */
    const errBody = await res.text().catch(() => '(unreadable)')
    console.error('[invite] WA API 回錯', { status: res.status, toPhone, errBody })
    return { sent: false, reason: 'wa_send_failed' }

  } catch (e) {
    /* 網絡層例外 → log，唔 log token */
    console.error('[invite] WA fetch 例外', { toPhone, error: e instanceof Error ? e.message : String(e) })
    return { sent: false, reason: 'wa_send_failed' }
  }
}

/* ════════════════════════════════════════════════════════════
 * Main handler
 * ════════════════════════════════════════════════════════════ */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB

  /* ── 1. 認證：讀 cookie → parse token → 查 family_sessions ── */
  const cookieHeader = ctx.request.headers.get('cookie')
  const token        = parseCookieValue(cookieHeader, 'family_session')

  if (!token) {
    return Response.json({ ok: false }, { status: 401 })
  }

  let memberNo: string
  try {
    const sess = await db
      .prepare(
        `SELECT member_no
         FROM family_sessions
         WHERE token = ? AND expires_at > datetime('now')`
      )
      .bind(token)
      .first<{ member_no: string }>()

    if (!sess) {
      return Response.json({ ok: false }, { status: 401 })
    }
    memberNo = sess.member_no
  } catch (e) {
    console.error('[invite] session 查詢失敗:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }

  /* ── 2. 解析 request body ── */
  let body: Record<string, unknown>
  try {
    body = await ctx.request.json() as Record<string, unknown>
  } catch {
    return Response.json({ ok: false, error: '無效的 JSON 格式' }, { status: 400 })
  }

  const { phone, invitee_name } = body as { phone?: unknown; invitee_name?: unknown }

  /* ── 3. phone normalize + 驗證 ── */
  const phoneNorm = normalizePhone(phone)
  if (!phoneNorm) {
    return Response.json({ ok: false, error: '電話格式錯誤' }, { status: 400 })
  }

  const inviteeName = (typeof invitee_name === 'string' && invitee_name.trim())
    ? invitee_name.trim()
    : '您'   // 無稱呼時用「您」（書面語，符合 §15.3）

  /* ── 4. 組邀請文（書面語，含被邀請人稱呼 + 邀請人 member_no + onboard link）── */
  const onboardLink = 'https://family.coeldery85.com/#/login'
  const inviteText  =
    `${inviteeName}您好，${memberNo} 誠邀您加入家族樹。` +
    `請按以下連結完成首次登入及設定：${onboardLink}`

  /* ── 5. 發送 WhatsApp（可插拔）── */
  let waResult: { sent: boolean; reason?: string }
  try {
    waResult = await sendWhatsAppInvite(ctx.env, phoneNorm, inviteText)
  } catch (e) {
    console.error('[invite] sendWhatsAppInvite 未預期例外:', e)
    return Response.json({ ok: false, error: '伺服器錯誤，請稍後再試' }, { status: 500 })
  }

  /* ── 6. 回應（sent:false 都係 200 — 邀請已受理）── */
  return Response.json({
    ok:     true,
    sent:   waResult.sent,
    ...(waResult.reason !== undefined ? { reason: waResult.reason } : {}),
  })
}
