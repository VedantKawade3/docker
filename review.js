const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const shot = async (page, name) => {
  const p = path.join(DIR, `${name}.png`);
  await page.screenshot({ path: p });
  console.log(`📸 ${name}.png`);
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3500); // wait for Three.js WebGL scene to render
  await shot(page, 'A_initial_3d');

  // Run docker build to spawn an image in 3D
  const input = page.locator('input[type="text"]');
  await input.click();
  await input.fill('docker build -t my-app .');
  await input.press('Enter');
  await sleep(1200);
  await shot(page, 'B_after_build_3d');

  // Run docker run to spawn a container
  await input.fill('docker run -d -p 3000:3000 my-app');
  await input.press('Enter');
  await sleep(1200);
  await shot(page, 'C_after_run_3d');

  // Check Upload button
  const uploadBtn = page.locator('button', { hasText: 'Upload' });
  if (await uploadBtn.isVisible()) {
    await uploadBtn.click();
    await sleep(400);
    await shot(page, 'D_upload_modal');
  }

  // Close modal
  const closeBtn = page.locator('button:has(svg)').last();
  await closeBtn.click().catch(() => {});
  await sleep(200);

  // Test theme toggle
  const themeBtn = page.locator('button[title]').first();
  await themeBtn.click();
  await sleep(600);
  await shot(page, 'E_light_mode');
  await themeBtn.click();
  await sleep(400);
  await shot(page, 'F_dark_mode_back');

  await browser.close();
  console.log('✅ Done! Screenshots in:', DIR);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
