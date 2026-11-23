/** Private password entry for the local account maintenance commands. */
import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'

/**
 * Read and confirm a password without echoing either value to the terminal.
 * @param prompt - prompt for the first password entry.
 * @returns the password when both entries match.
 */
export async function readConfirmedPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Run this command in a terminal to enter the password privately')
  const sink = new Writable({ write(_chunk, _encoding, callback) { callback() } })
  const terminal = createInterface({ input: process.stdin, output: sink, terminal: true })
  const interrupt = new AbortController()
  const cancel = () => interrupt.abort()
  terminal.once('SIGINT', cancel)
  terminal.once('close', cancel)
  try {
    process.stderr.write(prompt)
    const password = await terminal.question('', { signal: interrupt.signal })
    process.stderr.write('\nConfirm password: ')
    const confirmation = await terminal.question('', { signal: interrupt.signal })
    if (password !== confirmation) throw new Error('The passwords do not match')
    return password
  } finally {
    terminal.close()
    sink.destroy()
    process.stderr.write('\n')
  }
}
