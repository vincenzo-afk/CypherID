import { defineConfig, devices } from '@playwright/test';

/**
 * LIVE-run config — uses the machine's installed Google Chrome
 * (channel: 'chrome') so no Playwright browser download is needed
 * (C: is full; CDN is unreachable from here).
 * Only runs live-sweep.spec.js against the real docker stack.
 */
export default defineConfig({
  testDir: './e2e',
  // live-sweep hits the real stack; login/a11y use route mocks — all run on
  // the machine's Chrome (no Playwright browser download needed).
  testMatch: ['live-sweep.spec.js', 'ui-clarity.spec.js', 'login.spec.js', 'a11y.spec.js', 'asset-flow.spec.js'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  },
  projects: [
    { name: 'chrome-live', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
});
