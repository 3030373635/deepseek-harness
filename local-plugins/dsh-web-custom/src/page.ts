/** Standalone Web entry document, served before the authenticated client boots. */

const messages = {
  en: {
    title: 'Sign in',
    username: 'Username',
    password: 'Password',
    captcha: 'Verification code',
    image: 'Verification image',
    refresh: 'New image',
    pending: 'Signing in…',
    invalid: 'Check your username, password, and verification code.',
    unavailable: 'Sign-in is temporarily unavailable. Try again.',
    imageError: 'The verification image could not load. Request a new image.',
  },
  zh: {
    title: '登录',
    username: '用户名',
    password: '密码',
    captcha: '验证码',
    image: '验证码图片',
    refresh: '换一张',
    pending: '正在登录…',
    invalid: '请检查用户名、密码和验证码。',
    unavailable: '暂时无法登录，请重试。',
    imageError: '验证码图片加载失败，请换一张。',
  },
}

const style = `
  :root {
    color-scheme: light dark;
    font: 16px/1.45 system-ui, -apple-system, sans-serif;
    --background: #f7f9fc;
    --surface: #fff;
    --text: #171c26;
    --muted: #586475;
    --stroke: #dbe1ea;
    --accent: #245dda;
    --accent-hover: #204fc0;
    --danger: #a51f2b;
    --shadow: 0 8px 40px rgb(20 47 95 / 7%);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --background: #151517;
      --surface: #212123;
      --text: #f3f4f6;
      --muted: #b4becd;
      --stroke: #434652;
      --accent: #285ecb;
      --accent-hover: #3673dc;
      --danger: #ff9da6;
      --shadow: 0 8px 40px rgb(0 0 0 / 22%);
    }
  }
  * { box-sizing: border-box; }
  body {
    display: grid;
    place-items: center;
    min-height: 100vh;
    min-height: 100svh;
    margin: 0;
    padding: 24px 16px;
    color: var(--text);
    background: var(--background);
  }
  main {
    width: min(100%, 400px);
    padding: clamp(20px, 5vw, 34px);
    border: 1px solid var(--stroke);
    border-radius: 20px;
    box-shadow: var(--shadow);
    background: var(--surface);
  }
  .brand { display: flex; align-items: center; gap: 9px; color: var(--muted); font-size: .875rem; font-weight: 600; }
  .brand img { display: block; }
  h1 { margin: 14px 0 24px; font-size: 1.625rem; letter-spacing: -.02em; }
  form { display: grid; gap: 15px; }
  label { display: block; margin-bottom: 6px; font-size: .875rem; font-weight: 600; }
  input, button { min-height: 44px; border-radius: 9px; font: inherit; }
  input {
    width: 100%;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid var(--stroke);
    background: var(--surface);
    color: inherit;
  }
  :focus-visible { outline: 2px solid #5686fe; outline-offset: 2px; }
  button { cursor: pointer; }
  button:disabled { cursor: default; opacity: .62; }
  .challenge { display: grid; grid-template-columns: 1fr 112px; gap: 8px; }
  .challenge-view {
    display: grid;
    place-items: center;
    border: 1px solid var(--stroke);
    background: var(--background);
    overflow: hidden;
    padding: 0;
  }
  .challenge-view img { display: block; width: 110px; height: 40px; object-fit: contain; }
  .challenge-view img[hidden] { display: none; }
  .refresh {
    display: block;
    min-height: 34px;
    margin: 1px 0 0 auto;
    padding: 3px 1px;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: .8125rem;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .submit { border: 0; background: var(--accent); color: white; font-weight: 650; }
  .submit:hover:not(:disabled) { background: var(--accent-hover); }
  .error { margin: 0; color: var(--danger); font-size: .875rem; }
  .error:empty { display: none; }
`

/**
 * Render login and its progressive form interactions in the browser language.
 * @param language - browser Accept-Language header.
 * @param nonce - response-specific CSP nonce.
 * @returns the document shown before DSH's authenticated app starts.
 */
export function renderLoginPage(language: string | undefined, nonce: string): string {
  const locale = /^(zh)(?:[-,;]|$)/iu.test(language?.trim() ?? '') ? 'zh' : 'en'
  const text = messages[locale]
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${text.title} · DeepSeek Harness</title>
    <link rel="icon" href="/favicon.svg">
    <style nonce="${nonce}">${style}</style>
  </head>
  <body>
    <main>
      <div class="brand"><picture><source media="(prefers-color-scheme: dark)" srcset="/favicon-dark.svg"><img src="/favicon.svg" width="24" height="24" alt=""></picture>DeepSeek Harness</div>
      <h1>${text.title}</h1>
      <form method="post" action="/auth/sessions" id="login">
        <div>
          <label for="username">${text.username}</label>
          <input id="username" name="username" autocomplete="username" maxlength="80" required>
        </div>
        <div>
          <label for="password">${text.password}</label>
          <input id="password" name="password" type="password" autocomplete="current-password" maxlength="1024" required>
        </div>
        <div>
          <label for="captcha">${text.captcha}</label>
          <div class="challenge">
            <input id="captcha" name="captcha" autocomplete="off" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" required>
            <div class="challenge-view"><img id="image" alt="${text.image}" width="110" height="40" hidden></div>
          </div>
          <button class="refresh" id="refresh" type="button">${text.refresh}</button>
        </div>
        <p class="error" id="error" role="alert"></p>
        <button class="submit" id="submit" type="submit" disabled>${text.title}</button>
      </form>
    </main>
    <script nonce="${nonce}">
      const text = ${JSON.stringify(text)}
      const form = document.getElementById('login')
      const error = document.getElementById('error')
      const image = document.getElementById('image')
      const refresh = document.getElementById('refresh')
      const submit = document.getElementById('submit')
      const captcha = document.getElementById('captcha')
      let imageUrl

      // Each fetch replaces the browser's previous one-use challenge.
      async function loadChallenge() {
        refresh.disabled = submit.disabled = true
        image.hidden = true
        captcha.value = ''
        try {
          const response = await fetch('/auth/challenges', { method: 'POST' })
          if (!response.ok) throw new Error()
          if (imageUrl) URL.revokeObjectURL(imageUrl)
          imageUrl = URL.createObjectURL(await response.blob())
          image.src = imageUrl
          image.hidden = false
          submit.disabled = false
        } catch {
          error.textContent = text.imageError
        } finally {
          refresh.disabled = false
        }
      }

      function refreshChallenge() {
        error.textContent = ''
        void loadChallenge()
      }

      refresh.addEventListener('click', refreshChallenge)
      form.addEventListener('submit', async event => {
        event.preventDefault()
        if (submit.disabled) return
        const body = new URLSearchParams(new FormData(form))
        refresh.disabled = submit.disabled = true
        submit.textContent = text.pending
        error.textContent = ''
        try {
          const response = await fetch(form.action, { method: 'POST', body })
          if (response.ok) {
            window.location.replace('/')
            return
          }
          error.textContent = response.status === 401 ? text.invalid : text.unavailable
        } catch {
          error.textContent = text.unavailable
        }
        submit.textContent = text.title
        await loadChallenge()
        captcha.focus()
      })
      void loadChallenge()
    </script>
  </body>
</html>`
}
