/** Standalone Web entry document, served before the authenticated client boots. */
import { loginPath, registrationPath, type SignInErrorCode } from './routes.ts'
import { minimumPasswordLength } from './users.ts'

const messages = {
  en: {
    title: 'Sign in',
    brand: 'Hengshu',
    platform: 'Agent workspace',
    brandLabel: 'Hengshu agent workspace',
    heroLabel: 'About Hengshu',
    heroStart: 'From words',
    heroEnd: 'to action',
    description: 'Let agents handle the busywork. Make time for what matters.',
    welcome: 'Welcome back',
    username: 'Username',
    usernamePlaceholder: 'Enter your username',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    captcha: 'Verification code',
    captchaPlaceholder: 'Enter the code',
    image: 'Verification image',
    imageRefresh: 'Verification image, click for a new image',
    refresh: 'New image',
    refreshed: 'Verification image updated',
    loading: 'Loading verification image…',
    pending: 'Signing in…',
    signInErrors: {
      INVALID_CREDENTIALS: 'Incorrect username or password.',
      INVALID_CAPTCHA: 'Incorrect or expired verification code. Enter the new code.',
    } satisfies Record<SignInErrorCode, string>,
    unavailable: 'Sign-in is temporarily unavailable. Try again.',
    imageError: 'The verification image could not load. Request a new image.',
    registration: {
      title: 'Create account',
      heading: 'Create your first account',
      passwordPlaceholder: `At least ${minimumPasswordLength} characters`,
      confirmation: 'Confirm password',
      showConfirmation: 'Show password confirmation',
      hideConfirmation: 'Hide password confirmation',
      pending: 'Creating account…',
      mismatch: 'The passwords do not match.',
      invalid: `Use a username without surrounding spaces and a password of ${minimumPasswordLength} characters or more (up to 1024 UTF-8 bytes).`,
      unavailable: 'Account creation is temporarily unavailable. Try again.',
    },
  },
  zh: {
    title: '登录',
    brand: '衡枢',
    platform: '智能体工作平台',
    brandLabel: '衡枢智能体工作平台',
    heroLabel: '衡枢品牌介绍',
    heroStart: '把「会说话」',
    heroEnd: '变成「会干活」',
    description: '把繁琐交给智能体，把时间留给更重要的事。',
    welcome: '欢迎回来',
    username: '用户名',
    usernamePlaceholder: '请输入用户名',
    password: '密码',
    passwordPlaceholder: '请输入密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    captcha: '验证码',
    captchaPlaceholder: '请输入验证码',
    image: '验证码图片',
    imageRefresh: '图形验证码，点击换一张',
    refresh: '换一张',
    refreshed: '验证码已更新',
    loading: '正在加载验证码…',
    pending: '正在登录…',
    signInErrors: {
      INVALID_CREDENTIALS: '用户名或密码不正确',
      INVALID_CAPTCHA: '验证码错误或已失效，请输入新验证码',
    } satisfies Record<SignInErrorCode, string>,
    unavailable: '暂时无法登录，请重试',
    imageError: '验证码图片加载失败，请换一张',
    registration: {
      title: '创建账号',
      heading: '创建首个账号',
      passwordPlaceholder: `至少 ${minimumPasswordLength} 个字符`,
      confirmation: '确认密码',
      showConfirmation: '显示确认密码',
      hideConfirmation: '隐藏确认密码',
      pending: '正在创建账号…',
      mismatch: '两次输入的密码不一致',
      invalid: `请使用首尾无空格的用户名，以及至少 ${minimumPasswordLength} 个字符、最多 1024 个 UTF-8 字节的密码`,
      unavailable: '暂时无法创建账号，请重试',
    },
  },
}

