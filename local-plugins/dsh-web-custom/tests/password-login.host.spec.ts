/** HTTP coverage for the optional Web account provider. */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { request, type IncomingHttpHeaders } from 'node:http'
import { Context } from '@deepseek-ai/cordis'
import * as Connection from '@deepseek-ai/dsh-client-connection'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import { afterEach, expect, it, vi } from 'vitest'
import * as Authentication from '../src/index.ts'
import * as Captcha from '../src/captcha.ts'
import * as Users from '../src/users.ts'
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

/**
 * Mount the HTTP carrier and password provider in a private test instance.
 * @param trustedHosts - Additional request authorities; empty admits only local authorities.
 * @returns The transport origin and account database path.
 */
async function start(trustedHosts: string[] = []) {
  directory = await mkdtemp(join(tmpdir(), 'dsh-web-password-'))
  context = new Context()
  context.provide('credentials', new RecordCredentials())
  await context.plugin(WebServer, WebServer.Config({ host: '127.0.0.1', port: 0 })).await()
  await context.plugin(Connection, { trustedHosts }).await()
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

/**
 * Send a request with a browser-facing Host while dialing the fixture's private listener.
 * @param origin - Ephemeral loopback listener origin.
 * @param path - Authentication or private resource path.
 * @param method - HTTP method.
 * @param headers - Browser authority, origin and optional cookies.
 * @param body - Optional URL-encoded sign-in form.
 * @returns The response status, headers and body after it finishes.
 */
function browserRequest(origin: string, path: string, method: string, headers: Record<string, string>, body?: URLSearchParams): Promise<{
  status: number | undefined
  headers: IncomingHttpHeaders
  body: Buffer
}> {
  return new Promise((resolve, reject) => {
    const outgoing = request(new URL(path, origin), { method, headers }, response => {
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => { chunks.push(chunk) })
      response.on('error', reject)
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }))
    })
    outgoing.on('error', reject)
    outgoing.end(body?.toString())
  })
}

it('signs in over HTTP through a trusted LAN authority and keeps the session bound to that origin', async () => {
  vi.spyOn(Captcha, 'createCaptchaCode').mockReturnValue('0123')
  const host = '192.168.50.2:3080'
  const publicOrigin = 'http://192.168.50.2:3080'
  const { origin, databasePath } = await start([host])
  const database = await Users.openUsers(databasePath)
  try {
    await Users.createUser(database, 'operator', 'test-only password')
  } finally {
    database.close()
  }
  const headers = { host, origin: publicOrigin }
  const challenge = await browserRequest(origin, '/auth/challenges', 'POST', headers)
  expect(challenge.status).toBe(201)
  expect(challenge.headers['content-type']).toBe('image/png')
  const challengeCookie = challenge.headers['set-cookie']?.[0] ?? ''
  expect(challengeCookie).toContain('HttpOnly; SameSite=Strict')
  expect(challengeCookie).not.toContain('; Secure')
  const signedIn = await browserRequest(origin, '/auth/sessions', 'POST', {
    ...headers,
    cookie: challengeCookie.split(';')[0] ?? '',
    'content-type': 'application/x-www-form-urlencoded',
  }, new URLSearchParams({ username: 'operator', password: 'test-only password', captcha: '0123' }))
  expect(signedIn.status).toBe(201)
  const sessionCookie = signedIn.headers['set-cookie']?.[0] ?? ''
  expect(sessionCookie).toContain('HttpOnly; SameSite=Strict')
  expect(sessionCookie).not.toContain('; Secure')
  const cookie = sessionCookie.split(';')[0] ?? ''
  const account = await browserRequest(origin, '/auth/sessions/current', 'GET', { host, cookie })
  expect(account.status).toBe(200)
  expect(JSON.parse(account.body.toString())).toEqual({ username: 'operator' })
  expect((await browserRequest(origin, '/private', 'GET', { host, cookie })).body.toString()).toBe('app')
  expect((await fetch(`${origin}/auth/sessions/current`, { headers: { cookie } })).status).toBe(401)
  const signOut = await browserRequest(origin, '/auth/sessions/current', 'DELETE', { ...headers, cookie })
  expect(signOut.status).toBe(204)
  expect(signOut.headers['set-cookie']?.[0]).toContain('Max-Age=0; HttpOnly; SameSite=Strict')
})

