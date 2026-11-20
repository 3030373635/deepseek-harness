// @vitest-environment jsdom
/** The custom welcome step advances onboarding without displaying a notice. */
import { createElement, StrictMode, useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { SkipWelcomeNotice } from '../src/client/SkipWelcomeNotice.tsx'

afterEach(cleanup)

/**
 * Show the next onboarding step after the custom welcome step completes.
 * @returns the active step and the number of completion requests.
 */
function Onboarding() {
  const [completions, setCompletions] = useState(0)
  return completions === 0
    ? createElement(SkipWelcomeNotice, {
        stepId: 'welcome-notice',
        complete: () => { setCompletions(count => count + 1) },
        openSection: () => {},
      })
    : createElement('h2', null, `Next step: ${completions}`)
}

it('advances to the next step once under StrictMode without displaying a welcome dialog', () => {
  const page = render(createElement(StrictMode, null, createElement(Onboarding)))
  expect(screen.getByRole('heading').textContent).toBe('Next step: 1')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(page.container.textContent).toMatchInlineSnapshot('"Next step: 1"')
})

it('skips the notice again after the onboarding flow remounts', () => {
  const first = render(createElement(Onboarding))
  expect(screen.getByRole('heading').textContent).toBe('Next step: 1')
  first.unmount()
  render(createElement(Onboarding))
  expect(screen.getByRole('heading').textContent).toBe('Next step: 1')
})
