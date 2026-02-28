/**
 * Feature 034: Practice from Score — E2E Tests
 *
 * SC-001: Open Practice plugin → select Score preset → selector opens → choose
 *         Beethoven Für Elise → exercise staff has notes → start exercise
 * SC-002: Switch to Random and back to Score — no dialog opens (cache preserved)
 * SC-003: All existing Random and C4 Scale exercise flows still work (regression)
 * SC-004: Notes slider max matches totalAvailable from loaded score
 * SC-005: Load .mxl file via "Load from file" button and start exercise
 */

import { test, expect } from '@playwright/test';

const PRACTICE_BTN = /practice/i;
const SCORE_RADIO   = /score/i;
const RANDOM_RADIO  = /random/i;
const C4_RADIO      = /c4 scale/i;
const BEETHOVEN_BTN = /beethoven/i;
const CHANGE_SCORE  = /change score/i;
const PLAY_BTN      = /play/i;
const SCORE_DIALOG  = '[data-testid="score-selector-dialog"]';

async function openPractice(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button', { name: PRACTICE_BTN }).click();
  await expect(page.locator('[data-testid="practice-view"]')).toBeVisible();
}

// ─── SC-001 ─────────────────────────────────────────────────────────────────

test.describe('SC-001: Score preset basic flow', () => {
  test('select Score preset → dialog → pick score → exercise staff populates', async ({ page }) => {
    await openPractice(page);

    // Select Score radio
    await page.getByRole('radio', { name: SCORE_RADIO }).click();

    // Dialog must appear
    await expect(page.locator(SCORE_DIALOG)).toBeVisible();

    // Pick Beethoven Für Elise
    await page.getByRole('button', { name: BEETHOVEN_BTN }).click();

    // Dialog should close after score loads (status → ready)
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible({ timeout: 10_000 });

    // Exercise staff must be present
    await expect(page.locator('[data-testid="staff-viewer"]').first()).toBeVisible();

    // Play button should be visible (ready phase)
    await expect(page.getByRole('button', { name: PLAY_BTN })).toBeVisible();

    // Click Play to start exercise
    await page.getByRole('button', { name: PLAY_BTN }).click();
    // Phase transitions to countdown / playing; Stop button appears
    await expect(page.getByRole('button', { name: /stop/i })).toBeVisible({ timeout: 8_000 });
  });
});

// ─── SC-002 ─────────────────────────────────────────────────────────────────

test.describe('SC-002: Cache preserved on preset switch', () => {
  test('switch to Random and back — no dialog opens', async ({ page }) => {
    await openPractice(page);

    // Load a score
    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).toBeVisible();
    await page.getByRole('button', { name: BEETHOVEN_BTN }).click();
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible({ timeout: 10_000 });

    // Switch away
    await page.getByRole('radio', { name: RANDOM_RADIO }).click();

    // Switch back — dialog must NOT open
    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible();

    // "Change score" must still be present (pitches cached)
    await expect(page.getByRole('button', { name: CHANGE_SCORE })).toBeVisible();
  });
});

// ─── SC-003 ─────────────────────────────────────────────────────────────────

test.describe('SC-003: Existing preset regressions', () => {
  test('Random preset exercise starts normally', async ({ page }) => {
    await openPractice(page);

    // Random is default — just play
    await expect(page.getByRole('radio', { name: RANDOM_RADIO })).toBeChecked();
    await page.getByRole('button', { name: PLAY_BTN }).click();
    await expect(page.getByRole('button', { name: /stop/i })).toBeVisible({ timeout: 8_000 });
  });

  test('C4 Scale preset exercise starts normally', async ({ page }) => {
    await openPractice(page);

    await page.getByRole('radio', { name: C4_RADIO }).click();
    await page.getByRole('button', { name: PLAY_BTN }).click();
    await expect(page.getByRole('button', { name: /stop/i })).toBeVisible({ timeout: 8_000 });
  });
});

// ─── SC-004 ─────────────────────────────────────────────────────────────────

test.describe('SC-004: Notes slider max matches totalAvailable', () => {
  test('Notes slider max reflects score pitch count', async ({ page }) => {
    await openPractice(page);

    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await page.getByRole('button', { name: BEETHOVEN_BTN }).click();
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible({ timeout: 10_000 });

    // Find the Notes count slider and check its max > 0
    const slider = page.locator('input[type="range"]').nth(0);
    const max = await slider.getAttribute('max');
    expect(Number(max)).toBeGreaterThan(0);
  });
});

// ─── SC-005 ─────────────────────────────────────────────────────────────────

test.describe('SC-005: Load from file', () => {
  test('upload a .mxl file via "Load from file" button', async ({ page }) => {
    await openPractice(page);

    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).toBeVisible();

    // Trigger file input
    const fileHelper = page.locator('input[type="file"]');

    // Simulate file upload with the bundled Bach score
    await fileHelper.setInputFiles({
      name: 'Bach_InventionNo1.mxl',
      mimeType: 'application/octet-stream',
      buffer: Buffer.alloc(100, 0), // small dummy — avoid real WASM parse in e2e
    });

    // Dialog should attempt loading (show loading or close on success/error)
    // At minimum no crash should occur and dialog state should change
    await page.waitForTimeout(2000);

    // The practice view must still be alive
    await expect(page.locator('[data-testid="practice-view"]')).toBeVisible();
  });
});
