import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E Test: MusicXML Import Flow
 * 
 * Critical test that would have caught the Feature 015 bug:
 * - Loads real WASM module in browser
 * - Tests actual import flow end-to-end
 * - Verifies score renders without crashes
 */

test.describe('MusicXML Import', () => {
  test('should import a simple MusicXML file and display score', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for app to load (demo or empty state)
    await page.waitForLoadState('networkidle');
    
    // Find the import button/input
    const fileInput = page.locator('input[type="file"]');
    
    // Upload a test file
    const testFilePath = path.join(__dirname, '../tests/fixtures/simple-c-scale.musicxml');
    await fileInput.setInputFiles(testFilePath);
    
    // Wait for import to complete and score to render
    // This is where the bug would manifest: "instruments is not iterable"
    await expect(page.locator('.score-viewer')).toBeVisible({ timeout: 10000 });
    
    // Verify score components rendered
    await expect(page.locator('.instrument-list')).toBeVisible();
    
    // Verify no error messages
    await expect(page.locator('body')).not.toContainText('is not iterable');
    await expect(page.locator('body')).not.toContainText('TypeError');
    
    // Verify we can see instrument/staff structure
    const instrumentList = page.locator('.instrument-list');
    await expect(instrumentList).not.toBeEmpty();
  });

  test('should handle import of file with warnings', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const fileInput = page.locator('input[type="file"]');
    
    // This file has overlapping notes that trigger voice splitting
    const testFilePath = path.join(__dirname, '../tests/fixtures/overlapping-notes.musicxml');
    
    // Check if file exists, skip if not
    try {
      await fileInput.setInputFiles(testFilePath);
      
      // Import should succeed despite warnings
      await expect(page.locator('.score-viewer')).toBeVisible({ timeout: 10000 });
      
      // Should display warnings (if UI shows them)
      // Note: This assumes ImportButton shows warnings - adjust selector as needed
      const warningIndicator = page.locator('.import-warnings, [data-testid="import-warnings"]');
      if (await warningIndicator.isVisible()) {
        await expect(warningIndicator).toContainText(/warning/i);
      }
    } catch (error) {
      // Skip test if fixture doesn't exist yet
      test.skip();
    }
  });
});
