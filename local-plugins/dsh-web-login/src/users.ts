/** Durable local Web accounts and Argon2id password verification. */
import * as crypto from 'node:crypto'
import { closeSync, mkdirSync, openSync } from 'node:fs'
import { dirname, isAbsolute } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'

const options = { parallelism: 1, memory: 19 * 1024, passes: 2, tagLength: 32 }
const algorithm = '$argon2id$v=19$m=19456,t=2,p=1$'
const dummySalt = Buffer.alloc(16)
const dummyDigest = Buffer.alloc(32)

type Argon2 = (
  name: 'argon2id',
  parameters: typeof options & { message: string; nonce: Buffer },
  callback: (error: Error | null, digest: Buffer) => void,
) => void

/**
 * Derive a password hash on the crypto worker pool.
 * @param password - submitted password in UTF-8.
 * @param salt - stored or newly generated salt.
 * @returns the raw Argon2id digest.
 */
function hashPassword(password: string, salt: Buffer): Promise<Buffer> {
  // The runtime floor includes Argon2; the repository still targets Node 22 declaration files.
  const implementation: unknown = Reflect.get(crypto, 'argon2')
  if (typeof implementation !== 'function') throw new Error('Web password login requires Node.js Argon2 support')
  const argon2 = implementation as Argon2
  return new Promise((resolve, reject) => {
    argon2('argon2id', { ...options, message: password, nonce: salt }, (error, digest) => {
      if (error !== null) reject(error)
      else resolve(digest)
    })
  })
}

/**
 * Open the account database and create its initial schema.
 * @param path - absolute path in the deployment's private data directory.
 * @returns the database owned by the caller, which must close it.
 */
export async function openUsers(path: string): Promise<DatabaseSync> {
  if (!isAbsolute(path)) throw new Error('Web account databasePath must be absolute')
  const { DatabaseSync } = await import('node:sqlite')
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  closeSync(openSync(path, 'a', 0o600))
  const database = new DatabaseSync(path)
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      ) STRICT;
    `)
    return database
  } catch (error) {
    database.close()
    throw error
  }
}

/**
 * Insert a local operator with access to the DSH instance.
 * @param database - open account database.
 * @param username - unique login name.
 * @param password - operator password held in memory during hashing.
 */
export async function createUser(database: DatabaseSync, username: string, password: string): Promise<void> {
  if (username.length < 1 || username.length > 80 || username.trim() !== username) {
    throw new Error('Username must contain 1–80 characters with no surrounding whitespace')
  }
  if (password.length < 12 || Buffer.byteLength(password) > 1024) {
    throw new Error('Password must contain at least 12 characters and at most 1024 UTF-8 bytes')
  }
  const salt = crypto.randomBytes(16)
  const digest = await hashPassword(password, salt)
  const encoded = algorithm + salt.toString('base64').replace(/=+$/u, '') + '$' + digest.toString('base64').replace(/=+$/u, '')
  const id = crypto.randomBytes(16).toString('hex')
  database.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').run(id, username, encoded, new Date().toISOString())
}

/**
 * Check submitted credentials with one Argon2id computation even for an unknown username.
 * @param database - open account database.
 * @param username - supplied login name.
 * @param password - supplied password.
 * @returns the stable user ID when the password matches.
 */
export async function verifyUser(database: DatabaseSync, username: string, password: string): Promise<string | undefined> {
  const row = database.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username)
  if (row === undefined) {
    crypto.timingSafeEqual(await hashPassword(password, dummySalt), dummyDigest)
    return undefined
  }
  if (typeof row.id !== 'string' || typeof row.password_hash !== 'string' || !row.password_hash.startsWith(algorithm)) {
    throw new Error('Web account database contains an unsupported password record')
  }
  const [encodedSalt, encodedDigest] = row.password_hash.slice(algorithm.length).split('$')
  const salt = Buffer.from(encodedSalt ?? '', 'base64')
  const digest = Buffer.from(encodedDigest ?? '', 'base64')
  if (salt.length !== 16 || digest.length !== 32) throw new Error('Web account database contains an invalid password record')
  return crypto.timingSafeEqual(await hashPassword(password, salt), digest) ? row.id : undefined
}
