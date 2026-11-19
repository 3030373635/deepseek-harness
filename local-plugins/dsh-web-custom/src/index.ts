/** Web routes and request authentication for a local DSH operator login. */
import { createHash, randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionTrustRequest } from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'
import z from '@deepseek-ai/schemastery'
import { createCaptchaCode, renderCaptcha } from './captcha.ts'
import { renderLoginPage } from './page.ts'
import { currentSessionPath, loginPath } from './routes.ts'
import { initializeSessionKey, issueSession, readSession } from './session.ts'
import { openUsers, verifyUser } from './users.ts'

/** Standalone Cordis authentication plugin name. */
export const name = 'web-password-login'

/** Host services that provide route mounting, request admission and credentials. */
export const inject = ['webServer', 'connection', 'connection.authentication', 'credentials']

/** Deployment settings for the password provider. */
export interface PasswordLoginConfig {
  /** Absolute path to the private SQLite account database. */
  databasePath: string
  /** Require HTTPS for browser authentication. False permits loopback HTTP. */
  secureCookies: boolean
  /** JWT validity in seconds. */
  sessionSeconds: number
  /** Verification image validity in seconds. */
  captchaSeconds: number
  /** Maximum outstanding verification challenges per Host. */
  captchaCapacity: number
  /** Maximum concurrent password checks per Host. */
  concurrentPasswordChecks: number
}

/** Validate the password provider's deployment settings. */
export const Config: z<PasswordLoginConfig> = z.object({
  databasePath: z.string().required(),
  secureCookies: z.boolean().default(true),
  sessionSeconds: z.natural().min(1).max(7 * 86400).default(8 * 3600),
  captchaSeconds: z.natural().min(1).max(900).default(180),
  captchaCapacity: z.natural().min(1).default(256),
  concurrentPasswordChecks: z.natural().min(1).default(4),
})

const sessionPath = '/auth/sessions'
const captchaPath = '/auth/challenges'
const maxFormBytes = 8192
const faviconPath = '/dsh-web-custom/logo.png'

/**
 * Replace document favicon declarations with this deployment's PNG logo.
 * @param html - The DSH index or local login document.
 * @returns The document with one custom favicon in its head.
 */