const style = `
    :root { --ink: #20372e; --green: #285443; --muted: #778077; --line: #e2e7df; --paper: #fafbf7; --lime: #dce8ab; }
    * { box-sizing: border-box; }
    /* 背景覆盖整个窗口，内容区的限宽只影响排版。 */
    body { margin: 0; color: var(--ink); background: radial-gradient(ellipse at 14% 67%, #e6edd588, transparent 62%) var(--paper); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; -webkit-font-smoothing: antialiased; }
    button, input { font: inherit; }
    button { cursor: pointer; }
    button, input { -webkit-tap-highlight-color: transparent; }
    button:focus-visible, input:focus-visible { outline: 3px solid #9cad75; outline-offset: 4px; }
    svg { display: block; }
    .icons { position: absolute; width: 0; height: 0; overflow: hidden; }
    .icon { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
    /* 内容组限宽居中，表单卡片与品牌文案保持紧凑间距。 */
    .page { position: relative; isolation: isolate; min-height: 100svh; display: grid; grid-template-rows: auto 1fr; max-width: 1440px; margin: 0 auto; padding: 48px clamp(32px, 6.5vw, 104px) 30px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-mark { width: 38px; height: 38px; object-fit: contain; flex-shrink: 0; }
    .brand-name { font-size: 26px; font-weight: 500; letter-spacing: 4px; line-height: 1; }
    .brand-descriptor { color: #7b8575; font-size: 12px; letter-spacing: 1px; margin-left: 10px; }
    .workspace { display: grid; grid-template-columns: minmax(0, 1fr) 410px; align-items: center; gap: 112px; width: 100%; max-width: 1140px; margin: 0 auto; padding: 60px 0 90px; }
    .hero h1 { margin: 0 0 28px; font-size: clamp(40px, 3.7vw, 54px); font-weight: 500; letter-spacing: -2px; line-height: 1.5; }
    .hero h1 span { display: block; color: var(--green); }
    .hero-description { margin: 0; max-width: 430px; color: #7c8775; font-size: 14px; line-height: 2; letter-spacing: .2px; text-wrap: pretty; }
    .login-content { width: 100%; padding: 36px; background: #ffffffdb; border: 1px solid #e0e6da; border-radius: 18px; box-shadow: 0 16px 48px -28px #324a352b, 0 2px 6px #324a3503; }
    h2 { font-size: 26px; font-weight: 500; letter-spacing: -.5px; margin: 0 0 30px; }
    .field { margin-bottom: 22px; }
    .label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    label { font-size: 14px; color: #455143; }
    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-wrap > .icon { position: absolute; left: 15px; width: 18px; height: 18px; color: #9aA291; pointer-events: none; }
    input { width: 100%; min-width: 0; height: 52px; padding: 0 15px 0 44px; background: #ffffffb3; color: var(--ink); font-size: 14px; border: 1px solid #dce2d5; border-radius: 9px; transition: background .2s, border-color .2s, box-shadow .2s; }
    input::placeholder { color: #a0a69a; }
    input:focus { outline: none; border-color: #6e8860; background: #fff; box-shadow: 0 0 0 3px #6e886014; }
    input[aria-invalid="true"] { border-color: #b56c52; }
    #password, #confirmation { padding-right: 47px; }
    .icon-button { display: grid; place-items: center; border: 0; background: transparent; color: #929b88; border-radius: 6px; width: 38px; height: 38px; }

    .password-toggle { position: absolute; right: 6px; }
    .password-toggle .icon { width: 20px; height: 20px; stroke-width: 1.7; }
    .captcha-row { display: grid; grid-template-columns: minmax(0, 1fr) 116px; gap: 12px; }
    .captcha-image { overflow: hidden; height: 52px; padding: 0; border: 1px solid #e0e5d6; border-radius: 9px; background: #edf1e3; }

    .refresh { border: 0; padding: 2px 0; background: transparent; color: #7c8971; display: flex; align-items: center; gap: 5px; font-size: 12px; border-radius: 3px; }

    .refresh .icon { width: 13px; height: 13px; }
    .submit { height: 50px; width: 100%; border: 1px solid var(--green); border-radius: 9px; color: #fff; background: var(--green); font-size: 15px; font-weight: 500; letter-spacing: 2px; transition: background .2s, transform .2s; }
    .submit:active:not(:disabled) { transform: translateY(1px); }
    .status { min-height: 39px; padding: 8px 0 10px; font-size: 12px; line-height: 1.7; color: #a1523c; margin: 0; }
    @media (max-width: 1080px) { .workspace { grid-template-columns: minmax(0, 1fr) 380px; gap: 48px; } .hero h1 { font-size: 43px; } .hero-description { max-width: 310px; } .login-content { padding: 30px; } }
    @media (max-width: 900px) { .page { max-width: 560px; padding: 32px 40px 24px; } .workspace { grid-template-columns: minmax(0, 1fr); gap: 36px; padding: 48px 0; } .hero h1 { font-size: 40px; margin-bottom: 18px; } .hero-description { max-width: none; } h2 { font-size: 25px; margin-bottom: 28px; } }
    @media (max-width: 480px) { .page { padding: 28px 24px 24px; } .brand-mark { width: 34px; height: 34px; } .brand-name { font-size: 24px; } .brand-descriptor { margin-left: 4px; font-size: 11px; } .workspace { padding: 42px 0 24px; gap: 30px; } .login-content { padding: 26px 22px; border-radius: 16px; } .captcha-row { grid-template-columns: minmax(0, 1fr) 96px; gap: 10px; } .hero h1 { font-size: clamp(30px, 8.5vw, 37px); letter-spacing: -1px; } .hero-description { font-size: 13px; max-width: 300px; } .field { margin-bottom: 20px; } }
    @media (max-width: 360px) { .page { padding-left: 18px; padding-right: 18px; } .login-content { padding: 24px 18px; } .captcha-row { grid-template-columns: minmax(0, 1fr) 80px; } #captcha { padding-left: 12px; } .captcha-row .input-wrap > .icon { display: none; } }
    /* 较矮的桌面窗口收缩纵向留白，表单内容保持完整可见。 */
    @media (min-width: 901px) and (max-height: 820px) {
      .page { padding-top: 24px; padding-bottom: 24px; }
      .workspace { padding-top: 16px; padding-bottom: 16px; }
      .login-content { padding-top: 28px; padding-bottom: 28px; }
      h2 { margin-bottom: 24px; }
      .field { margin-bottom: 20px; }
    }
    @media (min-width: 901px) and (max-height: 680px) {
      .page { padding-top: 20px; padding-bottom: 20px; }
      .brand-mark { width: 34px; height: 34px; }
      .workspace { padding-top: 12px; padding-bottom: 12px; }
      .login-content { padding-top: 24px; padding-bottom: 24px; }
      h2 { font-size: 24px; margin-bottom: 20px; }
      .field { margin-bottom: 16px; }
      input, .captcha-image { height: 46px; }
      .status { min-height: 33px; padding-top: 6px; padding-bottom: 6px; }
    }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
    @media (hover: hover) { .icon-button:hover:not(:disabled) { background: #eef2e7; color: var(--green); } .captcha-image:hover:not(:disabled) { border-color: #9cae88; } .refresh:hover:not(:disabled) { color: var(--green); } .submit:hover:not(:disabled) { background: #1c4232; } }
    :root { color-scheme: light; }
    .captcha-field, .confirmation-field { margin-bottom: 0; }
    .captcha-image img { display: block; width: 100%; height: 100%; object-fit: contain; }
    .captcha-image img[hidden] { display: none; }
    button:disabled { cursor: default; opacity: .62; }
    form[aria-busy="true"] button:disabled { opacity: 1; }
    .status[data-state="pending"] { color: var(--muted); }
    .status[data-state="success"] { color: #6c7e5f; }
    @media (pointer: coarse) { input { font-size: 16px; } }
`

