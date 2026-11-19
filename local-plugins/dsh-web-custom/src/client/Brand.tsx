/** Brand artwork for the custom Web sidebar and new-conversation header. */
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import logoUrl from './assets/hengshu.png'
import './brand.css'

/**
 * Render the decorative logo at the size requested by its host.
 * @param props - The square size and optional presentation class supplied by the host.
 * @returns The Hengshu logo image.
 */
export function BrandMark({ size, className }: HeroBrandMarkOwnerProps) {
  return <img src={logoUrl} className={className} width={size} height={size} alt="" data-hengshu-logo="" />
}

/**
 * Render the brand name beside the expanded sidebar logo.
 * @param props - The translator supplied by the sidebar slot registry.
 * @returns The Hengshu wordmark as text.
 */
export function BrandName({ t }: PropsLocale<'web-login'>) {
  return <span>{t('brand')}</span>
}
