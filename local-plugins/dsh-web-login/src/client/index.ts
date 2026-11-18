/** Replace the sidebar launcher when the local Web login plugin is enabled. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { AccountMenu } from './AccountMenu.tsx'
import { dictionaries } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'web-login': keyof typeof dictionaries.en }
}

/** The Web shell owns the launcher slot and locale state. */
export const inject = ['slots', 'locale']

/**
 * Register a local account launcher above the default account menu.
 * @param ctx - browser plugin context owning the locale and slot contributions.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('web-login', dictionaries), 'web login: menu dictionaries')
  ctx.slots.inject('settings.launcher', () => ctx.slots.register({
    name: 'settings.launcher', locale: 'web-login', priority: -1,
  }, AccountMenu))
}
