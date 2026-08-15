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

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(2500);

  // 1. Click Level Selector in Header to show all 10 levels
  const levelDropdownBtn = page.locator('header button').filter({ hasText: /L1|Level 1/ }).first();
  await levelDropdownBtn.click();
  await sleep(600);
  await shot(page, '09_level_selector_dropdown_10_levels');

  // 2. Select Level 5: Persistent Volumes & Databases
  const level5Btn = page.locator('button:has-text("Persistent Volumes")').first();
  if (await level5Btn.isVisible()) {
    await level5Btn.click();
    await sleep(1500);
    await shot(page, '10_level_5_persistent_volumes');
  }

  await browser.close();
  console.log('✅ Level selector screenshots captured!');
})().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
