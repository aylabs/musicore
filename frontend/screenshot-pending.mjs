// Capture full-page screenshots of all 3 pending scores
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '../specs/050-fix-layout-preloaded-scores/reviews');
const URL = 'https://localhost:5175';

// Exact displayName from preloadedScores.ts
const SCORES = [
  { displayName: 'Bach — Invention No. 1',         dir: '04-Bach_InventionNo1' },
  { displayName: 'Beethoven — Für Elise',           dir: '05-Beethoven_FurElise' },
  { displayName: 'Chopin — Nocturne Op. 9 No. 2',  dir: '06-Chopin_NocturneOp9No2' },
];

const browser = await chromium.launch();

for (const score of SCORES) {
  console.log(`\n--- ${score.displayName} ---`);
  const outPath = path.join(BASE, score.dir, 'cycle-01-graditone-baseline.png');

  // Use a very tall viewport so the full score renders without nested scrolling
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 6000 },
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Navigate to Play Score plugin — click the landing "Play" button
  const playLanding = page.locator('.landing-plugin-btn').filter({ hasText: /play/i }).first();
  if (await playLanding.count() > 0) {
    await playLanding.click();
    console.log('  Clicked Play landing button');
  } else {
    // Fallback: aria-label or plugin-nav-entry
    const playNav = page.getByRole('button', { name: /open play score plugin/i });
    if (await playNav.count() > 0) {
      await playNav.click();
      console.log('  Clicked Play nav (aria-label)');
    } else {
      const fallback = page.locator('.plugin-nav-entry').filter({ hasText: /play/i }).first();
      if (await fallback.count() > 0) {
        await fallback.click();
        console.log('  Clicked Play nav (fallback)');
      } else {
        console.log('  WARNING: Play button not found!');
      }
    }
  }
  await page.waitForTimeout(1500);

  // Click the exact score button in the selection screen
  const scoreBtn = page.getByRole('button', { name: score.displayName, exact: true });
  if (await scoreBtn.count() > 0) {
    await scoreBtn.click();
    console.log(`  Clicked score: "${score.displayName}"`);
  } else {
    // Fallback: look by partial text
    const fallback = page.locator('.play-score__score-item').filter({ hasText: score.displayName }).first();
    if (await fallback.count() > 0) {
      await fallback.click();
      console.log(`  Clicked score (fallback): "${score.displayName}"`);
    } else {
      console.log(`  WARNING: Score button not found for "${score.displayName}"`);
    }
  }

  // Wait for score to load (SVG lines appear)
  await page.waitForFunction(() => {
    return document.querySelectorAll('svg line').length > 20;
  }, { timeout: 15000 }).catch(() => console.log('  WARNING: SVG lines timeout'));

  // Wait extra for full rendering
  await page.waitForTimeout(3000);

  const svgLines = await page.evaluate(() => document.querySelectorAll('svg line').length);
  console.log(`  SVG lines: ${svgLines}`);

  // Get actual score content height from SVG bounding box
  const svgRect = await page.evaluate(() => {
    // Find the main score SVG (the one with many children)
    let bestSvg = null;
    let maxLines = 0;
    document.querySelectorAll('svg').forEach(s => {
      const lines = s.querySelectorAll('line').length;
      if (lines > maxLines) { maxLines = lines; bestSvg = s; }
    });
    if (!bestSvg) return null;
    const rect = bestSvg.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  });
  const scoreBottom = svgRect ? Math.ceil(svgRect.bottom) + 40 : 6000;
  console.log(`  Score SVG rect: ${JSON.stringify(svgRect)}, capture height: ${scoreBottom}`);

  await page.screenshot({ path: outPath, fullPage: true, clip: { x: 0, y: 0, width: 1280, height: Math.min(scoreBottom, 6000) } });
  console.log(`  Saved: ${outPath}`);

  await context.close();
}

await browser.close();
console.log('\nAll screenshots captured.');
