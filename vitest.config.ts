import { defineConfig } from 'vitest/config'

// Vitest picks this up instead of vite.config.ts — the Cloudflare plugin
// there can't run inside the test runner.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
