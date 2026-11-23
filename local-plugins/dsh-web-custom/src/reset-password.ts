#!/usr/bin/env node
/** Reset an existing Web login password from a private terminal. */
import { join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { readConfirmedPassword } from './terminal-password.ts'
import { openUsers, resetPassword } from './users.ts'

/** Open the account database and replace the named operator's password. */
async function main(): Promise<void> {
  const [username, databasePath, ...extra] = process.argv.slice(2)
  if (!username || extra.length > 0) throw new Error('Usage: node reset-password.js <username> [databasePath]')
  const database = await openUsers(databasePath ?? join(resolveDshHome(), 'auth', 'users.sqlite'), 'existing')
  try {
    const password = await readConfirmedPassword('New password: ')
    await resetPassword(database, username, password)
    process.stdout.write('Web login password reset. Sign in with the new password.\n')
  } finally {
    database.close()
  }
}

try {
  await main()
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Web password reset failed'}\n`)
  process.exitCode = 1
}
