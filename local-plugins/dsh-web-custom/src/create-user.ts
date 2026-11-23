#!/usr/bin/env node
/** Provision a Web login operator from a private terminal. */
import { join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { readConfirmedPassword } from './terminal-password.ts'
import { createUser, openUsers } from './users.ts'

/** Read the operator's login details and persist the password hash. */
async function main(): Promise<void> {
  const [username, databasePath, ...extra] = process.argv.slice(2)
  if (!username || extra.length > 0) throw new Error('Usage: dsh-web-custom-user <username> [databasePath]')
  const password = await readConfirmedPassword('Password: ')
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
