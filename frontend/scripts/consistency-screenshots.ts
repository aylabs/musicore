/**
 * T066: Capture consistency screenshots for all 6 preloaded scores.
 * Each screenshot is taken at 1280×960 viewport, capturing the full first page.
 *
 * Usage: cd frontend && npx tsx scripts/consistency-screenshots.ts
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCORES = [
  { name: 'Burgmüller — La Candeur',       file: '01-LaCandeur.png' },
  { name: 'Burgmüller — Arabesque',         file: '02-Arabesque.png' },
  { name: 'Pachelbel — Canon in D',         file: '03-CanonD.png' },
  { name: 'Bach — Invention No. 1',         file: '04-Invention.png' },
  { name: 'Beethoven — Für Elise',          file: '05-FurElise.png' },
  { name: 'Chopin — Nocturne Op. 9 No. 2',  file: '06-Nocturne.png' },
];

const OUT_DIR = path.resolve(
  __dirname,
  '../../specs/050-fix-layout-preloaded-scores/reviews/final-consistency-check',
);

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
    ignoreHTTPSErrors: true,
  });

  for (const score of SCORES) {
    const page = await context.newPage();
    console.log(`Capturing: ${score.name} → ${score.file}`);

    await page.goto('https://localhost:5175/');
    await page.waitForLoadState('domcontentloaded');

    // Open Play Score plugin
    await page.getByTestId('plugin-launch-play-score').click();

    // Select the score
    await page.getByText(score.name).click();

    // Wait for layout to render — look for SVG element in the score viewer
    await page.waitForSelector('svg', { timeout: 15000 });

    // Extra wait for WASM layout computation + render
    await page.waitForTimeout(2000);

    const outPath = path.join(OUT_DIR, score.file);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  Saved: ${outPath}`);

    await page.close();
  }

  await browser.close();
  console.log('Done — all 6 screenshots captured.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
