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
    // The local dev server uses a self-signed HTTPS cert (required for
    // getUserMedia on LAN / Android).  ignoreHTTPSErrors lets Playwright
    // navigate the site without certificate errors.
    baseURL: 'https://localhost:5173',
    ignoreHTTPSErrors: true,
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

  // Start dev server before tests if it isn't already running.
  // reuseExistingServer: true lets you keep `npm run dev` open in another
  // terminal and re-run tests without waiting for Vite to restart.
  webServer: {
    command: 'npm run dev',
    url: 'https://localhost:5173',
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 120000,
  },
});
