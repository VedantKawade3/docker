const { chromium } = require('playwright');
const path = require('path');

const DIR = path.join(__dirname, 'screenshots');
const shot = async (page, name) => {
  const p = path.join(DIR, `${name}.png`);
  await page.screenshot({ path: p });
  console.log(`📸 ${name}.png saved`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Open app (Dark mode default)
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);

  // Run docker build in dark mode
  const input = page.locator('input[type="text"]');
  await input.click();
  await input.fill('docker build -t my-app .');
  await input.press('Enter');
  await sleep(2000);

  // Run docker run in dark mode
  await input.fill('docker run -d -p 3000:3000 my-app');
  await input.press('Enter');
  await sleep(2500);
  await shot(page, '06_dark_realistic_shipping_container');

  // Complete level 1 and go to level 2
  const nextBtn = page.locator('button', { hasText: 'Next Level' });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await sleep(1000);
    // Complete level 2
    await input.fill('docker build -t my-app .');
    await input.press('Enter');
    await sleep(500);
    await input.fill('docker run -d -p 3000:3000 my-app');
    await input.press('Enter');
    await sleep(1500);
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await sleep(1000);
    }
  }

  // In Level 3: multi-container dockyard
  await input.fill('docker-compose up');
  await input.press('Enter');
  await sleep(3500); // Allow camera to pull back to elevated shipyard vantage
  await shot(page, '07_dark_multi_container_dockyard');

  await browser.close();
  console.log('✅ Dark mode & multi-container screenshots captured!');
})().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
