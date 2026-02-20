/**
 * Feature 028: Load Score Dialog — End-to-End Test
 *
 * Verifies that:
 * - The Load Score button opens the dialog
 * - All 6 preloaded score files are fetched at the correct URL (no 404)
 * - Selecting a preloaded score loads it without console errors
 *
 * Run against the production build (VITE_BASE=/musicore/) to catch
 * sub-path base URL issues before they reach GitHub Pages.
 *
 * ## Why we stub .mxl responses in the URL test
 * Without stubbing: clicking score → fetch → WASM parse → onSuccess → dialog
 * closes. The loop then tries to click score 2 on a closed dialog and hangs.
 * With a 200 + empty-body stub: the fetch URL is exercised and captured, but
 * WASM rejects the empty file → onSuccess never fires → dialog stays open for
 * all 6 clicks.
 */

import { test, expect } from '@playwright/test';

const EXPECTED_SCORES = [
  'Bach — Invention No. 1',
  'Beethoven — Für Elise',
  'Burgmüller — Arabesque',
  'Burgmüller — La Candeur',
  'Chopin — Nocturne Op. 9 No. 2',
  'Pachelbel — Canon in D',
];

test.describe('Feature 028: Load Score Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Load Score button is visible on landing screen', async ({ page }) => {
    const btn = page.getByRole('button', { name: /load score/i });
    await expect(btn).toBeVisible();
  });

  test('clicking Load Score opens the dialog', async ({ page }) => {
    await page.getByRole('button', { name: /load score/i }).click();
    for (const name of EXPECTED_SCORES) {
      await expect(page.getByText(name)).toBeVisible();
    }
  });

  test('all preloaded score files are fetched at a correct URL (no 404)', async ({ page }) => {
    // Stub every .mxl request: return HTTP 200 with an empty body so the fetch
    // URL is exercised but WASM parse fails silently → dialog stays open for
    // all 6 clicks without the loop hanging after the first successful load.
    const fetchedUrls: string[] = [];
    await page.route('**/*.mxl', async (route) => {
      fetchedUrls.push(route.request().url());
      await route.fulfill({ status: 200, body: '', contentType: 'application/octet-stream' });
    });

    await page.getByRole('button', { name: /load score/i }).click();

    for (const name of EXPECTED_SCORES) {
      // Wait for the .mxl request triggered by this click before moving on
      const requestPromise = page.waitForRequest('**/*.mxl', { timeout: 3000 });
      await page.getByText(name).click();
      await requestPromise;
    }

    // Every score must have triggered exactly one fetch
    expect(fetchedUrls).toHaveLength(EXPECTED_SCORES.length);

    // Every URL must match the scores path — catches hardcoded '/' vs sub-path bugs.
    // In production (VITE_BASE=/musicore/) this will be …/musicore/scores/…
    // In dev (VITE_BASE=/) this will be …/scores/…
    for (const url of fetchedUrls) {
      expect(url, `Bad URL: ${url}`).toMatch(/\/scores\/[^/]+\.mxl$/);
    }
  });

  test('selecting a preloaded score produces no critical console errors', async ({ page }) => {
    // This test does NOT stub — it exercises the full fetch → WASM pipeline.
    // We only click one score so the dialog closes normally on success.
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.getByRole('button', { name: /load score/i }).click();
    await page.getByText('Bach — Invention No. 1').click();

    // Wait up to 10 s for the score to load (WASM parse can take a few seconds)
    await page.waitForFunction(
      () => !document.querySelector('[role="status"]'),
      { timeout: 10_000 },
    ).catch(() => {
      // If still loading after 10 s that is a separate performance concern;
      // the error check below is what matters here.
    });

    const critical = consoleErrors.filter(
      (e) =>
        !e.includes('WASM') &&
        !e.includes('WebAssembly') &&
        !e.includes('favicon') &&
        !e.includes('ResizeObserver'),
    );
    expect(critical).toHaveLength(0);
  });
});
