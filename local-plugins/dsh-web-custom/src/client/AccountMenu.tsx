/** Local Web identity and session actions in the shell's settings launcher. */
import { useEffect, useRef, useState } from 'react'
import { ICON_REGULAR_STROKE, IconSettingsOutlineRegular, IconUserOutlineMedium, Menu, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { currentSessionPath, loginPath } from '../routes.ts'
import css from './AccountMenu.module.css'

type Props = PropsRuntime<'settings.launcher'> & PropsLocale<'web-login'>
type Account = { status: 'loading' | 'failed' } | { status: 'ready'; username: string }
const graphemes = new Intl.Segmenter()

/**
 * Read the current browser's username or redirect after session expiration.
 * @param signal - launcher lifetime or the lifetime of this load attempt.
 * @returns the local username, or undefined when navigating to sign in.
 */
async function loadUsername(signal: AbortSignal): Promise<string | undefined> {
  const response = await fetch(currentSessionPath, { signal, redirect: 'error' })
  if (response.status === 401) {
    if (!signal.aborted) window.location.replace(loginPath)
    return undefined
  }
  if (!response.ok) throw new Error('Could not read the local account')
  const account: unknown = await response.json()
  if (typeof account !== 'object' || account === null || !('username' in account)
    || typeof account.username !== 'string' || account.username.length === 0) {
    throw new Error('The local account response has no username')
  }
  return account.username
}

/** @returns The built-in account menu's decorative sign-out glyph at the menu's 14 px size. */
function LogoutIcon() {
  return <svg width={14} height={14} viewBox="-.5 -.5 17 17" fill="none" aria-hidden="true" strokeWidth={ICON_REGULAR_STROKE}>
    <path vectorEffect="non-scaling-stroke" d="M5.5 1.5H3C2.17 1.5 1.5 2.17 1.5 3V13C1.5 13.83 2.17 14.5 3 14.5H5.5M5 8H14.5M10.5 4L14.5 8L10.5 12"
      stroke="currentColor" strokeLinejoin="round" />
  </svg>
}

/**
 * Show the local account initial and preserve the shell's settings action.
 * @param props - translated labels, sidebar geometry and settings navigation.
 * @returns the account button and its menu.
 */
export function AccountMenu({ wide, settingsShortcut, openSettings, t }: Props) {
  const [account, setAccount] = useState<Account>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [signOutFailed, setSignOutFailed] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const request = new AbortController()
    void loadUsername(request.signal).then(username => {
      if (username !== undefined && !request.signal.aborted) setAccount({ status: 'ready', username })
    }).catch(() => {
      if (!request.signal.aborted) setAccount({ status: 'failed' })
    })
    return () => request.abort()
  }, [attempt])

  /** End the browser session and keep the account menu available if the request fails. */
  async function signOut(): Promise<void> {
    setBusy(true)
    setSignOutFailed(false)
    try {
      const response = await fetch(currentSessionPath, { method: 'DELETE', redirect: 'error' })
      if (response.status !== 204 && response.status !== 401) throw new Error('Could not end the local session')
      window.location.replace(loginPath)
    } catch (_error) {
      setSignOutFailed(true)
      setBusy(false)
    }
  }

  const username = account.status === 'ready' ? account.username : undefined
  // A visible initial occupies one grapheme even for combining marks or emoji.
  const initial = username === undefined ? undefined : graphemes.segment(username.toUpperCase())[Symbol.iterator]().next().value?.segment
  return <div className={css.root} data-wide={wide}>
    {signOutFailed && <Toast text={t('signOutFailed')} onDone={() => setSignOutFailed(false)} />}
    <Menu open={open} side="top" align="start" anchorRef={trigger} portal autoFocus className={css.anchor} listClassName={css.menu}
      anchor={<button ref={trigger} type="button" className={css.trigger} data-wide={wide}
        aria-label={username ?? t('account')} aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(value => !value)}>
        <span className={css.avatar} aria-hidden="true" data-local-account-initial="">
          {initial ?? <IconUserOutlineMedium size={16} />}
        </span>
        {wide && <span className={css.label}>{username ?? t('account')}</span>}
      </button>}
      items={[
        { id: 'settings', label: t('settings'), icon: <IconSettingsOutlineRegular size={14} />,
          ...(settingsShortcut === undefined ? {} : { shortcut: settingsShortcut }) },
        ...(account.status === 'failed' ? [{ id: 'retry', label: t('retry') }] : []),
        ...(account.status === 'ready' ? [{ id: 'sign-out', label: t('signOut'), icon: <LogoutIcon />, disabled: busy }] : []),
      ]}
      onClose={() => setOpen(false)}
      onSelect={id => {
        setOpen(false)
        if (id === 'settings') {
          trigger.current?.focus()
          openSettings()
        } else if (id === 'retry') {
          setAccount({ status: 'loading' })
          setAttempt(value => value + 1)
        } else if (id === 'sign-out') {
          void signOut()
        }
      }} />
  </div>
}
