/** Custom Web branding, local account launcher, and preview-notice suppression. */
import type { Context } from '@deepseek-ai/cordis'
import type { SyncedConfig } from '@deepseek-ai/dsh-client-config/types'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type { PasswordLoginConfig } from '../index.ts'
import { AccountMenu } from './AccountMenu.tsx'
import { BrandMark, BrandName } from './Brand.tsx'
import { CustomizationInfo } from './CustomizationInfo.tsx'
import { SkipWelcomeNotice } from './SkipWelcomeNotice.tsx'
import { dictionaries } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'web-login': keyof typeof dictionaries.en }
}

/** The Web shell owns the launcher slot and locale state. */
export const inject = ['slots', 'locale']

/**
 * Override branding, the account launcher, and the preview-notice step while active.
 * Describe deployment-managed customizations in Plugins when the Host marks them as built in.
 * @param ctx - browser plugin context owning the locale and slot contributions.
 * @param config - Host-synced deployment ownership of the customization.
 */
export function apply(ctx: Context, config: SyncedConfig<PasswordLoginConfig>): void {
  ctx.effect(() => ctx.locale.register('web-login', dictionaries), 'web login: menu dictionaries')
  const t = ctx.locale.bind('web-login')
  ctx.effect(() => {
    let dispose: (() => void) | undefined
    const sync = (): void => {
      if (config.deploymentManaged.get() === true) {
        dispose ??= ctx.slots.inject('plugins.item', () => ctx.slots.register({
          name: 'plugins.item', id: 'hengshu-customization', order: 50,
          label: () => t('customizationTitle'), locale: 'web-login',
        }, CustomizationInfo))
      } else {
        dispose?.()
        dispose = undefined
      }
    }
    const unsubscribe = config.deploymentManaged.subscribe(sync)
    sync()
    return () => {
      unsubscribe()
      dispose?.()
    }
  }, 'web login: built-in customization details')
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
