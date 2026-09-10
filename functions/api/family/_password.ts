/**
 * _password — 密碼 hash / 驗證（共用）
 *   hashPassword   : PBKDF2-SHA256（Web Crypto，edge runtime）
 *   verifyPassword : constant-time 比對
 *
 * 存格式：pbkdf2$<iterations>$<saltHex>$<hashHex>
 *   由 setup.ts / setup-with-session.ts / login.ts / profile.ts 共用（避免重複）。
 */

const ITERATIONS = 100_000
const HASH_BYTES = 32

/** 產生 PBKDF2-SHA256 hash（格式：pbkdf2$100000$<saltHex>$<hashHex>）*/
export async function hashPassword(password: string): Promise<string> {
  const saltArr = new Uint8Array(16)
  crypto.getRandomValues(saltArr)
  const saltHex = Array.from(saltArr).map(b => b.toString(16).padStart(2, '0')).join('')

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )

  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltArr, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8,
  )

  const hashHex = Array.from(new Uint8Array(derived))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `pbkdf2$${ITERATIONS}$${saltHex}$${hashHex}`
}

/** 驗證密碼（constant-time 比對，防 timing attack）*/
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false

  const iterations = parseInt(parts[1], 10)
  const saltHex    = parts[2]
  const hashHex    = parts[3]

  if (!Number.isInteger(iterations) || iterations <= 0) return false
  if (saltHex.length === 0 || hashHex.length === 0)     return false

  const saltArr = new Uint8Array(saltHex.length / 2)
  for (let i = 0; i < saltArr.length; i++) {
    saltArr[i] = parseInt(saltHex.slice(i * 2, i * 2 + 2), 16)
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )

  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltArr, iterations, hash: 'SHA-256' },
    keyMaterial,
    32 * 8,
  )

  const derivedHex = Array.from(new Uint8Array(derived))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  /* constant-time 比對 */
  const len = Math.max(derivedHex.length, hashHex.length)
  let diff = 0
  for (let i = 0; i < len; i++) {
    const a = i < derivedHex.length ? derivedHex.charCodeAt(i) : 0
    const b = i < hashHex.length    ? hashHex.charCodeAt(i)    : 0
    diff |= (a ^ b)
  }
  return diff === 0
}
