import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { getStarterPreset } from '../lib/menu-starter-presets.ts';
import { getSinglePageStarterTranslations } from '../lib/template-demo-data/single-page-starter-translations.ts';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const out = process.env.ORDER_QA_OUTPUT || '/private/tmp/even-starters-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const keys = ['cafe_design_a', 'restaurant_onue_a', 'cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a', 'cafe_round_focus_a', 'fast_food_loop_bagel_a'];
const sizes = process.env.STARTER_QA_SMOKE === '1' ? [390] : [320, 430];
const locales = process.env.STARTER_QA_SMOKE === '1' ? ['ko', 'en'] : ['ko', 'en', 'zh', 'ja'];
const normalize = text => text.replace(/\s+/g, ' ').trim();
try {
  for (const key of keys) for (const width of sizes) for (const locale of locales) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
    try {
      await page.goto(`${base}/templates/${key}/preview?${new URLSearchParams({ device: 'mobile', view: 'actual', lang: locale })}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('[data-mobile-brand-fit=ready]').filter({ visible: true }).first().waitFor();
      const expected = getStarterPreset(key).pages.flatMap(pg => pg.categories.flatMap(cat => cat.items)).map(item => locale === 'ko' ? item.name : getSinglePageStarterTranslations(key)[locale].items[item.key].name);
      const names = await page.locator('[data-cafe-a-menu-name]').filter({ visible: true }).allTextContents();
      const normalized = new Set(names.map(normalize));
      for (const name of expected) assert.ok(normalized.has(normalize(name)), `${key}/${locale}/${width}: missing ${name}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal viewport overflow');
      assert.equal(await page.locator('[role=alert]:not(#__next-route-announcer__)').filter({ visible: true }).count(), 0);
      if (locale === 'ko') await page.screenshot({ path: `${out}/${key}-${width}.png`, fullPage: true });
      results.push({ key, locale, viewport: await page.evaluate(() => [innerWidth, innerHeight]), expectedItems: expected.length });
      console.log('PASS starter', key, locale, width);
    } finally { await page.close(); }
  }
} finally {
  await browser.close();
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
assert.deepEqual(errors, []); assert.deepEqual(writes, []);
console.log(JSON.stringify({ checked: results.length }));
