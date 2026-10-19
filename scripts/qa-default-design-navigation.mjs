import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/default-design-navigation';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [], writes = [], results = [];
const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
p.on('pageerror', e => errors.push(e.message));
await p.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
try {
  for (const [key, design] of [['cafe_design_a', 'basic-first-column'], ['dining_aube_table_a', 'dining-full-page']]) {
    await p.goto(`${base}/templates/${key}/preview?design=${design}&device=tablet&callPreview=on&orderPreview=on`, { waitUntil: 'networkidle' });
    const guide = p.locator('[data-preview-guide-variant]');
    if (await guide.isVisible()) await guide.getByRole('button', { name: '닫기', exact: true }).click();
    for (const [device, label] of [['pc', 'PC'], ['mobile', '모바일']]) {
      await p.getByRole('navigation', { name: '미리보기 기기 선택' }).getByRole('link', { name: label, exact: true }).click();
      await p.waitForFunction(device => new URL(document.querySelector('iframe').src).searchParams.get('device') === device, device);
      await p.frameLocator('iframe').locator(`[data-default-design="${design}"]`).waitFor();
      const frameURL = new URL(await p.locator('iframe').getAttribute('src'), base);
      assert.equal(frameURL.searchParams.get('design'), design);
      assert.equal(new URL(await p.locator('[data-preview-detached-link]').getAttribute('href'), base).searchParams.get('design'), design);
    }
    results.push({ kind: 'device-and-detached-navigation', design });
  }
  await p.goto(`${base}/templates/dining_aube_table_a/preview?design=dining-full-page&device=pc&view=actual&orderPreview=on`, { waitUntil: 'networkidle' });
  for (const [index, name] of [[2, 'individual-menu'], [3, 'price-options']]) {
    await p.locator('.aube-table-pagination-dots button').nth(index).click();
    await p.getByRole('heading', { name: index === 2 ? 'A La Carte Menu' : 'Drink Menu', exact: true }).waitFor();
    await p.waitForFunction(() => document.querySelectorAll('.aube-table-stage').length === 1);
    await p.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity));
    assert.ok(await p.locator('[data-aube-table-page-scroll] img').count() > 0, 'individual items show sample images');
    if (index === 3) { assert.match(await p.locator('.aube-table-item-price').first().innerText(), /Glass/); assert.match(await p.locator('.aube-table-item-price').first().innerText(), /Bottle/); }
    await p.screenshot({ path: `${output}/dining-${name}.png` });
    results.push({ kind: name });
  }
  await p.goto(`${base}/templates/cafe_design_a/preview?device=tablet&view=actual&orderPreview=on`, { waitUntil: 'networkidle' });
  assert.equal(await p.locator('[data-default-design]').count(), 0);
  await p.locator('[data-scroll-order]').click();
  const cart = p.locator('[data-menu-cart] [role="dialog"]');
  await cart.waitFor();
  assert.equal(await cart.locator('header').count(), 0, 'original template shares the corrected empty popup');
  await cart.getByRole('button', { name: '메뉴 보러 가기', exact: true }).click();
  results.push({ kind: 'original-template-empty-cart' });
  const response = await p.goto(`${base}/templates/dining_aube_table_a/preview?design=basic-first-column`, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 404, 'wrong engine cannot select a neutral design');
  results.push({ kind: 'invalid-design-route' });
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
console.log(JSON.stringify({ passed: results.length, errors, writes }));
