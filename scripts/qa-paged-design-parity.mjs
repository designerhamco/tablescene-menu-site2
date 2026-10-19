import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/paged-design-parity';
await fs.mkdir(output, {recursive: true});
const browser = await chromium.launch();
const results = [], errors = [], writes = [];
try {
  for (const [device, width, height] of [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180]]) {
    const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/public-menu/**', route => {
      if (route.request().method() !== 'GET') { writes.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    const styles = {};
    for (const key of ['cafe_design_a', 'cafe_real_matcha_paged_test']) {
      await page.goto(`${base}/templates/${key}/preview?${new URLSearchParams({device, view: 'actual', embedded: '1', callPreview: 'on', orderPreview: 'on'})}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(paged => paged ? document.querySelector('[data-paged-ready]')?.dataset.pagedReady === 'true' : document.querySelector('.cafe-a-desktop-fit-board')?.dataset.fitPresentationState === 'ready', key.includes('paged'));
      await page.waitForTimeout(300);
      styles[key] = await page.evaluate(() => Object.fromEntries([
        ['brand', '.cafe-a-store-title .cafe-a-script-en'],
        ['category', '.cafe-a-category-title .cafe-a-script-en'],
        ['name', '[data-cafe-a-menu-name] .cafe-a-script-ko'],
        ['secondary', '.cafe-a-menu-meta .cafe-a-script-en'],
        ['description', '.cafe-a-menu-description'],
        ['price', '.cafe-a-menu-price .cafe-a-script-en'],
      ].map(([role, selector]) => {
        const element = [...document.querySelectorAll(selector)].find(e => e.getBoundingClientRect().height > 0 && !e.closest('[aria-hidden=true]'));
        const style = element && getComputedStyle(element);
        return [role, style && {font: style.fontFamily, color: style.color, weight: style.fontWeight}];
      })));
      for (const role of Object.keys(styles[key])) assert.ok(styles[key][role], `${key}: missing ${role}`);
    }
    assert.deepEqual(styles.cafe_real_matcha_paged_test, styles.cafe_design_a, `${device}: original role styles`);
    const metrics = await page.evaluate(() => ({viewport: [innerWidth, innerHeight], coverImages: document.querySelectorAll('[data-cafe-a-cover-image]').length}));
    assert.deepEqual(metrics.viewport, [width, height]);
    assert.ok(metrics.coverImages > 1, 'original representative-image carousel is retained');
    assert.equal(await page.getByRole('navigation', {name:'메뉴 페이지 이동'}).count(), 0);
    await page.screenshot({path: `${output}/${device}-${width}.png`});
    results.push({device, ...metrics, styles: styles.cafe_design_a});
    await page.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({results, errors, writes}, null, 2));
}
console.log(JSON.stringify({checked: results.length, errors, writes}));
