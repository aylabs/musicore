/**
 * Regression test: Verify courtesy flat (E♭4) renders in Chopin Nocturne M21 LH.
 *
 * Root cause (T116): convertScoreToLayoutFormat() in LayoutView.tsx was not
 * forwarding has_explicit_accidental to the WASM layout engine. The backend
 * integration tests (m21_accidental_test.rs) prove the layout JSON is correct;
 * this test guards the frontend forwarding path.
 *
 * The score uses viewport-based virtualization, so we must scroll to M21
 * to confirm the glyph renders in the DOM.
 */
import { test, expect } from '@playwright/test';

test.describe('M21 courtesy flat rendering (T116 regression)', () => {
  test('Chopin M21 LH Eb4 courtesy flat renders after full scroll', async ({ page }) => {
    // 1. Navigate to Play view and select Chopin
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const launchBtn = page.getByTestId('plugin-launch-play-score');
    await expect(launchBtn).toBeVisible({ timeout: 10000 });
    await launchBtn.click();

    const chopinEntry = page.getByText('Chopin \u2014 Nocturne Op. 9 No. 2');
    await expect(chopinEntry).toBeVisible({ timeout: 10000 });
    await chopinEntry.click();

    // 2. Wait for score to render.
    await page.waitForSelector('svg .glyph-run text', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // 3. Scroll through the full score collecting unique flat accidentals.
    //    The scroll container is the layoutViewWrapper div (overflow:auto),
    //    an ancestor of .score-scroll-container.
    const result = await page.evaluate(async () => {
      const scoreContainer = document.querySelector('.score-scroll-container');
      if (!scoreContainer) return { error: 'no container', flats: [], allAccidentals: [], totalHeight: 0, viewHeight: 0 };
      
      // Walk up to find scrollable ancestor
      let scrollEl: Element | null = scoreContainer.parentElement;
      while (scrollEl) {
        const style = window.getComputedStyle(scrollEl);
        if ((style.overflow === 'auto' || style.overflowY === 'auto' ||
             style.overflow === 'scroll' || style.overflowY === 'scroll') &&
            scrollEl.scrollHeight > scrollEl.clientHeight) {
          break;
        }
        scrollEl = scrollEl.parentElement;
      }
      if (!scrollEl) return { error: 'no scrollable ancestor', flats: [], allAccidentals: [], totalHeight: 0, viewHeight: 0 };

      const totalHeight = scrollEl.scrollHeight;
      const viewHeight = scrollEl.clientHeight;
      const flats: Array<{ x: number; y: number; scrollY: number }> = [];
      const allAccidentals: Array<{ type: string; x: number; y: number; scrollY: number }> = [];
      const seen = new Set<string>();

      // Scroll in increments collecting accidentals at each position
      const step = Math.max(viewHeight * 0.5, 100);
      for (let scrollY = 0; scrollY <= totalHeight; scrollY += step) {
        scrollEl.scrollTop = scrollY;
        // Wait for viewport update + render
        await new Promise(r => setTimeout(r, 400));

        const texts = document.querySelectorAll('svg .glyph-run text');
        texts.forEach((el) => {
          const cp = (el.textContent || '').codePointAt(0) ?? 0;
          const x = parseFloat(el.getAttribute('x') || '0');
          const y = parseFloat(el.getAttribute('y') || '0');
          
          let type = '';
          if (cp === 0xE260) type = 'flat';
          else if (cp === 0xE261) type = 'natural';
          else if (cp === 0xE262) type = 'sharp';
          
          if (type) {
            const key = `${type}:${x.toFixed(1)},${y.toFixed(1)}`;
            if (!seen.has(key)) {
              seen.add(key);
              allAccidentals.push({ type, x, y, scrollY });
              if (type === 'flat') {
                flats.push({ x, y, scrollY });
              }
            }
          }
        });
      }

      return { totalHeight, viewHeight, flats, allAccidentals };
    });

    // Eb major has 3 flats per key sig × ~18 systems ≈ 54 minimum.
    // The courtesy flat on Eb4 in M21 LH adds at least 1 more.
    // Before the T116 fix this was 0 because has_explicit_accidental was stripped.
    const flats = result.allAccidentals.filter(a => a.type === 'flat');
    expect(flats.length).toBeGreaterThan(20);

    // Verify a flat exists in the late-measure area of the M19-21 system.
    // The courtesy flat on Eb4 M21 LH sits at x > 2000 in the bass staff.
    const courtesyFlatPresent = result.flats.some(f => f.x > 2000 && f.y > 4000);
    expect(courtesyFlatPresent).toBe(true);
  });
});
