import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.WIDGET_QA_BASE || 'http://localhost:3027';
const output = process.env.COVER_QA_OUTPUT || '/private/tmp/dining-cover-colors';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], failures = [], errors = [], writes = [];
const representative = 'rgb(85, 200, 238)', information = 'rgb(255, 189, 89)';
const designPreview = JSON.stringify({ textColorGroupsVersion: 2, textColors: { representative: '#55c8ee', information: '#ffbd59' } });
const variants = [
  ['dining_aube_table_a'], ['dining_aube_table_b'],
  ...['dining-full-page', 'dining-sidebar', 'dining-full-page-album', 'dining-sidebar-album'].map(design => [design.includes('sidebar') ? 'dining_aube_table_b' : 'dining_aube_table_a', design]),
  ['cafe_design_a'], ['cafe_mocha_forest_a'], ['cafe_sunday_line_a'],
];
for (const [key, design] of variants) for (const [device, width, height] of [['pc', 1440, 900], ['mobile', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : (writes.push(route.request().url()), route.abort()));
  const c = { key, design, device };
  try {
    const query = new URLSearchParams({ template: key, device, notices: '3', designPreview, ...(design ? { design } : {}) });
    const visit = async () => {
      await page.goto(`${base}/__qa/widget-placement?${query}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      if (!key.startsWith('dining_') && device !== 'mobile') await page.locator('[data-native-ready="true"],[data-paged-ready="true"]').waitFor();
      await page.waitForTimeout(200);
    };
    const dining = key.startsWith('dining_');
    if (dining) {
      query.set('cover', 'on');
      await visit();
      const coverColors = await page.locator('.aube-table-cover-description,.aube-table-cover-notices').evaluateAll(elements => elements.map(e => getComputedStyle(e).color));
      assert.equal(coverColors.length, 2, 'both cover description and notices render');
      assert.ok(coverColors.every(color => color === representative), 'Dining description and notices use representative ink');
      query.delete('cover');
    }
    await visit();
    const widgetColors = await page.locator('[data-cafe-a-widget-title],[data-cafe-a-widget-body]').evaluateAll(elements => elements.filter(e => !e.closest('[inert]') && e.getBoundingClientRect().width > 0).map(e => getComputedStyle(e).color));
    assert.ok(widgetColors.length >= 2, 'widget title and body render');
    assert.ok(widgetColors.every(color => color === information), 'widget retains separate information ink');
    if (!dining) {
      const top = key === 'cafe_sunday_line_a';
      const colors = await page.locator(top ? '.cafe-a-topline-notice-text,.cafe-a-mobile-notice-list .cafe-a-description-text' : '[data-native-notices],[data-paged-notices],[data-cafe-a-footer-info] .cafe-a-description-text').evaluateAll(elements => elements.filter(e => !e.closest('[inert]') && e.getBoundingClientRect().width > 0).map(e => getComputedStyle(e).color));
      assert.ok(colors.length > 0, 'Basic notices render');
      assert.ok(colors.every(color => color === (top && device !== 'mobile' ? representative : information)), 'Basic upper versus footer notice ink stays unchanged');
    }
    results.push(c); console.log('PASS', JSON.stringify(c));
  } catch (error) {
    failures.push({ ...c, error: error.message }); console.log('FAIL', JSON.stringify(failures.at(-1)));
    await page.screenshot({ path: `${output}/fail-${failures.length}.png` });
  } finally { await page.close(); }
}
await browser.close();
await fs.writeFile(`${output}/results.json`, JSON.stringify({ results, failures, errors, writes }, null, 2));
console.log(JSON.stringify({ passed: results.length, failed: failures.length, errors, writes }));
if (failures.length || errors.length || writes.length) process.exitCode = 1;
