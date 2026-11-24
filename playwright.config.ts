import { defineConfig, devices } from '@playwright/test'

const isPerformanceTest = process.env.PERFORMANCE_TEST === 'true'

/**
 * Browser smoke tests (and the benchmark), against `pnpm prod-start` on :8080 by default (E2E_BASE_URL to point elsewhere, e.g. the
 * dev server). The runner is outside the browser: a page that freezes still fails the test on its timeout, with a screenshot and a
 * trace (Cypress ran inside the page and just hung until the CI step limit).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: isPerformanceTest ? 'benchmark.spec.ts' : 'smoke.spec.ts',
  timeout: isPerformanceTest ? 240_000 : 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI && !isPerformanceTest ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 720 },
  },
  // starts `pnpm prod-start` (built dist) unless something already answers on :8080, and waits for it
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
      command: 'pnpm prod-start',
      url: 'http://localhost:8080',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: { args: ['--enable-precise-memory-info', '--enable-unsafe-swiftshader'] },
      },
    },
  ],
})
