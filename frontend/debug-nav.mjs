import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
await page.goto('https://localhost:5175', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Get all buttons info
const buttons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button, [role="button"], a')).map(el => ({
    tag: el.tagName,
    text: el.textContent?.trim().slice(0, 60),
    ariaLabel: el.getAttribute('aria-label'),
    class: el.className?.slice(0, 60),
  }));
});
console.log('All interactive elements:');
buttons.forEach(b => console.log(JSON.stringify(b)));

// Take debug screenshot
await page.screenshot({ path: '/tmp/debug-app.png' });
console.log('\nDebug screenshot saved to /tmp/debug-app.png');

await browser.close();
