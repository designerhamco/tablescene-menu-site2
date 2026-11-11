import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { catalogDesigns } from '../lib/catalog-designs.ts';

// Run with node --import tsx scripts/qa-basic-equal-tracks.mjs.
const pcOnly = process.env.EQUAL_QA_PC_ONLY === '1';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3027';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/basic-equal-tracks';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const page = await browser.newPage({ reducedMotion: 'reduce' });
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1, `${label}: ${a} != ${b}`);
const read = () => {
  const root = document.querySelector('[data-native-scroll],[data-scroll-template]');
  const brand = root.querySelector('[data-native-brand],[data-paged-brand]');
  const menu = root.querySelector('[data-native-menu],[data-scroll-menu]');
  const photo = brand?.querySelector('.cafe-a-cover-frame');
  const album = root.querySelector('[data-album-grid]');
  const columns = [...root.querySelectorAll('[data-native-column],[data-paged-column]')];
  const widths = album ? getComputedStyle(album).gridTemplateColumns.split(' ').map(Number.parseFloat) : columns.map(node => node.getBoundingClientRect().width);
  const bounds = node => node ? [node.getBoundingClientRect().x, node.getBoundingClientRect().y, node.getBoundingClientRect().width, node.getBoundingClientRect().height] : null;
  const style = getComputedStyle(root);
  const probe = root.querySelector('[data-native-measure],[data-measure-id]')?.parentElement;
  const header = root.querySelector('[data-native-header],[data-basic-top-row]');
  return {
    viewport: [innerWidth, innerHeight], equal: root.dataset.equalSideRail === 'true',
    structure: root.dataset.nativeShell || root.dataset.basicStructure,
    representative: bounds(brand), photo: bounds(photo), menu: bounds(menu), header: bounds(header),
    widths, probeWidth: probe?.getBoundingClientRect().width,
    outerWidth: document.documentElement.scrollWidth, outerHeight: document.documentElement.scrollHeight,
    bodyInset: parseFloat(style.paddingLeft), columnGap: parseFloat(style.columnGap),
    menuGap: parseFloat(getComputedStyle(menu).columnGap),
    dividerCount: root.querySelectorAll('[data-menu-column-divider]').length,
    order: [...root.querySelectorAll('[data-native-unit] [data-cafe-a-menu-name],[data-paged-block] [data-cafe-a-menu-name],[data-album-grid] [data-cafe-a-menu-name]')].map(node => node.textContent),
    font: getComputedStyle(root.querySelector('[data-native-unit] [data-cafe-a-menu-name],[data-paged-block] [data-cafe-a-menu-name],[data-album-grid] [data-cafe-a-menu-name]')).fontSize,
  };
};
async function settled() {
  await page.locator('[data-native-ready="true"],[data-paged-ready="true"]').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  let previous;
  for (let attempt = 0; attempt < 12; attempt++) {
    await page.waitForTimeout(180);
    const current = await page.evaluate(read);
    if (JSON.stringify(previous) === JSON.stringify(current)) {
      assert.equal(current.outerWidth, current.viewport[0], 'no horizontal page overflow');
      assert.equal(current.outerHeight, current.viewport[1], 'only menu content scrolls');
      assert.ok(current.widths.length >= 1 && current.widths.length <= 3);
      if (current.equal) {
        assert.ok(current.photo, 'enabled separate rail has a rendered photo');
        for (const width of current.widths) close(width, current.photo[2], 'representative and actual menu/card content');
        if (!page.url().includes('-album')) close(current.probeWidth, current.widths[0], 'hidden measurement matches actual track');
        assert.ok(current.widths.every(width => width >= 256 - 1), 'each additional track retains 16rem');
      }
      return current;
    }
    previous = current;
  }
  assert.fail('geometry did not settle');
}
async function open(design, width, height, layoutMode, extra = {}) {
  await page.setViewportSize({ width, height });
  const url = new URL(design.previewHref, base);
  for (const [key, value] of Object.entries({ device: width >= 1440 ? 'pc' : 'tablet', view: 'actual', embedded: '1', coverPreview: 'on', layoutMode, ...extra })) url.searchParams.set(key, value);
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  return settled();
}
try {
  const designs = catalogDesigns.filter(design => design.service === 'basic');
  for (const design of designs) for (const layoutMode of ['orderedBalancedFit', 'orderedFit']) {
    let original;
    for (const [width, height] of pcOnly ? [] : [[1180, 820], [820, 1180], [1920, 1080], [1180, 820]]) {
      const state = original ? (await page.setViewportSize({ width, height }), await settled()) : await open(design, width, height, layoutMode);
      if (!original) original = state;
      assert.deepEqual(state.order, original.order, 'resize preserves registered product order');
      assert.equal(state.font, original.font, 'resize retains reading typography within this device');
      if (width === 1180) assert.deepEqual(state, original, 'returning to the same size restores all geometry');
      results.push({ case: 'resize', design: design.id, layoutMode, ...state });
      if (design.id === 'cafe_sunday_line_a' && width === 820 && layoutMode === 'orderedBalancedFit') await page.screenshot({ path: `${output}/sunday-portrait.png` });
    }
    const pc = await open(design, 1920, 1080, layoutMode);
    results.push({ case: 'pc-device', design: design.id, layoutMode, ...pc });
    console.log(design.id, layoutMode, 'equal tracks / resize passed');
  }
  const topDesigns = designs.filter(design => ['basic-top-row', 'basic-top-row-left-logo', 'basic-top-row-album', 'cafe_sunday_line_a', 'cafe_van_gogh_a', 'cafe_mocha_forest_a'].includes(design.id));
  for (const design of pcOnly ? [] : topDesigns) {
    for (const designPreview of [undefined, JSON.stringify({ auxiliaryBackground: '#315143' })]) {
      const on = await open(design, 1180, 820, 'orderedFit', designPreview ? { designPreview } : {});
      assert.equal(on.equal, true);
      if (designPreview) assert.ok(on.representative[0] > 0, 'colored full-bleed header retains body inset');
      const url = new URL(page.url()); url.searchParams.set('coverPreview', 'off');
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
      const off = await settled();
      assert.equal(off.equal, false); assert.equal(off.photo, null);
      assert.ok(off.menu[2] > on.menu[2], 'cover off releases the representative width');
      for (let index = 0; index < on.header.length; index++) close(off.header[index], on.header[index], 'body rail does not move/resize header');
      results.push({ case: 'cover-off', design: design.id, colored: Boolean(designPreview), on, off });
    }
  }
  // Mobile delegates to the existing reading renderer; no desktop equal-track hook.
  for (const id of pcOnly ? [] : ['cafe_design_a', 'cafe_sunday_line_a', 'basic-top-row-album']) {
    const design = designs.find(design => design.id === id);
    await page.setViewportSize({ width: 390, height: 844 });
    const url = new URL(design.previewHref, base);
    for (const [key, value] of Object.entries({ device: 'mobile', view: 'actual', embedded: '1', coverPreview: 'on' })) url.searchParams.set(key, value);
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cafe-a-mobile-style="true"]').first().waitFor();
    assert.equal(await page.locator('[data-equal-side-rail]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    results.push({ case: 'mobile-independent', design: id });
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
} finally {
  await page.screenshot({ path: `${output}/last.png` });
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
console.log(JSON.stringify({ checked: results.length, errors, writes }));
