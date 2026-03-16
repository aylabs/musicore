// Capture cycle-02 screenshots of all 3 scores (after 3/8 beaming fix)
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '../specs/050-fix-layout-preloaded-scores/reviews');
const URL = 'https://localhost:5175';

const SCORES = [
  { displayName: 'Bach — Invention No. 1',         dir: '04-Bach_InventionNo1' },
  { displayName: 'Beethoven — Für Elise',           dir: '05-Beethoven_FurElise' },
  { displayName: 'Chopin — Nocturne Op. 9 No. 2',  dir: '06-Chopin_NocturneOp9No2' },
];

const browser = await chromium.launch();

for (const score of SCORES) {
  console.log(`\n--- ${score.displayName} ---`);
  const outPath = path.join(BASE, score.dir, 'cycle-02-graditone-updated.png');

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 6000 },
  });
  const page = await context.newPage();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Navigate to Play Score plugin
  const playLanding = page.locator('.landing-plugin-btn').filter({ hasText: /play/i }).first();
  if (await playLanding.count() > 0) {
    await playLanding.click();
  } else {
    const fallback = page.locator('.plugin-nav-entry').filter({ hasText: /play/i }).first();
    if (await fallback.count() > 0) await fallback.click();
  }
  await page.waitForTimeout(1500);

  // Click the score
  const scoreBtn = page.getByRole('button', { name: score.displayName, exact: true });
  if (await scoreBtn.count() > 0) {
    await scoreBtn.click();
  } else {
    const fallback = page.locator('.play-score__score-item').filter({ hasText: score.displayName }).first();
    if (await fallback.count() > 0) await fallback.click();
  }

  await page.waitForFunction(() => document.querySelectorAll('svg line').length > 20, { timeout: 15000 })
    .catch(() => console.log('  WARNING: SVG lines timeout'));
  await page.waitForTimeout(3000);

  const svgLines = await page.evaluate(() => document.querySelectorAll('svg line').length);
  console.log(`  SVG lines: ${svgLines}`);

  await page.screenshot({
    path: outPath,
    fullPage: true,
    clip: { x: 0, y: 0, width: 1280, height: 6000 },
  });
  console.log(`  Saved: ${outPath}`);

  await context.close();
}

await browser.close();
console.log('\nDone.');
