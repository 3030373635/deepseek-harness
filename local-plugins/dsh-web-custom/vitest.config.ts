/** Keep the fork's Web login tests in the extension's own Vitest project. */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.spec.ts'] },
})