function withFavicon(html: string): string {
  return html
    .replace(/<link\b(?=[^>]*\brel=["'](?:shortcut )?icon["'])[^>]*>/giu, '')
    .replace(/<\/head\s*>/iu, `<link rel="icon" type="image/png" href="${faviconPath}"></head>`)
}

/**
 * Read one header from either of the supported Host carriers.
 * @param request - current request.
 * @param name - lowercase header name.
 * @returns the header value if it is singular.
 */
function header(request: ConnectionTrustRequest, name: string): string | undefined {
  const { headers } = request
  if (headers instanceof Headers) return headers.get(name) ?? undefined
  const value = headers[name]
  return typeof value === 'string' ? value : undefined
}

/**
 * Read the request authority used as the audience for both cookies.
 * @param request - current request after the Host trust check.
 * @param secure - whether this deployment serves the browser over HTTPS.
 * @returns the public origin, or undefined when it cannot use this provider.
 */
function audience(request: ConnectionTrustRequest, secure: boolean): string | undefined {
  const host = header(request, 'host')
  if (host === undefined) return undefined
  const url = URL.parse(`${secure ? 'https' : 'http'}://${host}`)
  if (url === null) return undefined
  if (!secure && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return undefined
  return url.origin
}

/**
 * Derive an authority-specific cookie name to isolate instances on different ports.
 * @param origin - public request origin.
 * @param type - cookie purpose.
 * @returns the browser cookie name.
 */
function cookieName(origin: string, type: 'session' | 'captcha'): string {
  return `dsh-web-${type}-${createHash('sha256').update(origin).digest('base64url').slice(0, 16)}`
}

/**
 * Extract one browser credential.
 * @param request - request carrying the Cookie header.
 * @param name - exact cookie name.
 * @returns the cookie value when present.
 */
function readCookie(request: ConnectionTrustRequest, name: string): string | undefined {
  const cookies = header(request, 'cookie')?.split(';')
  return cookies?.map(cookie => cookie.trim()).find(cookie => cookie.startsWith(name + '='))?.slice(name.length + 1)
}

/**
 * Build a host-only cookie for a generated credential.
 * @param name - exact cookie name.
 * @param value - generated JWT or challenge identifier.
 * @param lifetime - validity in seconds.
 * @param secure - set the HTTPS-only attribute.
 * @param path - requests that need this cookie.
 * @returns the Set-Cookie header value.
 */
function writeCookie(name: string, value: string, lifetime: number, secure: boolean, path: string): string {
  return `${name}=${value}; Path=${path}; Max-Age=${lifetime}; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`
}

/**
 * Read a bounded URL-encoded browser form.
 * @param request - login POST request.
 * @returns fields when the request fits the supported media type and size.
 */
async function readForm(request: IncomingMessage): Promise<URLSearchParams | undefined> {
  if (request.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') return undefined
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    if (!Buffer.isBuffer(chunk)) return undefined
    size += chunk.byteLength
    if (size > maxFormBytes) return undefined
    chunks.push(chunk)
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Finish a private login response without caching its content or credentials.
 * @param response - active HTTP response.
 * @param status - status code.
 * @param headers - response-specific headers.
 * @param body - optional page or image bytes.
 */
function reply(response: ServerResponse, status: number, headers: Record<string, string> = {}, body?: string | Buffer): void {
  response.writeHead(status, { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers })
  response.end(body)
}

/**
 * Mount password login for Web without activating the launch-token provider.
 * @param ctx - plugin scope owning the Web routes, operator Peer and database.
 * @param config - validated password settings.
 */
export async function apply(ctx: Context, config: PasswordLoginConfig): Promise<void> {
  // The published source asset is shared with the client logo without duplicating its bytes.
  const favicon = await readFile(new URL('../src/client/assets/hengshu.png', import.meta.url))
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact', path: faviconPath, auth: 'anonymous',
    resource: async () => new Response(new Uint8Array(favicon), {
      headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
    }),
  }), 'web custom: favicon resource')
  ctx.effect(() => ctx.webServer.tapIndex(withFavicon), 'web custom: document favicon')
  const secret = await initializeSessionKey(ctx.credentials)
  const users = await openUsers(config.databasePath)
  let active = true
  ctx.effect(() => () => {
    active = false
    users.close()
  }, 'host-web-password: user database')
  /** @returns whether the provider may still sign a session after an asynchronous operation. */
  const canSignIn = (): boolean => active
  const userById = users.prepare('SELECT username FROM users WHERE id = ?')
  /**
   * Read the local account for this request's verified session.
   * @param request - request admitted by the connection trust policy.
   * @param origin - public origin bound to the signed cookie.
   * @returns the current username, or undefined for an invalid or removed account.
   */
  const sessionUsername = (request: ConnectionTrustRequest, origin: string): string | undefined => {
    if (!active) return undefined
    const token = readCookie(request, cookieName(origin, 'session'))
    const userId = token === undefined ? undefined : readSession(secret, token, origin)
    const username = userId === undefined ? undefined : userById.get(userId)?.username
    return typeof username === 'string' ? username : undefined
  }
  // The Peer grants instance access. The verified cookie identifies the local account.
  const peer = ctx.connection.createPeer({ principal: { kind: 'owner' } })
  ctx.connection.authentication.register({
    authenticate(request) {
      const origin = audience(request, config.secureCookies)
      return origin !== undefined && sessionUsername(request, origin) !== undefined ? peer : undefined
    },
  })

  const challenges = new Map<string, { code: string; expiry: number }>()
  let checksInProgress = 0
  ctx.inject(['webServer'], (web) => {
    web.on('webserver/entry-url', (base, entries) => entries.push({ label: 'dsh web', url: base, open: true }))
    web.on('webserver/request', async (request, response, next) => {
      if ((request.method === 'GET' || request.method === 'HEAD')
        && (request.url?.split('?')[0] === '/' || request.url?.split('?')[0] === '/index.html')) {
        const admission = web.connection.admit(request)
        if ('rejection' in admission && admission.rejection === 401) {
          reply(response, 303, { location: loginPath })
          return
        }
      }
      await next()
    })
    web.effect(() => web.webServer.register({
      kind: 'exact', path: loginPath, auth: 'anonymous',
      handler(request, response) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          reply(response, 405, { allow: 'GET, HEAD' })
          return
        }
        if ('peer' in web.connection.admit(request)) {
          reply(response, 303, { location: '/' })
          return
        }
        const nonce = randomBytes(18).toString('base64')
        const page = withFavicon(renderLoginPage(request.headers['accept-language'], nonce))
        reply(response, 200, {
          'content-type': 'text/html; charset=utf-8',
          'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src 'self' blob:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
          'referrer-policy': 'same-origin',
        }, request.method === 'HEAD' ? undefined : page)
      },
    }), 'host-web-password: login page')
    web.effect(() => web.webServer.register({
      kind: 'exact', path: captchaPath, auth: 'anonymous',
      async handler(request, response) {
        const origin = admitPost(request, response, config.secureCookies)
        if (origin === undefined) return
        const cookie = cookieName(origin, 'captcha')
        const previous = readCookie(request, cookie)
        if (previous !== undefined) challenges.delete(previous)
        const now = Date.now()
        for (const [id, challenge] of challenges) {
          if (challenge.expiry <= now) challenges.delete(id)
        }
        if (challenges.size >= config.captchaCapacity) {
          reply(response, 429)
          return
        }
        const id = randomBytes(24).toString('base64url')
        const code = createCaptchaCode()
        // Reserve capacity before rasterization to bound concurrent image creation.
        challenges.set(id, { code, expiry: now + config.captchaSeconds * 1000 })
        let image: Buffer
        try {
          image = await renderCaptcha(code)
        } catch (error) {
          challenges.delete(id)
          throw error
        }
        if (!canSignIn()) { reply(response, 503); return }
        reply(response, 201, {
          'content-type': 'image/png',
          'set-cookie': writeCookie(cookie, id, config.captchaSeconds, config.secureCookies, '/auth'),
        }, image)
      },
    }), 'host-web-password: image challenges')
    web.effect(() => web.webServer.register({
      kind: 'exact', path: sessionPath, auth: 'anonymous',
      async handler(request, response) {
        const origin = admitPost(request, response, config.secureCookies)
        if (origin === undefined) return
        const cookie = cookieName(origin, 'captcha')
        const id = readCookie(request, cookie)
        const challenge = id === undefined ? undefined : challenges.get(id)
        // Consume before the first await so a parallel submission cannot use the same answer.
        if (id !== undefined) challenges.delete(id)
        const fields = await readForm(request)
        const username = fields?.get('username')
        const password = fields?.get('password')
        if (request.destroyed && !request.complete) return
        if (!canSignIn()) { reply(response, 503); return }
        if (challenge === undefined || challenge.expiry <= Date.now() || fields?.get('captcha') !== challenge.code
          || !username || username.length > 80 || !password || Buffer.byteLength(password) > 1024) {
          reply(response, 401)
          return
        }
        if (checksInProgress >= config.concurrentPasswordChecks) {
          reply(response, 429)
          return
        }
        checksInProgress += 1
        try {
          const id = await verifyUser(users, username, password)
          if (!canSignIn()) { reply(response, 503); return }
          if (id === undefined) {
            reply(response, 401)
            return
          }
          const token = issueSession(secret, id, origin, config.sessionSeconds)
          reply(response, 201, {
            'set-cookie': writeCookie(cookieName(origin, 'session'), token, config.sessionSeconds, config.secureCookies, '/'),
          })
        } finally {
          checksInProgress -= 1
        }
      },
    }), 'host-web-password: sessions')
    web.effect(() => web.webServer.register({
      kind: 'exact', path: currentSessionPath,
      /**
       * Read the current browser's identity or end its local session.
       * @param request - authenticated Web request.
       * @param response - private profile response or cookie deletion.
       */
      handler(request, response) {
        if (request.method !== 'GET' && request.method !== 'DELETE') {
          reply(response, 405, { allow: 'GET, DELETE' })
          return
        }
        const origin = audience(request, config.secureCookies)
        const username = origin === undefined ? undefined : sessionUsername(request, origin)
        if (origin === undefined || username === undefined) {
          reply(response, 401)
          return
        }
        if (request.method === 'DELETE') {
          if (request.headers.origin !== origin) {
            reply(response, 403)
            return
          }
          reply(response, 204, { 'set-cookie': writeCookie(cookieName(origin, 'session'), '', 0, config.secureCookies, '/') })
          return
        }
        reply(response, 200, { 'content-type': 'application/json; charset=utf-8' }, JSON.stringify({ username }))
      },
    }), 'host-web-password: current session')
  })
}

/**
 * Accept only same-origin browser POSTs after the anonymous route's Host admission.
 * @param request - login or challenge creation request.
 * @param response - response used to refuse requests.
 * @param secure - whether HTTPS cookies are required.
 * @returns the public origin when the request can proceed.
 */
function admitPost(request: IncomingMessage, response: ServerResponse, secure: boolean): string | undefined {
  if (request.method !== 'POST') {
    reply(response, 405, { allow: 'POST' })
    return undefined
  }
  const origin = audience(request, secure)
  if (origin === undefined || request.headers.origin !== origin) {
    reply(response, 403)
    return undefined
  }
  return origin
}
