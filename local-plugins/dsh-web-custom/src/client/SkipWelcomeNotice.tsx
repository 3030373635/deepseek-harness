/** Skip the Web preview notice while preserving subsequent onboarding steps. */
import { useEffect, useRef } from 'react'
import type { SettingsOnboardingOwnerProps } from '@deepseek-ai/dsh-client-ui-settings/client'

/**
 * Complete the welcome step without displaying or acknowledging the notice.
 * @param props - Onboarding callbacks supplied by the settings coordinator.
 * @returns No visible content.
 */
export function SkipWelcomeNotice({ complete }: SettingsOnboardingOwnerProps): null {
  const completed = useRef(false)
  useEffect(() => {
    // React StrictMode can replay the effect before the coordinator unmounts this step.
    if (completed.current) return
    completed.current = true
    complete()
  }, [complete])
  return null
}
