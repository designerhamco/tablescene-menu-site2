import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/basic-readable-columns';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const page = await browser.newPage({ reducedMotion: 'reduce' });
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
const read = () => {
  const root = document.querySelector('[data-scroll-template]');
  const menu = root.querySelector('[data-scroll-menu]');
  const names = [...root.querySelectorAll('[data-paged-column] [data-cafe-a-menu-name]')].map(name => {
    const bounds = name.getBoundingClientRect(), style = getComputedStyle(name);
    const row = name.closest('[data-paged-block]');
    const image = row.querySelector('.cafe-a-menu-item-image-slot')?.getBoundingClientRect();
    const price = row.querySelector('.cafe-a-price-area')?.getBoundingClientRect();
    return { text: name.textContent, lines: Math.round(bounds.height / parseFloat(style.lineHeight)),
      width: bounds.width, size: parseFloat(style.fontSize),
      distinctRails: (!image || bounds.left >= image.right - 1) && (!price || bounds.right <= price.left + 1) };
  });
  return { viewport: [innerWidth, innerHeight], columns: root.querySelectorAll('[data-paged-column]').length,
    scroll: menu.scrollHeight - menu.clientHeight, more: root.dataset.scrollMore,
    names, outerWidth: document.documentElement.scrollWidth };
};
async function settled(target = page) {
  await target.locator('[data-paged-ready="true"]').waitFor();
  await target.locator('body').evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const first = await target.locator('body').evaluate(read);
  await page.waitForTimeout(180);
  const second = await target.locator('body').evaluate(read);
  assert.deepEqual(second, first, 'column/name measurement must settle');
  assert.ok(second.columns >= 1 && second.columns <= 3);
  assert.equal(second.outerWidth, second.viewport[0]);
  assert.ok(second.names.every(name => name.distinctRails), 'names, thumbnails and prices have separate rails');
  return second;
}
try {
  for (const layoutMode of ['orderedBalancedFit', 'orderedFit']) {
    await page.setViewportSize({ width: 1180, height: 820 });
    await page.goto(`${base}/templates/cafe_design_a/preview?` + new URLSearchParams({ design: 'basic-first-column', device: 'tablet', view: 'actual', embedded: '1', callPreview: 'on', orderPreview: 'on', layoutMode }), { waitUntil: 'networkidle' });
    const tablet = await settled();
    assert.equal(tablet.columns, 2, 'thumbnails plus three price options require wider names');
    assert.ok(tablet.names.every(name => name.lines === 1), 'the sample tablet product names fit their widened slots');
    assert.ok(tablet.scroll > 0 && tablet.more === 'true');
    results.push({ case: 'tablet-three-options', layoutMode, ...tablet });
    await page.screenshot({ path: `${output}/tablet-${layoutMode}.png` });
    // Resize the same document in both directions; do not rely on a fresh mount.
    for (const [width, height, count] of [[1920, 1080, 3], [1180, 820, 2]]) {
      await page.setViewportSize({ width, height });
      const resized = await settled();
      assert.equal(resized.columns, count);
      results.push({ case: 'resize-same-document', layoutMode, ...resized });
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${base}/templates/cafe_design_a/preview?design=basic-first-column&device=pc&view=actual&embedded=1&callPreview=on&orderPreview=on&layoutMode=${layoutMode}`, { waitUntil: 'networkidle' });
    const pc = await settled();
    assert.equal(pc.columns, 3, 'wide PC retains readable three columns');
    results.push({ case: 'wide-pc', layoutMode, ...pc });
  }
  // Real toolbar options reload the preview data without stale column decisions.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/templates/cafe_design_a/preview?design=basic-first-column&device=tablet&orderPreview=on&callPreview=on`, { waitUntil: 'networkidle' });
  const frame = page.frameLocator('iframe');
  const guide = page.locator('[data-preview-guide-variant]');
  if (await guide.isVisible()) await guide.getByRole('button', { name: '닫기', exact: true }).click();
  const initial = await settled(frame);
  assert.equal(initial.columns, 2);
  for (const enabled of [false, true]) {
    for (const label of ['상품 이미지', '가격 옵션']) await page.getByRole('checkbox', { name: label + ' 보기', exact: true }).setChecked(enabled);
    const updated = await settled(frame);
    assert.equal(updated.columns, enabled ? 2 : 3, 'removing/returning competing rails recomputes readable columns');
    results.push({ case: 'preview-options', enabled, ...updated });
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
} finally {
  await page.screenshot({ path: `${output}/last.png` });
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
console.log(JSON.stringify({ checked: results.length, errors, writes }));
