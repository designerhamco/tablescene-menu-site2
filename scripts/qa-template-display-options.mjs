import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { getTemplatePreviewOptionGroups } from '../lib/template-preview-options.ts';
import { DEFAULT_DESIGN_REVIEWS } from '../lib/menu-design-policy.ts';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const out = process.env.ORDER_QA_OUTPUT || '/private/tmp/template-display-options';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [], writes = [];
const keys = ['cafe_design_a', 'cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a', 'cafe_round_focus_a', 'fast_food_loop_bagel_a', 'restaurant_onue_a', 'dining_aube_table_a', 'dining_aube_table_b'];
const sizes = process.env.PREVIEW_OPTIONS_SMOKE === '1' ? [['tablet', 1440, 1100]] : [['pc', 1440, 1000], ['tablet', 1440, 1100], ['mobile', 1440, 1100]];
const url = (key, query) => `${base}/templates/${key}/preview?${new URLSearchParams(query)}`;
async function createPage() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed', '1'));
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
  return page;
}
async function frame(page, key) {
  await page.waitForFunction(() => {
    const iframe = document.querySelector('iframe');
    if (!iframe) return false;
    const outer = new URLSearchParams(location.search), inner = new URL(iframe.src).searchParams;
    return [...outer].every(([key, value]) => !(key.endsWith('Preview') || key === 'device' || key === 'lang') || inner.get(key) === value);
  });
  const iframe = await page.locator('iframe').elementHandle();
  const f = await iframe.contentFrame();
  assert.ok(f, 'menu iframe loaded');
  await f.waitForURL(new URL(await page.locator('iframe').getAttribute('src'), page.url()).href, { waitUntil: 'domcontentloaded' });
  await f.evaluate(() => document.fonts.ready);
  if (!key.startsWith('dining')) await f.locator('[data-native-ready=true], [data-paged-ready=true], [data-mobile-brand-fit=ready]').first().waitFor();
  else await f.locator('[data-aube-table]').waitFor();
  return f;
}
async function navigate(page, key, query) {
  await page.goto(url(key, query), { waitUntil: 'networkidle' });
  return frame(page, key);
}
const rendered = (f, selector) => f.locator(selector).filter({ visible: true }).count();
try {
  for (const key of keys) for (const [device, width, height] of sizes) {
    const page = await createPage();
    try {
      await page.setViewportSize({ width, height });
      const dining = key.startsWith('dining');
      const groups = getTemplatePreviewOptionGroups(key), choices = groups.flatMap(group => group.choices);
      const query = { device, callPreview: 'on', orderPreview: 'on' };
      let f = await navigate(page, key, query);
      assert.equal(await page.locator('[data-preview-display-options] input').count(), choices.length);
      assert.equal(await page.getByLabel('광고 보기', { exact: true }).isChecked(), false);
      assert.equal(await f.locator('[data-menu-advertisement-popup]').count(), 0);
      await page.getByRole('button', { name: /^보기 옵션/ }).click();
      assert.equal(await page.locator('[data-preview-display-options]').isVisible(), false);
      await page.getByRole('button', { name: /^보기 옵션/ }).click();
      const off = Object.fromEntries(choices.map(([key]) => [key, 'off']));
      f = await navigate(page, key, { ...query, ...off });
      assert.equal(await rendered(f, '.cafe-a-menu-meta,[data-cafe-a-menu-item] .cafe-a-menu-description,[data-cafe-a-category-description],.cafe-a-menu-item-image,.cafe-a-price-column-heading-label,[data-cafe-a-menu-badge],.aube-table-item-secondary,.aube-table-item-description,.aube-table-course-description,.aube-table-item-image,.aube-table-option-price,.aube-table-sold-out'), 0, 'OFF hides each optional content role');
      assert.ok(await rendered(f, '[data-cafe-a-menu-name],.aube-table-item h3') > 0, 'core menu names remain');
      const on = Object.fromEntries(choices.map(([key]) => [key, 'on']));
      f = await navigate(page, key, { ...query, ...on, popupPreview: 'off', logoPreview: 'off', ...(dining ? { coverPreview: 'off' } : {}) });
      if (!dining) {
        assert.ok(await rendered(f, '.cafe-a-menu-meta') > 0, 'secondary names return');
        assert.ok(await rendered(f, '[data-cafe-a-menu-item] .cafe-a-menu-description') > 0, 'descriptions return');
        assert.ok(await rendered(f, '.cafe-a-menu-item-image') > 0, 'registered or placeholder images appear');
      } else assert.equal(await f.locator('.aube-table-course[data-course-priced=true] .aube-table-item-image').count(), 0, 'course image exclusion survives');
      assert.ok(await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
      if (device === 'tablet') await page.screenshot({ path: `${out}/${key}.png` });
      results.push({ key, device, groups: groups.length, choices: choices.length, viewport: await f.evaluate(() => [innerWidth, innerHeight]) });
      console.log('PASS', key, device);
    } finally { await page.close(); }
  }
  // Real toolbar interactions, not only direct query loading.
  const page = await createPage();
  try {
    const key = 'cafe_sunday_line_a';
    await navigate(page, key, { device: 'tablet', orderPreview: 'on' });
    await page.getByLabel('보조 언어명 보기', { exact: true }).uncheck();
    await page.waitForURL(/secondaryNamesPreview=off/);
    await page.locator('iframe').waitFor();
    let f = await frame(page, key);
    assert.equal(await rendered(f, '.cafe-a-menu-meta'), 0);
    for (const name of ['모바일', 'PC']) {
      await page.getByRole('link', { name, exact: true }).click();
      await page.waitForURL(new RegExp(`device=${name === 'PC' ? 'pc' : 'mobile'}`));
      assert.equal(await page.getByLabel('보조 언어명 보기', { exact: true }).isChecked(), false);
      const href = await page.locator('[data-preview-detached-link]').getAttribute('href');
      assert.ok(href.includes('secondaryNamesPreview=off') && href.includes('orderPreview=on'));
    }
    await page.getByLabel('보조 언어명 보기', { exact: true }).check();
    await page.waitForURL(/secondaryNamesPreview=on/);
    f = await frame(page, key);
    assert.ok(await rendered(f, '.cafe-a-menu-meta') > 0);
    await page.getByLabel('광고 보기', { exact: true }).check();
    await page.waitForURL(/popupPreview=on/);
    f = await frame(page, key);
    await f.locator('[data-menu-advertisement-popup]').waitFor();
    assert.equal(await f.locator('[data-menu-advertisement-popup]').count(), 1);
    await page.getByLabel('광고 보기', { exact: true }).uncheck();
    await page.waitForURL(/popupPreview=off/);
    f = await frame(page, key);
    assert.equal(await f.locator('[data-menu-advertisement-popup]').count(), 0);
    results.push({ key, behavior: 'toggle-device-detached-restore' });
  } finally { await page.close(); }
  // Alternate locales use default-name copy in Basic; OFF must hide that too.
  for (const key of ['cafe_sunday_line_a', 'cafe_mocha_forest_a', 'cafe_round_focus_a']) for (const lang of ['en', 'zh', 'ja']) {
    const page = await createPage();
    try {
      let f = await navigate(page, key, { device: 'mobile', lang, secondaryNamesPreview: 'on' });
      assert.ok(await rendered(f, '.cafe-a-menu-meta:not([data-cafe-a-reference-copy])') > 0, 'alternate-locale secondary copy is shown');
      f = await navigate(page, key, { device: 'mobile', lang, secondaryNamesPreview: 'off' });
      assert.equal(await rendered(f, '.cafe-a-menu-meta:not([data-cafe-a-reference-copy])'), 0, 'alternate-locale secondary copy is hidden');
      results.push({ key, lang, behavior: 'locale-secondary-toggle' });
    } finally { await page.close(); }
  }
  // All neutral designs retain their prior panel and capability exclusions.
  for (const design of DEFAULT_DESIGN_REVIEWS) {
    const page = await createPage();
    try {
      await navigate(page, design.renderer, { design: design.id, device: 'mobile' });
      assert.equal(await page.getByLabel('로고 보기', { exact: true }).isChecked(), false);
      assert.equal(await page.getByLabel('광고 보기', { exact: true }).isChecked(), false);
      if (design.itemLayout === 'album' && design.layout.startsWith('basic')) assert.equal(await page.getByLabel('가격 옵션 보기', { exact: true }).count(), 0);
      results.push({ design: design.id, behavior: 'neutral-regression' });
    } finally { await page.close(); }
  }
} finally {
  await browser.close();
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
assert.deepEqual(errors, []); assert.deepEqual(writes, []);
console.log(JSON.stringify({ checked: results.length, errors: errors.length, writes: writes.length }));