/**
 * Render the visibility control beside its password field.
 * @param field - ID of the input controlled by the button.
 * @param label - localized action label for the initially masked input.
 * @returns the button and its eye icon.
 */
function passwordToggleButton(field: 'password' | 'confirmation', label: string): string {
  return `<button class="icon-button password-toggle" id="${field}-toggle" type="button" aria-label="${label}" title="${label}" aria-pressed="false" aria-controls="${field}">
    <svg class="icon" aria-hidden="true"><use href="#eye"/></svg>
  </button>`
}

/**
 * Render the Hengshu Web entry for sign-in or first-account registration.
 * @param language - browser Accept-Language header.
 * @param nonce - response-specific CSP nonce.
 * @param mode - sign-in with an image challenge, or registration with password confirmation.
 * @returns the document shown before DSH's authenticated app starts.
 */
export function renderAuthPage(language: string | undefined, nonce: string, mode: 'login' | 'register'): string {
  const locale = /^(zh)(?:[-,;]|$)/iu.test(language?.trim() ?? '') ? 'zh' : 'en'
  const text = messages[locale]
  const registering = mode === 'register'
  const title = registering ? text.registration.title : text.title
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="theme-color" content="#f4f6f0">
    <title>${title} · ${text.brand}</title>
    <style nonce="${nonce}">${style}</style>
  </head>
  <body>
  <svg class="icons" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <symbol id="user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></symbol>
    <symbol id="lock" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></symbol>
    <symbol id="shield" viewBox="0 0 24 24"><path d="m12 3 8 3v6c0 4-4.5 7.3-8 9-3.5-1.7-8-5-8-9V6z"/><path d="m8.5 12 2.3 2.3 4.7-4.6"/></symbol>
    <!-- Eye / EyeOff 双图标参考 Lucide，https://lucide.dev/license（ISC）。 -->
    <symbol id="eye" viewBox="0 0 24 24"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="eye-off" viewBox="0 0 24 24"><path d="M9.88 9.88a3 3 0 0 0 4.24 4.24M10.73 5.08A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a13.44 13.44 0 0 1-3.05 3.77M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a10.94 10.94 0 0 0 5.39-1.61M2 2l20 20"/></symbol>
    <symbol id="refresh-icon" viewBox="0 0 24 24"><path d="M20 9a8 8 0 1 0 .2 5M20 4v5h-5"/></symbol>
  </svg>

    <main class="page">
      <header class="brand" aria-label="${text.brandLabel}">
        <img class="brand-mark" src="/dsh-web-custom/logo.png" width="38" height="38" alt="" aria-hidden="true">
        <span class="brand-name">${text.brand}</span>
        <span class="brand-descriptor">${text.platform}</span>
      </header>
      <div class="workspace">
        <section class="hero" aria-label="${text.heroLabel}">
          <h1>${text.heroStart}<span>${text.heroEnd}</span></h1>
          <p class="hero-description">${text.description}</p>
        </section>
        <section class="login-content" aria-labelledby="auth-title">
          <h2 id="auth-title">${registering ? text.registration.heading : text.welcome}</h2>
          <form method="post" action="${registering ? registrationPath : '/auth/sessions'}" id="auth-form">
            <div class="field">
              <div class="label-row"><label for="username">${text.username}</label></div>
              <div class="input-wrap">
                <svg class="icon" aria-hidden="true"><use href="#user"/></svg>
                <input id="username" name="username" type="text" placeholder="${text.usernamePlaceholder}" autocomplete="username" maxlength="80" required>
              </div>
            </div>
            <div class="field">
              <div class="label-row"><label for="password">${text.password}</label></div>
              <div class="input-wrap">
                <svg class="icon" aria-hidden="true"><use href="#lock"/></svg>
                <input id="password" name="password" type="password" maxlength="1024" required ${registering
                  ? `placeholder="${text.registration.passwordPlaceholder}" autocomplete="new-password" minlength="${minimumPasswordLength}"`
                  : `placeholder="${text.passwordPlaceholder}" autocomplete="current-password"`}>
                ${passwordToggleButton('password', text.showPassword)}
              </div>
            </div>
            ${registering ? `<div class="field confirmation-field">
              <div class="label-row"><label for="confirmation">${text.registration.confirmation}</label></div>
              <div class="input-wrap">
                <svg class="icon" aria-hidden="true"><use href="#lock"/></svg>
                <input id="confirmation" name="confirmation" type="password" placeholder="${text.registration.passwordPlaceholder}" autocomplete="new-password" maxlength="1024" required aria-describedby="error">
                ${passwordToggleButton('confirmation', text.registration.showConfirmation)}
              </div>
            </div>` : `<div class="field captcha-field">
              <div class="label-row">
                <label for="captcha">${text.captcha}</label>
                <button class="refresh" id="refresh" type="button"><svg class="icon" aria-hidden="true"><use href="#refresh-icon"/></svg>${text.refresh}</button>
              </div>
              <div class="captcha-row">
                <div class="input-wrap">
                  <svg class="icon" aria-hidden="true"><use href="#shield"/></svg>
                  <input id="captcha" name="captcha" type="text" placeholder="${text.captchaPlaceholder}" autocomplete="off" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required aria-describedby="error">
                </div>
                <button class="captcha-image" id="captcha-image" type="button" aria-label="${text.imageRefresh}" title="${text.imageRefresh}">
                  <img id="image" alt="${text.image}" width="116" height="50" hidden>
                </button>
              </div>
            </div>`}
            <p class="status" id="error" role="status" aria-live="polite"></p>
            <button class="submit" id="submit" type="submit"${registering ? '' : ' disabled'}>${title}</button>
          </form>
        </section>
      </div>
    </main>
    <script nonce="${nonce}">
      const text = ${JSON.stringify(text)}
      const form = document.getElementById('auth-form')
      const error = document.getElementById('error')
      const submit = document.getElementById('submit')
      const password = document.getElementById('password')

      /**
       * Connect an input to its own password visibility control.
       * @param input - the masked password field.
       * @param showLabel - localized action label when masked.
       * @param hideLabel - localized action label when visible.
       */
      function bindPasswordToggle(input, showLabel, hideLabel) {
        const button = document.getElementById(input.id + '-toggle')
        const icon = button.querySelector('use')
        button.addEventListener('click', () => {
          const visible = input.type === 'password'
          input.type = visible ? 'text' : 'password'
          const label = visible ? hideLabel : showLabel
          button.setAttribute('aria-label', label)
          button.setAttribute('aria-pressed', String(visible))
          button.title = label
          icon.setAttribute('href', visible ? '#eye-off' : '#eye')
        })
      }

      bindPasswordToggle(password, text.showPassword, text.hidePassword)
      ${registering ? `const confirmation = document.getElementById('confirmation')
      bindPasswordToggle(confirmation, text.registration.showConfirmation, text.registration.hideConfirmation)

      /**
       * Submit the first account and enter the app using the session cookie returned on success.
       * @param event - browser form submission event.
       */
      async function register(event) {
        event.preventDefault()
        if (submit.disabled) return
        if (password.value !== confirmation.value) {
          error.dataset.state = 'error'
          error.textContent = text.registration.mismatch
          confirmation.focus()
          return
        }
        const body = new URLSearchParams(new FormData(form))
        submit.disabled = true
        error.dataset.state = 'pending'
        error.textContent = text.registration.pending
        try {
          const response = await fetch(form.action, { method: 'POST', body })
          if (response.status === 201) {
            window.location.replace('/')
            return
          }
          if (response.status === 409) {
            window.location.replace('${loginPath}')
            return
          }
          error.textContent = response.status === 422 ? text.registration.invalid : text.registration.unavailable
        } catch (errorRegistering) {
          error.textContent = text.registration.unavailable
        }
        error.dataset.state = 'error'
        submit.disabled = false
      }

      form.addEventListener('submit', register)` : `const image = document.getElementById('image')
      const refresh = document.getElementById('refresh')
      const captchaImage = document.getElementById('captcha-image')
      const captcha = document.getElementById('captcha')
      let imageUrl

      /**
       * Replace the image after decoding while keeping the form visually stable.
       * @param announceRefresh - show confirmation after a user-requested refresh succeeds.
       */
      async function loadChallenge(announceRefresh = false) {
        refresh.disabled = captchaImage.disabled = submit.disabled = true
        form.setAttribute('aria-busy', 'true')
        captcha.value = ''
        const previousStatus = error.textContent
        if (!imageUrl && !previousStatus) {
          error.dataset.state = 'pending'
          error.textContent = text.loading
        }
        let nextImageUrl
        try {
          const response = await fetch('/auth/challenges', { method: 'POST' })
          if (!response.ok) throw new Error('Challenge request failed')
          nextImageUrl = URL.createObjectURL(await response.blob())
          // Decode offscreen so replacing the visible source never exposes an empty image.
          const replacement = new Image()
          replacement.src = nextImageUrl
          await replacement.decode()
          image.src = nextImageUrl
          image.hidden = false
          if (imageUrl) URL.revokeObjectURL(imageUrl)
          imageUrl = nextImageUrl
          nextImageUrl = undefined
          submit.disabled = false
          error.textContent = announceRefresh ? text.refreshed : previousStatus
          if (announceRefresh) error.dataset.state = 'success'
        } catch (errorLoadingImage) {
          // Network and image-decoding failures share the same visible retry action.
          image.hidden = true
          error.dataset.state = 'error'
          error.textContent = text.imageError
        } finally {
          if (nextImageUrl) URL.revokeObjectURL(nextImageUrl)
          form.removeAttribute('aria-busy')
          refresh.disabled = captchaImage.disabled = false
        }
      }

      /** Request a fresh image without raising the mobile keyboard. No parameters. */
      function refreshChallenge() {
        void loadChallenge(true)
      }

      /**
       * Submit credentials and replace the consumed challenge after a failed attempt.
       * @param event - browser form submission event.
       */
      async function signIn(event) {
        event.preventDefault()
        if (submit.disabled) return
        const body = new URLSearchParams(new FormData(form))
        refresh.disabled = captchaImage.disabled = submit.disabled = true
        submit.textContent = text.pending
        error.dataset.state = 'pending'
        error.textContent = text.pending
        try {
          const response = await fetch(form.action, { method: 'POST', body })
          if (response.ok) {
            window.location.replace('/')
            return
          }
          const failure = response.status === 401 ? await response.json() : undefined
          const code = failure?.code
          error.textContent = typeof code === 'string' && Object.hasOwn(text.signInErrors, code)
            ? text.signInErrors[code]
            : text.unavailable
        } catch (errorSigningIn) {
          // The outcome is unavailable; only a successful response admits the app.
          error.textContent = text.unavailable
        }
        error.dataset.state = 'error'
        submit.textContent = text.title
        await loadChallenge()
        captcha.focus()
      }

      refresh.addEventListener('click', refreshChallenge)
      captchaImage.addEventListener('click', refreshChallenge)
      form.addEventListener('submit', signIn)
      void loadChallenge()`}
    </script>
  </body>
</html>`
}
