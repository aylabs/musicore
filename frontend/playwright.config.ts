import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Feature: Testing infrastructure for critical user flows
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Playwright runs Vite on port 5174 (plain HTTP via PLAYWRIGHT_TEST=1)
    // so it never conflicts with the regular dev server on 5173 (HTTPS).
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Test against desktop browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Uses a dedicated port (5174) so this server never conflicts with the
  // normal 'npm run dev' server on 5173.
  // PLAYWRIGHT_TEST=1 tells vite.config.ts to skip basicSsl → plain HTTP
  // so Playwright's webServer health-check can reach it without TLS issues.
  webServer: {
    command: 'PLAYWRIGHT_TEST=1 npm run dev -- --port 5174',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
