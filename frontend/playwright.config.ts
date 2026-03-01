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

  // Start dev server before tests.
  // CI=1 disables the self-signed HTTPS cert in vite.config.ts so Playwright
  // can reach the server over plain HTTP (baseURL above uses http://).
  webServer: {
    command: 'CI=1 npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
