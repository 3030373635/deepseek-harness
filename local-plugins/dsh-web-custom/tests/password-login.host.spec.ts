/** HTTP coverage for the optional Web account provider. */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import * as Connection from '@deepseek-ai/dsh-client-connection'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import { afterEach, expect, it, vi } from 'vitest'
import * as Authentication from '../src/index.ts'
import * as Captcha from '../src/captcha.ts'
import { createUser, openUsers } from '../src/users.ts'
import { RecordCredentials } from './browser-credentials.ts'

let context: Context | undefined
let directory: string | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  if (directory !== undefined) await rm(directory, { recursive: true, force: true })
  context = undefined
  directory = undefined
  vi.restoreAllMocks()
})

/** Mount the HTTP carrier and the password provider in a private test instance. */
async function start() {
  directory = await mkdtemp(join(tmpdir(), 'dsh-web-password-'))
  context = new Context()
  context.provide('credentials', new RecordCredentials())
  await context.plugin(WebServer, WebServer.Config({ host: '127.0.0.1', port: 0 })).await()
  await context.plugin(Connection).await()
  const databasePath = join(directory, 'users.sqlite')
  const config = Authentication.Config({
    databasePath,
    secureCookies: false,
    sessionSeconds: 8 * 3600,
    captchaSeconds: 180,
    captchaCapacity: 256,
    concurrentPasswordChecks: 4,
  })
  await context.plugin(Authentication, config).await()
  const server = context.webServer
  const resource = async (): Promise<Response> => new Response('app')
  context.effect(() => server.register({ kind: 'exact', path: '/', resource }))
  context.effect(() => server.register({ kind: 'exact', path: '/private', resource }))
  return { origin: server.getOrigin(), databasePath }
}

it('redirects the unauthenticated Web entry and issues a PNG challenge', async () => {
  const { origin } = await start()
  const response = await fetch(`${origin}/`, { redirect: 'manual' })
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toBe('/login')
  const page = await fetch(`${origin}/login`)
  const html = await page.text()
  expect(html).toContain('name="captcha"')
  expect(html).toContain('<link rel="icon" type="image/png" href="/dsh-web-custom/logo.png">')
  const favicon = await fetch(`${origin}/dsh-web-custom/logo.png`)
  expect(favicon.status).toBe(200)
  expect(favicon.headers.get('content-type')).toBe('image/png')
  expect(Buffer.from(await favicon.arrayBuffer()).subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'))
  expect((await fetch(`${origin}/private`)).status).toBe(401)
  expect((await fetch(`${origin}/auth/challenges`, { method: 'POST' })).status).toBe(403)
  const image = await fetch(`${origin}/auth/challenges`, { method: 'POST', headers: { origin } })
  expect(image.headers.get('content-type')).toBe('image/png')
  expect(Buffer.from(await image.arrayBuffer()).subarray(0, 8)).toEqual(Buffer.from('89504e470d0a1a0a', 'hex'))
  expect(image.headers.get('set-cookie')).toContain('HttpOnly')
})

it('consumes a CAPTCHA on the first attempt and admits only the signed session cookie', async () => {
  vi.spyOn(Captcha, 'createCaptchaCode').mockReturnValue('12345')
  const { origin, databasePath } = await start()
  const database = await openUsers(databasePath)
  try {
    await createUser(database, 'operator', 'test-only password')
    const row = database.prepare('SELECT password_hash FROM users').get()
    expect(row?.password_hash).toMatch(/^\$argon2id\$/u)
  } finally {
    database.close()
  }

  /** Create a challenge and return the browser cookie that holds its identifier. */
  async function challenge(): Promise<string> {
    const response = await fetch(`${origin}/auth/challenges`, { method: 'POST', headers: { origin } })
    await response.arrayBuffer()
    return response.headers.get('set-cookie')?.split(';')[0] ?? ''
  }

  /**
   * Submit a browser login attempt.
   * @param cookie - issued CAPTCHA cookie.
   * @param captcha - challenge answer submitted by the browser.
   * @returns the HTTP response from DSH.
   */
  function login(cookie: string, captcha: string, password = 'test-only password'): Promise<Response> {
    return fetch(`${origin}/auth/sessions`, {
      method: 'POST', headers: { origin, cookie }, body: new URLSearchParams({ username: 'operator', password, captcha }),
    })
  }

  const used = await challenge()
  expect((await login(used, '00000')).status).toBe(401)
  expect((await login(used, '12345')).status).toBe(401)
  expect((await login(await challenge(), '12345', 'incorrect')).status).toBe(401)
  const signedIn = await login(await challenge(), '12345')
  expect(signedIn.status).toBe(201)
  const setCookie = signedIn.headers.get('set-cookie')
  expect(setCookie).toContain('HttpOnly; SameSite=Strict')
  const cookie = setCookie?.split(';')[0] ?? ''
  expect(cookie.split('.')).toHaveLength(3)
  expect(await (await fetch(`${origin}/`, { headers: { cookie } })).text()).toBe('app')
  expect((await fetch(`${origin}/private`, { headers: { cookie } })).status).toBe(200)
  expect((await fetch(`${origin}/private`, { headers: { cookie: cookie + 'tampered' } })).status).toBe(401)

  const current = `${origin}/auth/sessions/current`
  expect((await fetch(current)).status).toBe(401)
  expect((await fetch(current, { headers: { cookie: cookie + 'tampered' } })).status).toBe(401)
  const profile = await fetch(current, { headers: { cookie } })
  expect(profile.status).toBe(200)
  expect(profile.headers.get('cache-control')).toBe('no-store')
  expect(await profile.json()).toEqual({ username: 'operator' })

  const crossOrigin = await fetch(current, { method: 'DELETE', headers: { cookie, origin: 'https://example.invalid' } })
  expect(crossOrigin.status).toBe(403)
  expect(crossOrigin.headers.get('set-cookie')).toBeNull()
  const signOut = await fetch(current, { method: 'DELETE', headers: { cookie, origin } })
  expect(signOut.status).toBe(204)
  expect(signOut.headers.get('set-cookie')).toBe(`${cookie.split('=')[0]}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`)
})
