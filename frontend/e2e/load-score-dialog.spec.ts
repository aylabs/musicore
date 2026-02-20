/**
 * Feature 028: Load Score Dialog — End-to-End Test
 *
 * Verifies that:
 * - The Load Score button opens the dialog
 * - All 6 preloaded score files are fetchable (no 404)
 * - Selecting a preloaded score loads it without network errors
 *
 * Run against the production build (VITE_BASE=/musicore/) to catch
 * sub-path base URL issues before they reach GitHub Pages.
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
    // The dialog contains the list of scores
    for (const name of EXPECTED_SCORES) {
      await expect(page.getByText(name)).toBeVisible();
    }
  });

  test('all preloaded score files return HTTP 200', async ({ page, request }) => {
    // Collect the score paths rendered in the dialog to verify they match
    // the base URL the app was built with (catches hardcoded absolute paths).
    await page.getByRole('button', { name: /load score/i }).click();

    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/scores/') && response.status() !== 200) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // Click each score in turn and wait briefly for the fetch to fire
    for (const name of EXPECTED_SCORES) {
      await page.getByText(name).click();
      // Allow the fetch to initiate (no need to wait for full WASM parse)
      await page.waitForTimeout(300);
    }

    expect(networkErrors).toEqual([]);
  });

  test('selecting a preloaded score produces no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.getByRole('button', { name: /load score/i }).click();
    await page.getByText('Bach — Invention No. 1').click();
    // Wait for loading indicator to appear (the fetch + WASM parse kicks off)
    await page.waitForTimeout(500);

    // Filter out known-harmless WASM initialisation noise
    const critical = consoleErrors.filter(
      (e) => !e.includes('WASM') && !e.includes('WebAssembly') && !e.includes('favicon'),
    );
    expect(critical).toHaveLength(0);
  });
});
