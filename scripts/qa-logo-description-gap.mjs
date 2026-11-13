import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { catalogDesigns } from '../lib/catalog-designs.ts';

const base = process.env.LOGO_GAP_QA_BASE || 'http://localhost:3000';
const output = process.env.LOGO_GAP_QA_OUTPUT || '/private/tmp/artimenu-logo-description-gap';
const selected = process.env.LOGO_GAP_QA_FILTER?.split(',');
const devices = process.env.LOGO_GAP_QA_DEVICES?.split(',');
const designs = catalogDesigns.filter(d => d.service !== 'display' && (!selected || selected.includes(d.id)));
const sizes = (process.env.LOGO_GAP_QA_RESPONSIVE ? [['mobile', 320, 844], ['mobile', 430, 932], ['tablet', 820, 1180]] : [['mobile', 390, 844], ['pc', 1440, 900], ['tablet', 1180, 820]]).filter(([device]) => !devices || devices.includes(device));
const browser = await chromium.launch();
const results = [], errors = [], writes = [];
await mkdir(output, { recursive: true });

function geometry() {
  const visible = e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert], [aria-hidden="true"]');
  const description = [...document.querySelectorAll('[data-menu-store-description], .cafe-a-store-description, .cafe-a-topline-description, .aube-table-cover-description')].find(e => visible(e) && !e.closest('[data-cafe-a-footer-info], [data-native-notices], [data-paged-notices]'));
  if (!description) throw new Error('No visible store description');
  const logo = [...document.querySelectorAll('[data-menu-logo-slot], [data-menu-brand-logo]')].find(visible);
  const previous = description.previousElementSibling;
  const stackedLogo = Boolean(logo && (previous === logo || (previous?.hasAttribute('data-menu-brand-heading') && previous.contains(logo))));
  const artwork = logo?.querySelector('[data-menu-logo-box], img') ?? logo;
  const box = artwork?.getBoundingClientRect();
  const desc = description.getBoundingClientRect(), style = getComputedStyle(description);
  return { viewport: [innerWidth, innerHeight], hasLogo: Boolean(logo), stackedLogo,
    hasDescriptionHook: description.hasAttribute('data-menu-store-description'), padding: parseFloat(style.paddingTop),
    gap: box ? desc.top + parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth) - box.bottom : null,
    ratio: box ? box.width / box.height : null, font: [style.fontFamily, style.fontSize, style.lineHeight, style.color],
    description: { x: desc.x, top: desc.top, width: desc.width, height: desc.height },
    topRow: Boolean(description.closest('[data-native-header], [data-basic-top-row]')),
  };
}
async function settle(page, logo) {
  await page.locator('.menu-typography').first().waitFor();
  if (await page.locator('.aube-table-root').count()) await page.waitForFunction(() => {
    const root = document.querySelector('.aube-table-root');
    return root && getComputedStyle(root).getPropertyValue('--aube-type-item-body').trim() && getComputedStyle(document.querySelector('.aube-table-cover')).display === 'grid';
  });
  await page.evaluate(() => document.fonts.ready);
  if (await page.locator('[data-native-ready], [data-paged-ready]').count()) await page.locator('[data-native-ready=true], [data-paged-ready=true]').first().waitFor();
  if (logo) {
    await page.locator('[data-menu-logo-slot], [data-menu-brand-logo]').filter({ visible: true }).first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-menu-logo-slot]')].filter(e => e.getBoundingClientRect().width && !e.closest('[inert]')).every(e => e.dataset.menuLogoReady === 'true' && e.dataset.menuLogoMeasured === 'true'));
  }
  await page.waitForTimeout(200);
}
async function verify(design, device, width, height) {
  const id = `${design.id}/${device}/${width}x${height}`;
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push({ id, error: error.message }));
  await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
  try {
    const modes = [];
    for (const logo of [false, true]) {
      const query = new URLSearchParams({ device, view: 'actual', embedded: '1', coverPreview: 'on', callPreview: process.env.LOGO_GAP_QA_CALL || 'off', logoPreview: logo ? 'on' : 'off' });
      if (design.kind === 'standard') query.set('design', design.id);
      const response = await page.goto(`${base}/templates/${design.templateKey}/preview?${query}`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, id);
      await settle(page, logo);
      const baselineStyle = await page.addStyleTag({ content: '.menu-typography { --menu-logo-description-gap-extra: 0rem !important; }' });
      await page.waitForTimeout(100);
      const before = await page.evaluate(geometry);
      await baselineStyle.evaluate(e => e.remove());
      await page.waitForTimeout(200);
      const after = await page.evaluate(geometry);
      assert.deepEqual(after.viewport, [width, height], id);
      assert.deepEqual(after.font, before.font, `${id}: typography and ink stay unchanged`);
      assert.equal(after.hasLogo, logo, `${id}: requested identity type`);
      const expected = after.stackedLogo ? 4 : 0;
      assert.ok(Math.abs(after.padding - before.padding - expected) < .1, `${id}/${logo}: expected ${expected}px bonus, got ${after.padding - before.padding}`);
      if (expected) {
        assert.equal(after.hasDescriptionHook, true, `${id}: shared copy hook`);
        assert.ok(Math.abs(after.gap - before.gap - expected) < .75, `${id}: actual image-to-copy gap`);
        assert.ok(Math.abs(after.ratio - before.ratio) < .001, `${id}: artwork ratio`);
      } else {
        assert.ok(Math.abs(after.description.height - before.description.height) < 1, `${id}: unrelated text/header height`);
      }
      modes.push({ logo, stacked: after.stackedLogo, beforeGap: before.gap, afterGap: after.gap, bonus: after.padding - before.padding });
      if (logo && device === 'mobile' && ['cafe_mocha_forest_a', 'cafe_sunday_line_a'].includes(design.id)) await page.screenshot({ path: `${output}/${design.id}-mobile.png` });
    }
    const result = { id, modes }; results.push(result); console.log(JSON.stringify(result));
  } finally { await page.close(); }
}
try {
  const queue = designs.flatMap(design => sizes.map(([device, width, height]) => [design, device, width, height]));
  await Promise.all(Array.from({ length: 3 }, async () => { while (queue.length) await verify(...queue.shift()); }));
  const fallbackDesign = catalogDesigns.find(d => d.id === 'basic-first-column');
  const fixtureUrl = `${base}/templates/${fallbackDesign.templateKey}/preview?device=mobile&view=actual&embedded=1&design=basic-first-column&logoPreview=on`;
  // Missing copy must not leave an optical-clearance spacer behind.
  const missing = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await missing.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });
  await settle(missing, true);
  await missing.locator('[data-menu-store-description]').filter({ visible: true }).first().evaluate(e => e.remove());
  const logoBox = () => {
    const logo = [...document.querySelectorAll('[data-menu-logo-slot]')].find(e => e.getBoundingClientRect().width && !e.closest('[inert]'));
    const box = logo.getBoundingClientRect(), parent = logo.parentElement.getBoundingClientRect();
    return [box.width, box.height, parent.height];
  };
  const missingBefore = await missing.evaluate(logoBox);
  await missing.addStyleTag({ content: '.menu-typography { --menu-logo-description-gap-extra: 0rem !important; }' });
  assert.deepEqual(await missing.evaluate(logoBox), missingBefore);
  results.push({ id: 'missing-description/mobile', unchangedLogoAndParent: true });
  await missing.close();
  // A failed logo uses the real text fallback, so it cannot retain the bonus.
  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await fallback.route('**/placeholders/starter/default-logo.svg', route => route.abort());
  await fallback.goto(fixtureUrl, { waitUntil: 'domcontentloaded' });
  await settle(fallback, false);
  await expect(fallback.locator('[data-menu-logo-slot]').filter({ visible: true })).toHaveCount(0);
  await fallback.locator('[data-mobile-brand-fit=ready]').filter({ visible: true }).waitFor();
  const textFallback = await fallback.evaluate(geometry);
  assert.equal(textFallback.hasLogo, false); assert.equal(textFallback.padding, 0);
  results.push({ id: 'failed-logo/mobile', bonus: textFallback.padding });
  await fallback.close();
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ base, passed: results.length, results, errors, writes }, null, 2));
  console.log(JSON.stringify({ passed: results.length, errors, writes }));
} finally { await browser.close(); }
