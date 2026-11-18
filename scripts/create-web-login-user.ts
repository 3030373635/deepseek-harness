/** Provision a Web login operator from a private terminal. */
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { createUser, openUsers } from '../packages/host/authentication-token/src/password-login/users.ts'
import { resolveDshHome } from '../packages/util/home-paths/src/index.ts'

/**
 * Read one password through readline without echoing it to the terminal.
 * @param prompt - prompt displayed before switching to hidden input.
 * @returns the password entered by the operator.
 */
async function readPassword(prompt: string): Promise<string> {
  process.stderr.write(prompt)
  const sink = new Writable({ write(_chunk, _encoding, callback) { callback() } })
  const terminal = createInterface({ input: process.stdin, output: sink, terminal: true })
  const interrupt = new AbortController()
  terminal.on('SIGINT', () => { interrupt.abort() })
  try {
    return await terminal.question('', { signal: interrupt.signal })
  } finally {
    terminal.close()
    sink.destroy()
    process.stderr.write('\n')
  }
}

/** Read the operator's login details and persist the password hash. */
async function main(): Promise<void> {
  const [username, databasePath, ...extra] = process.argv.slice(2)
  if (!username || extra.length > 0) throw new Error('Usage: pnpm exec tsx scripts/create-web-login-user.ts <username> [databasePath]')
  if (!process.stdin.isTTY) throw new Error('Run this command in a terminal to enter the password privately')
  const password = await readPassword('Password: ')
  const confirmation = await readPassword('Confirm password: ')
  if (password !== confirmation) throw new Error('The passwords do not match')
  const database = await openUsers(databasePath ?? join(resolveDshHome(), 'auth', 'users.sqlite'))
  try {
    await createUser(database, username, password)
    process.stdout.write('Web login account created.\n')
  } finally {
    database.close()
  }
}

try {
  await main()
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Web account creation failed'}\n`)
  process.exitCode = 1
}
