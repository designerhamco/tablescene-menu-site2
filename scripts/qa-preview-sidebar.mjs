import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const out = process.env.ORDER_QA_OUTPUT || '/private/tmp/preview-sidebar';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch(), results = [], failures = [], errors = [];
const configs = [
  ['pc', 1516, 1000], ['pc', 1024, 768], ['tablet', 1516, 1000],
  ['tablet', 1024, 768], ['tablet', 960, 900], ['tablet', 959, 900], ['tablet', 820, 1180],
  ['mobile', 1516, 1000], ['mobile', 320, 900], ['mobile', 390, 900], ['mobile', 430, 900],
  ['tablet', 1516, 1000, 'dining'], ['tablet', 1024, 768, 'dining'],
  ['tablet', 1516, 1000, 'portrait'], ['mobile', 390, 900, 'dining'],
  ['pc', 1516, 1000, 'mocha'], ['tablet', 1516, 1000, 'features'],
];
const box = locator => locator.boundingBox();
function sameGeometry(actual, expected) {
  for (const key of ['x', 'y', 'width', 'height']) {
    assert.ok(Math.abs(actual[key] - expected[key]) < .5, JSON.stringify({ actual, expected, key }));
  }
}
async function run([device, width, height, variant]) {
  const name = `${device} ${width}x${height} ${variant || 'basic'}`;
  const p = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  p.setDefaultTimeout(12000);
  p.on('pageerror', error => errors.push(error.message));
  await p.addInitScript(() => sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed', '1'));
  await p.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : r.abort());
  try {
    const dining = variant === 'dining' || variant === 'portrait';
    const key = dining ? 'dining_aube_table_b' : variant === 'mocha' ? 'cafe_mocha_forest_a' : 'cafe_real_matcha_a';
    await p.goto(`${base}/templates/${key}/preview?` + new URLSearchParams({
      device, ...(dining ? { design: 'dining-sidebar-album' } : variant === 'mocha' ? {} : { design: 'basic-first-column-album' }),
      ...(variant === 'portrait' ? { orientation: 'portrait' } : {}),
      ...(variant === 'features' ? {} : { previewOptions: 'design' }), imagesPreview: 'on',
    }), { waitUntil: 'networkidle' });
    const iframe = p.frameLocator('iframe');
    const source = device === 'pc' ? [width, height] : device === 'mobile' ? [390, 844] : variant === 'portrait' ? [820, 1180] : [1180, 820];
    await expect.poll(() => iframe.locator('body').evaluate(() => [innerWidth, innerHeight])).toEqual(source);
    await iframe.locator('body').evaluate(() => document.fonts.ready);
    await p.waitForTimeout(150);
    const wide = width >= 960, toggle = p.locator('[data-preview-options-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', String(wide));
    const src = await p.locator('iframe').getAttribute('src');
    await iframe.locator('body').evaluate(() => {
      window.__panelProbe = 'same-document';
      const e = document.querySelector('[data-scroll-menu],[data-native-scroll]');
      if (e) { e.scrollTop = 100; e.setAttribute('data-probe-scroll', String(e.scrollTop)); }
    });
    const shell = p.locator('[data-preview-frame-shell]');
    const initialFrame = await box(shell), initialToolbar = await box(p.locator('[data-preview-device-toolbar]'));
    assert.equal(await shell.evaluate(e => getComputedStyle(e).transform), 'none');
    assert.equal(await p.locator('[data-preview-display-scale]').count(), 0);
    if (wide) {
      if (device === 'pc') sameGeometry(initialFrame, { x: 0, y: 0, width, height });
      else {
        assert.equal(initialFrame.width, source[0] + 20);
        assert.equal(initialFrame.height, source[1] + 20);
        if (initialFrame.width <= width - 32) assert.ok(Math.abs(initialFrame.x + initialFrame.width / 2 - width / 2) < .5);
      }
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await p.waitForTimeout(150);
      sameGeometry(await box(shell), initialFrame);
      sameGeometry(await box(p.locator('[data-preview-device-toolbar]')), initialToolbar);
    }
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(p.getByRole('tab', { name: variant === 'features' ? '기능 옵션' : '디자인 옵션', exact: true })).toHaveAttribute('aria-selected', 'true');
    await p.waitForTimeout(150);
    assert.equal(await p.locator('iframe').getAttribute('src'), src);
    assert.deepEqual(await iframe.locator('body').evaluate(() => [innerWidth, innerHeight]), source);
    assert.equal(await iframe.locator('body').evaluate(() => window.__panelProbe), 'same-document');
    assert.ok(await iframe.locator('body').evaluate(() => {
      const e = document.querySelector('[data-probe-scroll]');
      return !e || e.scrollTop === Number(e.getAttribute('data-probe-scroll'));
    }));
    const panel = p.locator('[data-preview-options-panel]'), rect = await box(panel), frame = await box(shell);
    const toolbar = await box(p.locator('[data-preview-device-toolbar]'));
    await expect(panel).toHaveCSS('background-color', 'rgb(246, 247, 249)');
    if (wide) {
      sameGeometry(frame, initialFrame);
      sameGeometry(toolbar, initialToolbar);
      assert.ok(rect.y >= toolbar.y + toolbar.height, JSON.stringify({ rect, toolbar }));
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height);
      // Where the panel and menu intersect, the panel receives the pointer above the unchanged menu.
      const x = Math.max(rect.x, frame.x) + 10, y = Math.max(rect.y, frame.y) + 10;
      if (x < Math.min(rect.x + rect.width, frame.x + frame.width) && y < Math.min(rect.y + rect.height, frame.y + frame.height)) {
        assert.ok(await p.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-preview-options-panel]'), { x, y }));
      }
    } else assert.ok(rect.y >= toolbar.y + toolbar.height, JSON.stringify({ rect, toolbar }));
    if (width === 1516 && device === 'tablet' && !variant) {
      await p.screenshot({ path: `${out}/tablet-panel.png` });
      await p.setViewportSize({ width: 820, height: 1180 });
      await p.waitForTimeout(200);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      assert.deepEqual(await iframe.locator('body').evaluate(() => [innerWidth, innerHeight]), source);
      assert.equal(await iframe.locator('body').evaluate(() => window.__panelProbe), 'same-document');
      await p.setViewportSize({ width, height });
      await p.waitForTimeout(200);
      sameGeometry(await box(shell), initialFrame);
    }
    if (device === 'mobile' && width === 390 && !variant) await p.screenshot({ path: `${out}/mobile-panel.png` });
    await p.getByRole('button', { name: '기기 선택 도구 닫기', exact: true }).click();
    await p.waitForTimeout(350);
    if (wide) await expect(panel).toBeVisible(); else await expect(panel).toBeHidden();
    await p.getByRole('button', { name: '기기 선택 도구 열기', exact: true }).click();
    await p.waitForTimeout(350);
    await toggle.focus(); await toggle.press('Escape');
    await expect(p.getByRole('button', { name: '보기 옵션 열기', exact: true })).toBeFocused();
    if (wide) sameGeometry(await box(shell), initialFrame);
    assert.equal(await iframe.locator('body').evaluate(() => window.__panelProbe), 'same-document');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    results.push({ name, viewport: [width, height], source, frame: initialFrame }); console.log('PASS', name);
  } catch (e) {
    failures.push({ name, error: e.message }); console.log('FAIL', name, e.message);
    await p.screenshot({ path: `${out}/failure-${results.length}-${width}.png` }).catch(() => {});
  } finally { await p.close(); }
}
try {
  for (let i = 0; i < configs.length; i += 3) await Promise.all(configs.slice(i, i + 3).map(run));
  assert.deepEqual(failures, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: results.length }));
} finally {
  await browser.close(); await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, failures, errors }, null, 2));
}
