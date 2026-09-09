/**
 * _verifyHandoff — 驗證 85AI 簽發嘅 Handoff Token
 *
 * Token 格式：
 *   base64url(JSON payload) + '.' + base64url(HMAC-SHA256 signature)
 *   payload = { member_no: string, exp: number (unix 秒) }
 *
 * ════════════════════════════════════════════════════════════
 * 安全鐵律：
 *   1. HMAC 簽名用 FAMILY_TREE_API_KEY 重算，constant-time 比對（防 timing attack）
 *   2. exp 必須 > 現在時間（unix 秒）
 *   3. 任何驗證失敗 → { ok: false }，唔洩露具體原因（防 oracle）
 *   4. 唔允許任何 fallback 到明文身份參數
 * ════════════════════════════════════════════════════════════
 *
 * Cloudflare Pages Function — edge runtime（Web Crypto API 可用）
 */

/* base64url → Uint8Array（無 padding 兼容版）*/
function base64urlToBytes(b64: string): Uint8Array {
  /* base64url → standard base64：替換字元 + 補 padding */
  const standard = b64
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')
  const binary = atob(standard)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/* ── Constant-time 字節比對（防 timing attack）── */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

export type VerifyHandoffResult =
  | { ok: true;  memberNo: string }
  | { ok: false }

/**
 * verifyHandoffToken
 *
 * @param token  - 完整 token 字串（base64url_payload.base64url_sig）
 * @param apiKey - FAMILY_TREE_API_KEY（由呼叫者從 ctx.env 讀取）
 */
export async function verifyHandoffToken(
  token:  string,
  apiKey: string,
): Promise<VerifyHandoffResult> {
  /* ── 1. 分割 token ── */
  const dotIdx = token.indexOf('.')
  if (dotIdx === -1) return { ok: false }

  const payloadB64 = token.slice(0, dotIdx)
  const sigB64     = token.slice(dotIdx + 1)
  if (!payloadB64 || !sigB64) return { ok: false }

  /* ── 2. 重算 HMAC-SHA256 簽名 ── */
  let computedSig: Uint8Array
  try {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuf = await crypto.subtle.sign(
      'HMAC',
      keyMaterial,
      new TextEncoder().encode(payloadB64),  // 對 base64url payload 字串簽名（與 85AI 側一致）
    )
    computedSig = new Uint8Array(sigBuf)
  } catch {
    return { ok: false }
  }

  /* ── 3. Constant-time 比對簽名 ── */
  let receivedSig: Uint8Array
  try {
    receivedSig = base64urlToBytes(sigB64)
  } catch {
    return { ok: false }
  }

  if (!constantTimeEqual(computedSig, receivedSig)) {
    return { ok: false }
  }

  /* ── 4. 解碼 payload ── */
  let payload: { member_no?: unknown; exp?: unknown }
  try {
    const payloadBytes = base64urlToBytes(payloadB64)
    const payloadStr   = new TextDecoder().decode(payloadBytes)
    payload = JSON.parse(payloadStr) as { member_no?: unknown; exp?: unknown }
  } catch {
    return { ok: false }
  }

  /* ── 5. 驗 member_no 格式 ── */
  if (!payload.member_no || typeof payload.member_no !== 'string' || payload.member_no.trim() === '') {
    return { ok: false }
  }

  /* ── 6. 驗 exp（必須未過期）── */
  if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return { ok: false }
  }
  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.exp <= nowSec) {
    return { ok: false }  // 已過期
  }

  return { ok: true, memberNo: payload.member_no.trim() }
}
