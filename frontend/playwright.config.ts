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
    // PLAYWRIGHT_TEST=1 makes vite.config.ts skip basicSsl so the dev server
    // starts on plain HTTP – no TLS cert issues for Playwright's webServer
    // health-check or for page.goto().
    baseURL: 'http://localhost:5173',
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

  // PLAYWRIGHT_TEST=1 disables basicSsl in vite.config.ts so the server
  // starts on plain HTTP.  reuseExistingServer lets you keep a Playwright-
  // started server alive across multiple test runs locally.
  webServer: {
    command: 'PLAYWRIGHT_TEST=1 npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
