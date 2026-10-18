import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.CATALOG_PREVIEW_BASE_URL || 'http://127.0.0.1:3007';
const output = `${process.cwd()}/public/template-previews`;
const keys = [
  'cafe_real_matcha_a', 'cafe_mocha_forest_a', 'cafe_sunday_roasters_a',
  'cafe_van_gogh_a', 'cafe_round_focus_a', 'fast_food_loop_bagel_a',
  'restaurant_onue_a', 'dining_aube_table_a', 'dining_aube_table_b', 'display_menu_a',
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
const results = [];
try {
  for (const key of keys) {
    const page = await context.newPage();
    const response = await page.goto(`${base}/templates/${key}/preview?device=pc&view=actual&embedded=1`, { waitUntil: 'load' });
    if (response.status() !== 200) throw new Error(`${key}: HTTP ${response.status()}`);
    await page.evaluate(() => document.fonts.ready);
    if (!key.startsWith('dining_') && key !== 'display_menu_a') {
      await page.waitForFunction(() => document.querySelector('.cafe-a-desktop-fit-board')?.dataset.fitPresentationState === 'ready', null, { timeout: 60000 });
    }
    await page.waitForTimeout(1200);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const state = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      loading: [...document.querySelectorAll('[role="status"]')].some(element => {
        let visible = Boolean(element.getClientRects().length);
        for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
          const style = getComputedStyle(ancestor);
          if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) < .01) visible = false;
        }
        return visible && element.textContent.includes('최적의 배치');
      }),
      broken: [...document.images].filter(image => image.complete && !image.naturalWidth).length,
    }));
    if (state.loading || state.broken) throw new Error(`${key}: ${JSON.stringify(state)}`);
    await page.screenshot({ path: `${output}/${key}.jpg`, type: 'jpeg', quality: 86 });
    results.push({ key, ...state });
    console.log('CAPTURED', key);
    await page.close();
  }
  console.log(JSON.stringify({ captures: results }, null, 2));
} finally { await browser.close(); }
