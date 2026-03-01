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

  // No webServer block here: start the dev server manually in a separate
  // terminal with `npm run dev` before running `npm run test:e2e` or
  // `npm run test:e2e:ui`.
  //
  // Reason: Playwright's webServer health-check does NOT honour
  // ignoreHTTPSErrors, so it rejects the self-signed TLS cert that the
  // local Vite server uses (required for getUserMedia on LAN), causing
  // Playwright UI to hang indefinitely at "Loading…".
  //
  // CI is unaffected – it uses playwright.config.prod.ts which runs
  // `vite preview` (plain HTTP) against a pre-built dist/.
});
