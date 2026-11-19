/** Brand artwork and name for the custom Web sidebar. */
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import logoUrl from './assets/hengshu.png'

/**
 * Render the decorative logo in the expanded sidebar and collapsed rail.
 * @param props - The square size requested by the sidebar.
 * @returns The Hengshu logo image.
 */
export function BrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <img src={logoUrl} width={size} height={size} alt="" />
}

/**
 * Render the brand name beside the expanded sidebar logo.
 * @param props - The translator supplied by the sidebar slot registry.
 * @returns The Hengshu wordmark as text.
 */
export function BrandName({ t }: PropsLocale<'web-login'>) {
  return <span>{t('brand')}</span>
}
