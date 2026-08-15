const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const shot = async (page, name) => {
  const p = path.join(DIR, `${name}.png`);
  await page.screenshot({ path: p });
  console.log(`📸 ${name}.png saved`);
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('🚀 Starting Comprehensive Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Initial Load in Dark Mode
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3500);
  await shot(page, '01_dark_initial_3d');

  // 2. Switch to Light Mode
  const themeToggle = page.locator('button[title*="mode"]').first();
  await themeToggle.click();
  await sleep(1500);
  await shot(page, '02_light_initial_3d');

  // 3. Run docker build in Light Mode -> Camera swoops to Image Blueprint
  const input = page.locator('input[type="text"]');
  await input.click();
  await input.fill('docker build -t my-app .');
  await input.press('Enter');
  await sleep(2500); // Allow camera to smoothly glide to image
  await shot(page, '03_light_after_docker_build');

  // 4. Run docker run in Light Mode -> Camera swoops down to Shipping Container
  await input.fill('docker run -d -p 3000:3000 my-app');
  await input.press('Enter');
  await sleep(2500); // Allow camera to glide to container
  await shot(page, '04_light_after_docker_run_shipping_container');

  // 5. Check Upload Modal in Light Mode
  const uploadBtn = page.locator('button', { hasText: 'Upload' });
  await uploadBtn.click();
  await sleep(600);
  await shot(page, '05_light_upload_modal');

  // Close upload modal by clicking the X button in the modal header
  const modalX = page.locator('div.fixed button:has(svg)').first();
  await modalX.click({ force: true }).catch(() => {});
  await sleep(1000);

  // 6. Switch back to Dark Mode
  await page.locator('button[title*="mode"]').first().click({ force: true });
  await sleep(1500);
  await shot(page, '06_dark_after_docker_run_shipping_container');

  // 7. Advance to Level 3 (Multi-container)
  // Complete Level 1 -> click Next Level
  const nextBtn = page.locator('button', { hasText: 'Next Level' });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await sleep(1000);
    // In Level 2, run commands to advance
    await input.fill('docker build -t my-app .');
    await input.press('Enter');
    await sleep(600);
    await input.fill('docker run -d -p 3000:3000 my-app');
    await input.press('Enter');
    await sleep(1500);
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await sleep(1000);
    }
  }

  // In Level 3: Run docker-compose up -> Multi-container camera view
  await input.fill('docker-compose up');
  await input.press('Enter');
  await sleep(3000); // Camera pulls back to isometric overview of shipyard
  await shot(page, '07_dark_multi_container_dockyard');

  // Switch to Light Mode for Multi-Container
  await themeToggle.click();
  await sleep(1500);
  await shot(page, '08_light_multi_container_dockyard');

  await browser.close();
  console.log('🎉 All tests completed successfully!');
})().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
