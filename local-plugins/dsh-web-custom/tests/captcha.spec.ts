/** Four-digit challenge generation, including leading zeroes. */
import { randomInt } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { createCaptchaCode } from '../src/captcha.ts'

vi.mock('node:crypto', () => ({ randomInt: vi.fn() }))

afterEach(() => vi.resetAllMocks())

it.each([
  [0, '0000'],
  [123, '0123'],
  [8264, '8264'],
  [9999, '9999'],
])('formats random value %i as the four-digit answer %s', (value, expected) => {
  vi.mocked(randomInt).mockImplementation(() => value)
  expect(createCaptchaCode()).toBe(expected)
})

it('keeps the largest possible random answer within four digits', () => {
  vi.mocked(randomInt).mockImplementation(max => max - 1)
  expect(createCaptchaCode()).toBe('9999')
})
