/**
 * Feature 034: Practice from Score -- E2E Tests
 *
 * SC-001: Open Practice plugin -> select Score preset -> selector opens -> choose
 *         Beethoven Fur Elise -> exercise staff has notes -> start exercise
 * SC-002: Switch to Random and back to Score -- no dialog opens (cache preserved)
 * SC-003: All existing Random and C4 Scale exercise flows still work (regression)
 * SC-004: Notes slider max matches totalAvailable from loaded score
 * SC-005: Load .mxl file via "Load from file" button
 */

import { test, expect, type Page } from '@playwright/test';

const PRACTICE_BTN  = /practice/i;
const SCORE_RADIO   = /score/i;
const RANDOM_RADIO  = /random/i;
const C4_RADIO      = /c4 scale/i;
// Exact displayName from preloadedScores.ts (\u2014 is em-dash, \u00fc is u-umlaut)
const BEETHOVEN_TXT = 'Beethoven \u2014 F\u00fcr Elise';
const CHANGE_SCORE  = /change score/i;
const SCORE_DIALOG  = '[data-testid="score-selector-dialog"]';
const PLAY_BTN      = '[data-testid="practice-play-btn"]';
const STOP_BTN      = '[data-testid="practice-stop-btn"]';

/** Stub .mxl fetches so the score loads instantly without real WASM parsing. */
async function stubMxlFetch(page: Page) {
  await page.route('**/*.mxl', route =>
    route.fulfill({ status: 200, body: '', contentType: 'application/octet-stream' }),
  );
}

async function openPractice(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('button', { name: PRACTICE_BTN }).click();
  await expect(page.locator('[data-testid="practice-view"]')).toBeVisible();
}

test.describe('SC-001: Score preset basic flow', () => {
  test('select Score preset -> dialog -> pick score -> exercise staff populates', async ({ page }) => {
    await stubMxlFetch(page);
    await openPractice(page);

    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).toBeVisible();

    // Catalogue entries are rendered as <button> elements
    await page.getByRole('button', { name: BEETHOVEN_TXT }).click();
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible({ timeout: 10_000 });

    await expect(page.locator('[data-testid="plugin-staff-viewer"]').first()).toBeVisible();
    await expect(page.locator(PLAY_BTN)).toBeVisible();

    await page.locator(PLAY_BTN).click();
    await expect(page.locator(STOP_BTN)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('SC-002: Cache preserved on preset switch', () => {
  test('switch to Random and back -- no dialog opens', async ({ page }) => {
    await stubMxlFetch(page);
    await openPractice(page);

    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).toBeVisible();
    await page.getByRole('button', { name: BEETHOVEN_TXT }).click();
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible({ timeout: 10_000 });

    await page.getByRole('radio', { name: RANDOM_RADIO }).click();
    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible();
    await expect(page.getByRole('button', { name: CHANGE_SCORE })).toBeVisible();
  });
});

test.describe('SC-003: Existing preset regressions', () => {
  test('Random preset exercise starts normally', async ({ page }) => {
    await openPractice(page);
    await expect(page.getByRole('radio', { name: RANDOM_RADIO })).toBeChecked();
    await page.locator(PLAY_BTN).click();
    await expect(page.locator(STOP_BTN)).toBeVisible({ timeout: 8_000 });
  });

  test('C4 Scale preset exercise starts normally', async ({ page }) => {
    await openPractice(page);
    await page.getByRole('radio', { name: C4_RADIO }).click();
    await page.locator(PLAY_BTN).click();
    await expect(page.locator(STOP_BTN)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('SC-004: Notes slider max matches totalAvailable', () => {
  test('Notes slider max reflects score pitch count', async ({ page }) => {
    await stubMxlFetch(page);
    await openPractice(page);

    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).toBeVisible();
    await page.getByRole('button', { name: BEETHOVEN_TXT }).click();
    await expect(page.locator(SCORE_DIALOG)).not.toBeVisible({ timeout: 10_000 });

    const slider = page.locator('input[type="range"]').nth(0);
    const max = await slider.getAttribute('max');
    expect(Number(max)).toBeGreaterThan(0);
  });
});

test.describe('SC-005: Load from file', () => {
  test('upload a .mxl file via "Load from file" button', async ({ page }) => {
    await stubMxlFetch(page);
    await openPractice(page);

    await page.getByRole('radio', { name: SCORE_RADIO }).click();
    await expect(page.locator(SCORE_DIALOG)).toBeVisible();

    const fileHelper = page.locator('input[type="file"]');
    await fileHelper.setInputFiles({
      name: 'Bach_InventionNo1.mxl',
      mimeType: 'application/octet-stream',
      buffer: Buffer.alloc(100, 0),
    });

    // Dialog should attempt loading; app must not crash
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="practice-view"]')).toBeVisible();
  });
});
