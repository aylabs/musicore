/**
 * Feature 001-piano-practice — Practice Button E2E Tests
 *
 * Covers the landing screen ↔ PracticeView navigation:
 *   - Practice button is visible on the landing screen
 *   - Clicking it renders the Practice Exercise heading
 *   - The Back button returns to the landing screen
 *   - No critical console errors on the full round-trip
 */

import { test, expect } from '@playwright/test';

test.describe('Feature 001: Practice View navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Practice button is visible on the landing screen', async ({ page }) => {
    await expect(page.getByRole('button', { name: /practice/i })).toBeVisible();
  });

  test('clicking Practice navigates to the Practice view', async ({ page }) => {
    await page.getByRole('button', { name: /practice/i }).click();

    // The Practice view root and its heading must be visible
    await expect(page.locator('[data-testid="practice-view"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /practice exercise/i })).toBeVisible();
  });

  test('Back button in Practice view returns to the landing screen', async ({ page }) => {
    await page.getByRole('button', { name: /practice/i }).click();
    await expect(page.locator('[data-testid="practice-view"]')).toBeVisible();

    // Press ← Back
    await page.getByRole('button', { name: /← back/i }).click();

    // Landing screen CTA must re-appear
    await expect(page.getByRole('button', { name: /play score/i })).toBeVisible();
    await expect(page.locator('[data-testid="practice-view"]')).not.toBeVisible();
  });

  test('No critical console errors when navigating to Practice view', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.getByRole('button', { name: /practice/i }).click();
    await expect(page.locator('[data-testid="practice-view"]')).toBeVisible();

    const critical = errors.filter(
      (e) =>
        !e.includes('WASM') &&
        !e.includes('WebAssembly') &&
        !e.includes('favicon') &&
        !e.includes('ResizeObserver') &&
        !e.includes('getUserMedia'), // mic permission denied in headless
    );
    expect(critical).toHaveLength(0);
  });
});
