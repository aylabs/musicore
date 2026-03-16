const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1375, height: 1024 }, ignoreHTTPSErrors: true });
  await page.goto('https://localhost:5175', { waitUntil: 'networkidle' });
  const playBtn = await page.waitForSelector('[data-testid="plugin-launch-play-score"]', { timeout: 10000 });
  await playBtn.click();
  const score = await page.waitForSelector('text=Arabesque', { timeout: 10000 });
  await score.click();
  await page.waitForSelector('svg', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '../specs/050-fix-layout-preloaded-scores/reviews/02-Burgmuller_Arabesque/cycle-01-graditone-baseline.png', fullPage: true });
  console.log('done');
  await browser.close();
})();
