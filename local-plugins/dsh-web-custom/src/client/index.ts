/** Custom Web branding, local account launcher, and preview-notice suppression. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { AccountMenu } from './AccountMenu.tsx'
import { BrandMark, BrandName } from './Brand.tsx'
import { SkipWelcomeNotice } from './SkipWelcomeNotice.tsx'
import { dictionaries } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'web-login': keyof typeof dictionaries.en }
}

/** The Web shell owns the launcher slot and locale state. */
export const inject = ['slots', 'locale']

/**
 * Override branding, the account launcher, and the preview-notice step while active.
 * @param ctx - browser plugin context owning the locale and slot contributions.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('web-login', dictionaries), 'web login: menu dictionaries')
  // A lower priority shadows only the official welcome-notice contribution.
  ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
    name: 'settings.onboarding', id: 'welcome-notice', order: -100, priority: -1,
  }, SkipWelcomeNotice))
  ctx.slots.inject('settings.launcher', () => ctx.slots.register({
    name: 'settings.launcher', locale: 'web-login', priority: -1,
  }, AccountMenu))
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      // Single slots select the lowest priority. The official brand uses 0.
      yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -1 }, BrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name', locale: 'web-login', priority: -1 }, BrandName)
    }))
  ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register({
    name: 'conversation.hero.brand.mark', priority: -1,
  }, BrandMark))
}
