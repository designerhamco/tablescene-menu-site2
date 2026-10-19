import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/default-title-only';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [], writes = [];
const p = await browser.newPage({ reducedMotion: 'reduce' });
p.on('pageerror', error => errors.push(error.message));
await p.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
try {
  for (const [device, width, height] of [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180], ['mobile', 320, 844], ['mobile', 390, 844]]) {
    for (const order of ['on', 'off']) for (const prices of ['on', 'off']) {
      await p.setViewportSize({ width, height });
      await p.goto(`${base}/templates/cafe_design_a/preview?design=basic-first-column&view=actual&device=${device}&orderPreview=${order}&priceOptionsPreview=${prices}&secondaryNamesPreview=off&descriptionsPreview=off`, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.locator(device === 'mobile' ? '[data-mobile-brand-fit="ready"]' : '[data-paged-ready="true"]').first().waitFor();
      const geometry = await p.locator('[data-cafe-a-image-title-only]').filter({ visible: true }).evaluateAll(rows => rows.map(row => {
        const rect = selector => row.querySelector(selector)?.getBoundingClientRect();
        const image = rect('.cafe-a-menu-item-image-slot'), copy = rect('.cafe-a-menu-copy'), name = rect('[data-cafe-a-menu-name]');
        const price = rect('.cafe-a-price-area > div'), add = rect('[data-menu-order-add]'), bounds = row.getBoundingClientRect();
        const center = box => box.top + box.height / 2;
        return { name: row.querySelector('[data-cafe-a-menu-name]').textContent, delta: Math.abs(center(image) - center(copy)),
          priceDelta: Math.abs(center(image) - center(price)), priceRight: price.left >= name.right - 1,
          contained: !add || add.bottom <= bounds.bottom + 1, imageWidth: image.width };
      }));
      assert.ok(geometry.length > 10);
      for (const row of geometry) {
        assert.ok(row.delta < 1.5, 'thumbnail and title center: ' + JSON.stringify(row));
        assert.ok(row.priceDelta < 1.5, 'price remains with the title: ' + JSON.stringify(row));
        assert.ok(row.priceRight && row.contained, 'price/add button retain their own space: ' + JSON.stringify(row));
      }
      const viewport = await p.evaluate(() => [innerWidth, innerHeight, document.documentElement.scrollWidth]);
      assert.deepEqual(viewport, [width, height, width]);
      results.push({ device, viewport: [width, height], order, prices, rows: geometry.length, maxCenterDelta: Math.max(...geometry.map(row => row.delta)) });
      if (order === 'on' && prices === 'on') await p.screenshot({ path: `${output}/${device}-${width}.png` });
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
} finally {
  await p.screenshot({ path: `${output}/last.png` });
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
console.log(JSON.stringify({ checked: results.length, errors, writes }));