it('refuses untrusted hosts and cross-origin challenge requests on the LAN HTTP deployment', async () => {
  const { origin } = await start(['192.168.50.2:3080'])
  const untrusted = await browserRequest(origin, '/auth/challenges', 'POST', {
    host: '192.168.50.3:3080', origin: 'http://192.168.50.3:3080',
  })
  expect(untrusted.status).toBe(403)
  expect(untrusted.headers['set-cookie']).toBeUndefined()
  for (const source of ['http://192.168.50.3:3080', 'https://192.168.50.2:3080']) {
    const crossOrigin = await browserRequest(origin, '/auth/challenges', 'POST', {
      host: '192.168.50.2:3080', origin: source,
    })
    expect(crossOrigin.status).toBe(403)
    expect(crossOrigin.headers['set-cookie']).toBeUndefined()
  }
})

it('redirects the unauthenticated Web entry and issues a PNG challenge', async () => {
  const { origin, databasePath } = await start()
  const database = await Users.openUsers(databasePath)
  try {
    await Users.createUser(database, 'operator', 'test-only password')
  } finally {
    database.close()
  }
  const response = await fetch(`${origin}/`, { redirect: 'manual' })
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toBe('/login')
  const page = await fetch(`${origin}/login`)
  const html = await page.text()
  // SVG symbols and form controls share the ID namespace used for browser event binding.
  const ids = [...html.matchAll(/\bid="([^"]+)"/gu)].map(match => match[1])
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([])
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

it('registers the first operator from the Web and closes setup after one account is created', async () => {
  const { origin, databasePath } = await start()
  const entry = await fetch(`${origin}/`, { redirect: 'manual' })
  expect(entry.status).toBe(303)
  expect(entry.headers.get('location')).toBe('/register')
  const setup = await fetch(`${origin}/login`, { headers: { 'accept-language': 'zh-CN' } })
  expect(new URL(setup.url).pathname).toBe('/register')
  expect(setup.status).toBe(200)
  const html = await setup.text()
  expect(html).toContain('创建账号')
  expect(html).toContain('autocomplete="new-password"')
  expect(html).not.toContain('name="captcha"')

  /** Submit a first-account form with the browser's source origin. */
  function register(username: string, password: string, confirmation = password, source = origin): Promise<Response> {
    return fetch(`${origin}/register`, {
      method: 'POST', redirect: 'manual', headers: { origin: source },
      body: new URLSearchParams({ username, password, confirmation }),
    })
  }

  expect((await register('operator', 'lan-pass', 'lan-pass', 'https://example.invalid')).status).toBe(403)
  expect((await register('operator', 'too few')).status).toBe(422)
  expect((await register('operator', 'lan-pass', 'mismatch')).status).toBe(422)
  expect((await register(' operator ', 'lan-pass')).status).toBe(422)

  const prepareUser = Users.prepareUser
  const bothPreparing = Promise.withResolvers<void>()
  let preparing = 0
  // Both requests pass the initial database check before either account can be inserted.
  vi.spyOn(Users, 'prepareUser').mockImplementation(async (username, password) => {
    preparing += 1
    if (preparing === 2) bothPreparing.resolve()
    await bothPreparing.promise
    return prepareUser(username, password)
  })
  const attempts = await Promise.all([register('operator', 'lan-pass'), register('other', 'second-8')])
  expect(attempts.map(response => response.status).sort()).toEqual([201, 409])
  const winner = attempts[0].status === 201 ? 'operator' : 'other'
  const cookie = attempts.find(response => response.status === 201)?.headers.get('set-cookie')?.split(';')[0] ?? ''
  expect(await (await fetch(`${origin}/`, { headers: { cookie } })).text()).toBe('app')
  expect(await (await fetch(`${origin}/auth/sessions/current`, { headers: { cookie } })).json()).toEqual({ username: winner })

  const database = await Users.openUsers(databasePath)
  try {
    expect(database.prepare('SELECT username FROM users').all()).toEqual([{ username: winner }])
  } finally {
    database.close()
  }
  const closed = await fetch(`${origin}/register`, { redirect: 'manual' })
  expect(closed.status).toBe(303)
  expect(closed.headers.get('location')).toBe('/login')
  expect((await register('late', 'latepass')).status).toBe(409)
})

it('accepts a reset password and revokes only the target account’s previous cookies', async () => {
  vi.spyOn(Captcha, 'createCaptchaCode').mockReturnValue('0123')
  const { origin, databasePath } = await start()
  const database = await Users.openUsers(databasePath, 'existing')
  try {
    await Users.createUser(database, 'operator', 'original password')
    await Users.createUser(database, 'other', 'unchanged password')

    /** Sign in with a fresh image challenge for each password attempt. */
    async function signIn(username: string, password: string): Promise<Response> {
      const challenge = await fetch(`${origin}/auth/challenges`, { method: 'POST', headers: { origin } })
      expect(challenge.status).toBe(201)
      await challenge.arrayBuffer()
      const cookie = challenge.headers.get('set-cookie')?.split(';')[0] ?? ''
      return fetch(`${origin}/auth/sessions`, {
        method: 'POST', headers: { origin, cookie }, body: new URLSearchParams({ username, password, captcha: '0123' }),
      })
    }

    const original = await signIn('operator', 'original password')
    const other = await signIn('other', 'unchanged password')
    expect(original.status).toBe(201)
    expect(other.status).toBe(201)
    const originalCookie = original.headers.get('set-cookie')?.split(';')[0] ?? ''
    const otherCookie = other.headers.get('set-cookie')?.split(';')[0] ?? ''
    const readCreation = () => database.prepare('SELECT created_at FROM users WHERE username = ?').get('operator')
    const created = readCreation()

    await expect(Users.resetPassword(database, 'missing', 'resetpass')).rejects.toThrow('No Web login account')
    await expect(Users.resetPassword(database, 'operator', 'short')).rejects.toThrow('at least 8 characters')
    const current = `${origin}/auth/sessions/current`
    expect((await fetch(current, { headers: { cookie: originalCookie } })).status).toBe(200)

    await Users.resetPassword(database, 'operator', 'resetpass')
    expect(readCreation()).toEqual(created)
    expect((await fetch(current, { headers: { cookie: originalCookie } })).status).toBe(401)
    expect((await fetch(current, { headers: { cookie: otherCookie } })).status).toBe(200)
    expect((await signIn('operator', 'original password')).status).toBe(401)
    const replacement = await signIn('operator', 'resetpass')
    expect(replacement.status).toBe(201)
    const newCookie = replacement.headers.get('set-cookie')?.split(';')[0] ?? ''
    expect(await (await fetch(current, { headers: { cookie: newCookie } })).json()).toEqual({ username: 'operator' })
  } finally {
    database.close()
  }
})

it('consumes a CAPTCHA on the first attempt and admits only the signed session cookie', async () => {
  vi.spyOn(Captcha, 'createCaptchaCode').mockReturnValue('0123')
  const { origin, databasePath } = await start()
  const database = await Users.openUsers(databasePath)
  try {
    await Users.createUser(database, 'operator', 'test-only password')
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
  expect((await login(used, '0000')).status).toBe(401)
  expect((await login(used, '0123')).status).toBe(401)
  expect((await login(await challenge(), '00123')).status).toBe(401)
  expect((await login(await challenge(), '123')).status).toBe(401)
  expect((await login(await challenge(), '0123', 'incorrect')).status).toBe(401)
  const signedIn = await login(await challenge(), '0123')
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
