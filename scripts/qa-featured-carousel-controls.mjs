import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

// Representative-image controls must remain independent of the swipe surface.
const base = process.env.FEATURED_CONTROLS_QA_BASE || 'http://localhost:3000';
const browser = await chromium.launch();
const results = [];
const errors = [];
try {
  for (const key of ['cafe_sunday_line_a', 'fast_food_loop_bagel_a']) {
    for (const [device, width, height] of [['pc', 1440, 900], ['tablet', 1180, 820], ['mobile', 390, 844]]) {
      const id = `${key}/${device}`;
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push({ id, message: error.message }));
      try {
        const response = await page.goto(`${base}/templates/${key}/preview?device=${device}&view=actual&embedded=1`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200, id);
        await page.locator('.cafe-a-typography').waitFor();
        if (device !== 'mobile') await page.locator('[data-native-ready=true]').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const hero = page.locator('.cafe-a-cover-hero:visible').first();
        const controls = hero.locator('[data-cafe-a-cover-indicators] button');
        assert.ok(await controls.count() > 1, `${id}: at least two slides`);
        await controls.nth(1).click();
        await expect(hero).toHaveAttribute('data-cafe-a-active-hero-index', '1');
        await controls.nth(0).focus();
        await page.keyboard.press('Enter');
        await expect(hero).toHaveAttribute('data-cafe-a-active-hero-index', '0');
        const frame = await hero.locator('.cafe-a-cover-frame').boundingBox();
        const x = frame.x + frame.width * .65;
        const y = frame.y + Math.min(frame.height * .4, 200);
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 120, y, { steps: 10 });
        await page.mouse.up();
        await expect(hero).toHaveAttribute('data-cafe-a-active-hero-index', '1');
        results.push({ id, pointer: true, keyboard: true, drag: true });
      } finally {
        await page.close();
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ base, passed: results.length, results, errors }, null, 2));
} finally {
  await browser.close();
}
