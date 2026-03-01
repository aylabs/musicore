import { defineConfig, devices } from '@playwright/test';

/**
 * Production-simulation Playwright config.
 *
 * Runs E2E tests against a `vite preview` server built with
 * VITE_BASE=/musicore/ — the same sub-path used on GitHub Pages.
 *
 * Usage (from the frontend/ directory):
 *   VITE_BASE=/musicore/ npm run build
 *   npx playwright test --config playwright.config.prod.ts
 *
 * Why this exists:
 *   The default playwright.config.ts runs against the Vite dev server
 *   (base = '/'), which masks sub-path issues. This config forces the
 *   production base path so bugs like hardcoded '/scores/...' paths
 *   surface as 404s before the code is deployed to GitHub Pages.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  // WASM parse + 3.5 s countdown means tests like SC-001 routinely exceed
  // Playwright's default 30 s test timeout in CI.  90 s is generous without
  // being open-ended -- individual assertions still carry their own timeouts.
  timeout: 90_000,

  use: {
    // Must match the sub-path the build was produced with
    baseURL: 'http://localhost:4173/musicore/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Expects the dist/ to already be built with VITE_BASE=/musicore/
  // The CI workflow does the build step before invoking playwright.
  webServer: {
    command: 'VITE_BASE=/musicore/ npx vite preview --port 4173',
    url: 'http://localhost:4173/musicore/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
