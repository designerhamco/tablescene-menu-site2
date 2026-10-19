import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/default-design-options';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const p = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
p.on('pageerror', e => errors.push(e.message));
await p.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : (writes.push(r.request().url()), r.abort()));
async function frameReady(design) {
  const frame = p.frameLocator('iframe');
  await frame.locator(`[data-default-design="${design}"]`).waitFor();
  if (design.startsWith('basic')) await frame.locator('[data-paged-ready="true"],[data-mobile-brand-fit="ready"]').first().waitFor();
  else await frame.locator('.aube-table-stage .cafe-a-script-ko,.aube-table-stage .cafe-a-script-en').first().waitFor();
  await frame.locator('body').evaluate(() => document.fonts.ready);
  return frame;
}
async function toggle(design, key, label, value) {
  await p.getByRole('checkbox', { name: label + ' 보기', exact: true }).setChecked(value);
  await p.waitForFunction(([k, v]) => new URL(document.querySelector('iframe').src).searchParams.get(k) === v, [key, value ? 'on' : 'off']);
  const frame = await frameReady(design);
  assert.equal(new URL(await p.locator('[data-preview-detached-link]').getAttribute('href'), base).searchParams.get(key), value ? 'on' : 'off');
  return frame;
}
try {
  for (const [key, design] of [['cafe_design_a', 'basic-first-column'], ['dining_aube_table_a', 'dining-full-page']]) {
    const basic = design.startsWith('basic');
    await p.goto(`${base}/templates/${key}/preview?design=${design}&device=tablet&orderPreview=on&callPreview=on`, { waitUntil: 'domcontentloaded' });
    let frame = await frameReady(design);
    const guide = p.locator('[data-preview-guide-variant]');
    if (await guide.isVisible()) await guide.getByRole('button', { name: '닫기', exact: true }).click();
    assert.equal(await p.locator('[data-preview-display-options] input:checked').count(), basic ? 4 : 2);
    if (basic) {
      const borders = await frame.locator('[data-cafe-a-category-heading]').filter({ visible: true }).evaluateAll(els => els.map(e => getComputedStyle(e).borderBottomWidth));
      assert.ok(borders.length); assert.ok(borders.every(b => b === '0px'));
      assert.ok(await frame.locator('[data-paged-block="default-text"]').count());
      frame = await toggle(design, 'widgetsPreview', '위젯', false);
      assert.equal(await frame.locator('[data-paged-block="default-text"],[data-paged-block="default-image"]').count(), 0);
      frame = await toggle(design, 'featuredPreview', '대표 상품', false);
      assert.equal(await frame.locator('[data-cafe-a-featured-title]').count(), 0);
      assert.ok(await frame.locator('[data-cafe-a-cover-image]').filter({ visible: true }).count());
      frame = await toggle(design, 'featuredPreview', '대표 상품', true);
      assert.ok(await frame.locator('[data-cafe-a-featured-title]').filter({ visible: true }).count());
    }
    frame = await toggle(design, 'coverPreview', basic ? '대표 영역' : '커버 페이지', false);
    assert.equal(await frame.locator(basic ? '[data-cafe-a-cover-image]' : '.aube-table-cover').count(), 0);
    if (basic) assert.equal(await p.getByRole('checkbox', { name: '대표 상품 보기', exact: true }).isDisabled(), true);
    frame = await toggle(design, 'imagesPreview', '상품 이미지', false);
    if (!basic) {
      await frame.getByRole('button', { name: /A La Carte.*페이지로 이동/ }).click();
      await frame.getByRole('heading', { name: 'A La Carte Menu', exact: true }).waitFor();
    }
    assert.equal(await frame.locator('.cafe-a-menu-item-image,.aube-table-item-image').count(), 0);
    const fonts = await frame.locator('.cafe-a-script-en,.cafe-a-script-ko').filter({ visible: true }).evaluateAll(els => els.map(e => getComputedStyle(e).fontFamily.split(',')[0]));
    assert.ok(fonts.length && fonts.every(f => f.includes('Pretendard')), JSON.stringify([...new Set(fonts)]));
    await p.getByRole('link', { name: '모바일', exact: true }).click();
    await p.waitForFunction(() => new URL(document.querySelector('iframe').src).searchParams.get('device') === 'mobile');
    frame = await frameReady(design);
    assert.equal(await frame.locator('.cafe-a-menu-item-image,.aube-table-item-image').count(), 0);
    const url = new URL(await p.locator('iframe').getAttribute('src'), base);
    for (const name of ['coverPreview', 'imagesPreview']) assert.equal(url.searchParams.get(name), 'off');
    frame = await toggle(design, 'coverPreview', basic ? '대표 영역' : '커버 페이지', true);
    assert.ok(await frame.locator(basic ? '[data-cafe-a-cover-image]' : '.aube-table-cover').filter({ visible: true }).count());
    frame = await toggle(design, 'imagesPreview', '상품 이미지', true);
    if (!basic) {
      await frame.getByRole('button', { name: /A La Carte.*페이지로 이동/ }).click();
      await frame.getByRole('heading', { name: 'A La Carte Menu', exact: true }).waitFor();
    }
    assert.ok(await frame.locator('.cafe-a-menu-item-image,.aube-table-item-image').count() > 0);
    await p.screenshot({ path: `${output}/${design}-toolbar.png` });
    results.push({ kind: 'options-fonts-device-persistence', design });
  }
  // The shared language popup must fit real mobile viewports in every skin,
  // with the original right trigger as well as the Call bar's left trigger.
  for (const key of ['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','restaurant_onue_a','fast_food_loop_bagel_a','dining_aube_table_a','dining_aube_table_b']) for (const call of [false, true]) {
    await p.setViewportSize({ width: 320, height: 844 });
    await p.goto(`${base}/templates/${key}/preview?view=actual&device=mobile${call ? '&callPreview=on' : ''}`, { waitUntil: 'networkidle' });
    const trigger = p.locator('button[aria-haspopup="menu"]').filter({ visible: true }).first();
    await trigger.click();
    const menu = p.locator('[data-language-menu-surface]').filter({ visible: true });
    await menu.waitFor();
    const r = await menu.boundingBox();
    assert.ok(r.x >= 7 && r.x + r.width <= 313, `${key} ${call} ${JSON.stringify(r)}`);
    await p.screenshot({ path: `${output}/${key}-${call}-language.png` });
    await p.keyboard.press('Escape');
    assert.equal(await menu.count(), 0);
    results.push({ kind: 'language-bounds', key, call, viewport: [320, 844] });
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
} finally { await p.screenshot({ path: `${output}/last.png` }); await browser.close(); await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2)); }
console.log(JSON.stringify({ checked: results.length, errors, writes }));
