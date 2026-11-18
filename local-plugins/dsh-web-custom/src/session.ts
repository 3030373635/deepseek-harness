/** Authority-bound JWTs issued and verified by the local Web Host. */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { credentialKey, type CredentialProvider, type CredentialRecord } from '@deepseek-ai/dsh-credentials'

const key = credentialKey('host-web-password', 'jwt-signing-key')
const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
const issuer = 'dsh-web-password'

/**
 * Read the locally generated signing key from the credentials store.
 * @param record - persisted credential record.
 * @returns the 256-bit signing key.
 */
function readKey(record: CredentialRecord | undefined): Buffer {
  const payload = record?.kind === 'grant' ? record.payload : undefined
  const value = typeof payload === 'object' && payload !== null && 'secret' in payload ? payload.secret : undefined
  if (typeof value !== 'string' || !/^[\w-]{43}$/u.test(value)) throw new Error('Invalid Web session signing key')
  return Buffer.from(value, 'base64url')
}

/**
 * Load or initialize the signing key atomically in the Host credential store.
 * @param credentials - credential provider owning the key record.
 * @returns the signing key used by this Host.
 */
export async function initializeSessionKey(credentials: CredentialProvider): Promise<Buffer> {
  const record = await credentials.modifyRecord(key, current => Promise.resolve(current === undefined
    ? { kind: 'grant', payload: { secret: randomBytes(32).toString('base64url') } }
    : undefined))
  return readKey(record)
}

/**
 * Issue a signed JWT with an absolute expiry and request authority as audience.
 * @param secret - signing key.
 * @param userId - stable authenticated account ID.
 * @param audience - public origin derived from the admitted request.
 * @param lifetime - validity in seconds.
 * @returns a compact JWT suitable for an HttpOnly cookie.
 */
export function issueSession(secret: Buffer, userId: string, audience: string, lifetime: number): string {
  const payload = Buffer.from(JSON.stringify({
    iss: issuer, sub: userId, aud: audience, exp: Math.floor(Date.now() / 1000) + lifetime,
  })).toString('base64url')
  const signed = `${header}.${payload}`
  return `${signed}.${createHmac('sha256', secret).update(signed).digest('base64url')}`
}

/**
 * Verify the sole supported JWT header, MAC, issuer, audience, and expiry.
 * @param secret - signing key.
 * @param token - untrusted cookie value.
 * @param audience - current admitted request origin.
 * @returns the authenticated account ID, or undefined for an invalid credential.
 */
export function readSession(secret: Buffer, token: string, audience: string): string | undefined {
  if (token.length > 1024) return undefined
  const parts = token.split('.')
  const [candidateHeader, encoded, signature] = parts
  if (parts.length !== 3 || candidateHeader !== header || encoded === undefined || signature === undefined) return undefined
  const expected = createHmac('sha256', secret).update(`${header}.${encoded}`).digest('base64url')
  const actual = Buffer.from(signature)
  if (actual.length !== expected.length || !timingSafeEqual(actual, Buffer.from(expected))) return undefined
  // Only authenticated tokens emitted by issueSession reach the JSON parser.
  const payload: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  if (typeof payload !== 'object' || payload === null
    || !('iss' in payload) || payload.iss !== issuer || !('aud' in payload) || payload.aud !== audience
    || !('sub' in payload) || typeof payload.sub !== 'string'
    || !('exp' in payload) || typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp)
    || payload.exp <= Math.floor(Date.now() / 1000)) return undefined
  return payload.sub
}
