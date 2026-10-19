import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/default-design-review';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], failures = [], errors = [], writes = [];
const designs = [['cafe_design_a', 'basic-first-column'], ['dining_aube_table_a', 'dining-full-page']];
const devices = [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180], ['mobile', 320, 800], ['mobile', 390, 844], ['mobile', 430, 932]];
try {
  for (const [key, design] of designs) for (const [device, width, height] of devices) {
    const p = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    p.on('pageerror', e => errors.push({ design, device, error: e.message }));
    await p.route('**/api/**', route => {
      if (route.request().method() !== 'GET') { writes.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    try {
      const response = await p.goto(`${base}/templates/${key}/preview?design=${design}&view=actual&device=${device}&layoutMode=orderedFit&callPreview=on&orderPreview=on`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      await p.evaluate(() => document.fonts.ready);
      await p.locator(`[data-default-design="${design}"]`).waitFor();
      if (design.startsWith('basic') && device !== 'mobile') await p.locator('[data-paged-ready="true"]').waitFor();
      await p.screenshot({ path: `${output}/${design}-${device}-${width}.png` });
      const before = await p.evaluate(() => ({ viewport: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
      assert.deepEqual(before.viewport, [width, height]);
      assert.equal(before.overflow, false, 'no horizontal viewport overflow');
      if (design.startsWith('basic') && device !== 'mobile') {
        const rows = await p.locator('[data-paged-column] .cafe-a-menu-item-with-image').evaluateAll(items => items.map(item => {
          const copy = item.querySelector('.cafe-a-menu-copy').getBoundingClientRect();
          const price = item.querySelector('.cafe-a-price-area').getBoundingClientRect();
          return { copyWidth: copy.width, copyBottom: copy.bottom, priceTop: price.top };
        }));
        assert.ok(rows.length > 0);
        for (const row of rows) { assert.ok(row.copyWidth >= 120, 'thumbnail and options must leave readable copy width'); assert.ok(row.priceTop >= row.copyBottom, 'neutral price row follows copy without overlap'); }
      }
      const order = p.locator('[data-scroll-order], [data-one-page-call-button="desktop-cart"], [data-one-page-call-button="mobile-order-bottom"], [data-table-mobile-dock] button[aria-label^="주문하기"], [data-table-menu-actions] button[aria-label^="장바구니"]').filter({ visible: true }).first();
      await order.click();
      let cart = p.locator('[data-menu-cart] [role="dialog"]');
      await cart.waitFor();
      assert.equal(await cart.locator('header').count(), 0, 'empty cart has no top header');
      assert.equal(await cart.locator('[data-cart-table]').count(), 0);
      await cart.getByText('장바구니가 비어 있어요', { exact: true }).waitFor();
      if (device !== 'mobile') {
        const box = await cart.boundingBox();
        assert.ok(box.width < width * .8 && box.height < height * .8, 'empty state is a compact popup');
      }
      await p.screenshot({ path: `${output}/${design}-${device}-${width}-empty.png` });
      await cart.getByRole('button', { name: '메뉴 보러 가기', exact: true }).click();
      if (key.startsWith('dining')) {
        await p.locator('.aube-table-pagination-dots button').nth(1).click();
        await p.locator('[data-menu-order-add]').filter({ visible: true }).first().waitFor();
        await p.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity));
        await p.screenshot({ path: `${output}/${design}-${device}-${width}-menu.png` });
      }
      await p.locator('[data-menu-order-add]').filter({ visible: true }).first().click();
      let dialog = p.getByRole('dialog');
      for (const group of await dialog.locator('fieldset').all()) await group.getByRole('button').first().click();
      await dialog.getByRole('button', { name: /장바구니 담기/ }).click();
      await order.click();
      cart = p.locator('[data-menu-cart] [role="dialog"]');
      await cart.waitFor();
      assert.equal(await cart.locator('header').count(), 1);
      await cart.locator('[data-cart-table]').getByText('Table 1', { exact: true }).waitFor();
      const box = await cart.boundingBox();
      assert.deepEqual([box.x, box.y, box.width, box.height], [0, 0, width, height]);
      await p.screenshot({ path: `${output}/${design}-${device}-${width}-cart.png` });
      await cart.locator('[data-cart-back]').click();
      results.push({ design, device, width, height });
      console.log('PASS', design, device, width);
    } catch (e) { failures.push({ design, device, width, error: e.message }); console.log('FAIL', design, device, width, e.message.split('\n')[0]); await p.screenshot({ path: `${output}/${design}-${device}-${width}-failure.png` }); }
    finally { await p.close(); }
  }
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, failures, errors, writes }, null, 2));
}
assert.deepEqual(failures, []);
assert.deepEqual(errors, []);
assert.deepEqual(writes, []);
console.log(JSON.stringify({ checked: results.length, failures, errors, writes }));
