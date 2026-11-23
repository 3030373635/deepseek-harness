/** Durable local Web accounts and Argon2id password verification. */
import * as crypto from 'node:crypto'
import { closeSync, mkdirSync, openSync } from 'node:fs'
import { dirname, isAbsolute } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'

const options = { parallelism: 1, memory: 19 * 1024, passes: 2, tagLength: 32 }
const algorithm = '$argon2id$v=19$m=19456,t=2,p=1$'
const dummySalt = Buffer.alloc(16)
const dummyDigest = Buffer.alloc(32)

/** Minimum character count for new Web passwords. */
export const minimumPasswordLength = 8

interface NewUser {
  id: string
  username: string
  hash: string
}

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
 * Open the account database for Web or for password recovery.
 * @param path - absolute path in the deployment's private data directory.
 * @param mode - defaults to creating the database and schema when absent. Existing mode requires a writable database file and leaves its schema as-is.
 * @returns the database owned by the caller, which must close it.
 */
export async function openUsers(path: string, mode: 'create' | 'existing' = 'create'): Promise<DatabaseSync> {
  if (!isAbsolute(path)) throw new Error('Web account databasePath must be absolute')
  const { DatabaseSync } = await import('node:sqlite')
  if (mode === 'existing') {
    const url = pathToFileURL(path)
    url.searchParams.set('mode', 'rw')
    try {
      return new DatabaseSync(url.href)
    } catch (error) {
      throw new Error(`Cannot open the Web account database at ${JSON.stringify(path)}. Check the Web data directory and write permissions.`, { cause: error })
    }
  }
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
 * Validate and hash credentials before creating or updating a local operator.
 * @param username - unique login name.
 * @param password - operator password held in memory during hashing.
 * @returns a record ready for insertion, or a validation message.
 */
export async function prepareUser(username: string, password: string): Promise<NewUser | { error: string }> {
  if (username.length < 1 || username.length > 80 || username.trim() !== username) {
    return { error: 'Username must contain 1–80 characters with no surrounding whitespace' }
  }
  if (Buffer.byteLength(password) > 1024 || [...password].length < minimumPasswordLength) {
    return { error: `Password must contain at least ${minimumPasswordLength} characters and at most 1024 UTF-8 bytes` }
  }
  const salt = crypto.randomBytes(16)
  const digest = await hashPassword(password, salt)
  const encoded = algorithm + salt.toString('base64').replace(/=+$/u, '') + '$' + digest.toString('base64').replace(/=+$/u, '')
  return { id: crypto.randomBytes(16).toString('hex'), username, hash: encoded }
}

/**
 * Persist the first operator only if the account table is empty at insertion time.
 * @param database - open account database.
 * @param user - validated, hashed credentials.
 * @returns whether this operator was inserted.
 */
export function insertFirstUser(database: DatabaseSync, user: NewUser): boolean {
  const result = database.prepare(`
    INSERT INTO users (id, username, password_hash, created_at)
    SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users)
  `).run(user.id, user.username, user.hash, new Date().toISOString())
  return result.changes === 1
}

/**
 * Insert a local operator with access to the DSH instance.
 * @param database - open account database.
 * @param username - unique login name.
 * @param password - operator password held in memory during hashing.
 */
export async function createUser(database: DatabaseSync, username: string, password: string): Promise<void> {
  const user = await prepareUser(username, password)
  if ('error' in user) throw new Error(user.error)
  database.prepare('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(user.id, user.username, user.hash, new Date().toISOString())
}

/**
 * Replace an existing operator's password and invalidate their previous browser cookies.
 * @param database - open existing account database.
 * @param username - exact login name of the existing operator.
 * @param password - replacement password held in memory during hashing.
 * @throws Error when the credentials fail validation or the account does not exist.
 */
export async function resetPassword(database: DatabaseSync, username: string, password: string): Promise<void> {
  const user = await prepareUser(username, password)
  if ('error' in user) throw new Error(user.error)
  const result = database.prepare('UPDATE users SET id = ?, password_hash = ? WHERE username = ?')
    .run(user.id, user.hash, user.username)
  if (result.changes === 0) throw new Error('No Web login account has that username. Check the username and try again.')
}

/**
 * Check submitted credentials with one Argon2id computation even for an unknown username.
 * @param database - open account database.
 * @param username - supplied login name.
 * @param password - supplied password.
 * @returns the account ID from the verified password record, which a reset can replace.
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
