import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Read-only rendered contract for the native and neutral center-column lists.
const base = process.env.CENTER_RAIL_QA_BASE || 'http://localhost:3039';
const out = process.env.CENTER_RAIL_QA_OUT || '/tmp/center-rail-layout';
const smoke = process.env.CENTER_RAIL_QA_SMOKE === '1';
const keys = ['cafe_round_focus_a', 'cafe_real_matcha_a'];
const modes = smoke ? ['orderedBalancedFit'] : ['orderedBalancedFit', 'orderedFit'];
const devices = smoke ? ['tablet'] : ['tablet', 'pc'];
const sizes = smoke ? [[1180, 820], [820, 1180], [1440, 900]]
  : [[1180, 820], [820, 1180], [768, 1024], [900, 1200], [1440, 900], [820, 1180], [1180, 820]];
const browser = await chromium.launch();
const results = [], errors = [], writes = [];

function measure() {
  const root = document.querySelector('[data-native-scroll],[data-scroll-template]');
  if (!root) return null;
  const rect = element => {
    const r = element.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  const brand = root.querySelector('[data-native-brand],[data-paged-brand]');
  const menu = root.querySelector('[data-native-menu],[data-scroll-menu]');
  const probe = root.querySelector('[data-native-measure],[data-measure-id]')?.parentElement;
  const actions = root.querySelector('[data-native-actions],[data-scroll-actions]');
  const columns = [...root.querySelectorAll('[data-native-column],[data-paged-column]')];
  const style = getComputedStyle(brand), board = getComputedStyle(root);
  return {
    viewport: [innerWidth, innerHeight], position: root.dataset.centerRailPosition,
    innerWidth: root.clientWidth - parseFloat(board.paddingLeft) - parseFloat(board.paddingRight),
    representativeContentWidth: brand.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
    brand: rect(brand), menu: rect(menu), probe: rect(probe), columns: columns.map(rect),
    buttons: actions ? [...actions.querySelectorAll('button')].map(element => ({
      ...rect(element), text: element.textContent, direction: getComputedStyle(element).flexDirection,
    })) : [],
    ids: [...root.querySelectorAll('[data-native-unit],[data-paged-block]')].map(element => element.dataset.nativeUnit || element.dataset.pagedBlock),
    overflow: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    scroll: menu.scrollTop, scrollHeight: menu.scrollHeight, clientHeight: menu.clientHeight,
    ready: root.dataset.nativeReady || root.dataset.pagedReady,
  };
}
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  let previous;
  for (let i = 0; i < 50; i++) {
    const current = await page.evaluate(measure);
    if (current?.ready === 'true' && JSON.stringify(current) === JSON.stringify(previous)) return current;
    previous = current;
    await page.waitForTimeout(80);
  }
  assert.fail(`Layout did not settle: ${JSON.stringify(previous)}`);
}
async function newPage(viewport) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
  await page.route('**/api/**', route => {
    if (route.request().method() === 'GET') return route.continue();
    writes.push(route.request().url());
    return route.abort();
  });
  return page;
}
function query(key, device, mode) {
  return new URLSearchParams({
    device, view: 'actual', embedded: '1', callPreview: 'on', orderPreview: 'on',
    ...(mode ? { layoutMode: mode } : {}),
    ...(key === 'cafe_real_matcha_a' ? { design: 'basic-center-column' } : {}),
  });
}
try {
  await fs.mkdir(out, { recursive: true });
  for (const key of keys) for (const device of devices) for (const mode of modes) {
    const page = await newPage({ width: 1180, height: 820 });
    await page.goto(`${base}/templates/${key}/preview?${query(key, device, mode)}`, { waitUntil: 'load' });
    let expectedIds;
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      const state = await settle(page);
      const id = `${key}/${device}/${mode}/${width}`;
      assert.equal(state.overflow[0], width, `${id}: horizontal overflow`);
      assert.ok(state.overflow[1] <= height + 1, `${id}: page scroll instead of menu scroll`);
      assert.equal(state.columns.length, state.position === 'left' ? 1 : 2);
      assert.ok(state.columns.every(column => Math.abs(column.width - state.probe.width) < 1), `${id}: probe width mismatch`);
      assert.equal(state.buttons.length, 2);
      assert.ok(state.buttons[0].y + state.buttons[0].height <= state.buttons[1].y - 7);
      assert.ok(Math.abs(state.buttons[0].width - state.buttons[1].width) < 1);
      assert.ok(state.buttons.every(button => button.height >= 44 && button.direction === 'row' && button.y + button.height <= state.brand.y + state.brand.height + 1));
      assert.match(state.buttons[0].text, /호출/);
      assert.match(state.buttons[1].text, /주문/);
      if (state.position === 'left') {
        assert.ok(state.brand.x + state.brand.width < state.menu.x);
        assert.ok(Math.abs(state.representativeContentWidth / state.columns[0].width - 35 / 65) < .003, `${id}: content ratio`);
      } else {
        assert.ok(Math.abs(state.brand.width / state.innerWidth - .24) < .002, `${id}: centered slot`);
        assert.ok(state.columns[0].x + state.columns[0].width <= state.brand.x + 1);
        assert.ok(state.columns[1].x >= state.brand.x + state.brand.width - 1);
      }
      if (expectedIds) assert.deepEqual(state.ids, expectedIds, `${id}: menu order`);
      else expectedIds = state.ids;
      assert.equal(new Set(state.ids).size, state.ids.length);
      if (width === 820) assert.equal(state.position, 'left');
      if (width === 1180 || width === 1440) assert.equal(state.position, 'center');
      const menu = page.locator('[data-native-menu],[data-scroll-menu]');
      await menu.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await page.waitForTimeout(100);
      const scrolled = await page.evaluate(measure);
      assert.deepEqual(scrolled.brand, state.brand);
      assert.deepEqual(scrolled.buttons, state.buttons);
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.ok(scrolled.scroll > 0 || scrolled.scrollHeight <= scrolled.clientHeight + 1);
      await menu.evaluate(element => { element.scrollTop = 0; });
      results.push({ key, device, mode, ...state });
      console.log('PASS', id, state.position);
      if (mode === 'orderedBalancedFit' && device === 'tablet' && (width === 820 || width === 1180)) {
        await page.screenshot({ path: `${out}/${key}-${width}.png` });
      }
    }
    await page.getByRole('button', { name: '직원 호출하기', exact: true }).click();
    assert.ok(await page.getByRole('dialog').isVisible());
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: /주문하기, 장바구니/ }).click();
    assert.ok(await page.getByRole('dialog').isVisible());
    await page.keyboard.press('Escape');
    await page.close();
  }
  for (const key of keys) {
    const page = await newPage({ width: 390, height: 844 });
    await page.goto(`${base}/templates/${key}/preview?${query(key, 'mobile')}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-cafe-a-mobile-style="true"]').first().waitFor();
    assert.equal(await page.locator('[data-center-rail-position]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    results.push({ key, device: 'mobile', independent: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  console.log(`PASS ${results.length} cases; no page errors or writes`);
} finally {
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ base, results, errors, writes }, null, 2));
  await browser.close();
}
