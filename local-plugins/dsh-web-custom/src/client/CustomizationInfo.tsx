/** Read-only information for the built-in customization card and details. */
import type { PluginConfigViewProps } from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'

/**
 * Describe the features and who manages them.
 * @param props - The Plugins page view and its localized text.
 * @returns The card summary or the details paragraph.
 */
export function CustomizationInfo({ t, view }: PluginConfigViewProps & PropsLocale<'web-login'>) {
  return view === 'summary' ? t('customizationSummary') : <p>{t('customizationDetails')}</p>
}
