import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3043';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/call-button-policy';
const lang = process.env.QA_LANG || 'ko';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], failures = [], errors = [], writes = [];
const basic = ['cafe_design_a', 'cafe_mocha_forest_a', 'fast_food_loop_bagel_a', 'cafe_round_focus_a', 'cafe_van_gogh_a', 'cafe_sunday_line_a', 'restaurant_onue_a'];
const sizes = [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180], ['mobile', 320, 844], ['mobile', 430, 932]];
const cases = basic.flatMap(key => sizes.map(([device, width, height]) => ({ key, device, width, height })));
for (const key of ['dining_aube_table_a', 'dining_aube_table_b']) for (const [device, width, height] of sizes) cases.push({ key, device, width, height });
const callSelector = '[data-native-actions] button:first-child, [data-scroll-call], [data-one-page-call-button="mobile-bottom"], [data-dining-floating-call], [data-table-mobile-dock] button:first-child';
const buttonStyle = button => button.evaluate(e => {
  const s = getComputedStyle(e), r = e.getBoundingClientRect();
  return { width: r.width, height: r.height, radius: s.borderRadius, bg: s.backgroundColor, ink: s.color, border: s.borderColor };
});
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.querySelector('[data-native-ready="false"]') && !document.querySelector('[data-paged-ready="false"]') && document.querySelectorAll('.aube-table-stage').length <= 1 && !document.getAnimations().some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity));
  await page.waitForTimeout(250);
}
try {
  for (const c of cases.filter(c => (!process.env.QA_KEYS || process.env.QA_KEYS.split(',').includes(c.key)) && (!process.env.QA_WIDTHS || process.env.QA_WIDTHS.split(',').includes(String(c.width))))) {
    const p = await browser.newPage({ viewport: { width: c.width, height: c.height }, reducedMotion: 'reduce' });
    p.on('pageerror', e => errors.push({ ...c, message: e.message }));
    await p.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : (writes.push(r.request().url()), r.abort()));
    try {
      await p.goto(`${base}/templates/${c.key}/preview?` + new URLSearchParams({ device: c.device, view: 'actual', callPreview: 'on', lang }), { waitUntil: 'networkidle' });
      await settle(p);
      assert.deepEqual(await p.evaluate(() => [innerWidth, innerHeight]), [c.width, c.height]);
      const call = p.locator(callSelector).filter({ visible: true }).first();
      await call.waitFor();
      const initial = await buttonStyle(call);
      const dining = c.key.startsWith('dining_');
      if (dining && c.device !== 'mobile') {
        assert.equal(initial.radius, '50%');
        assert.equal(initial.width, initial.height);
      } else {
        assert.equal(initial.radius, '8px');
        assert.ok(initial.width > initial.height * 2, JSON.stringify(initial));
      }
      await call.click();
      await p.getByRole('dialog').waitFor();
      await p.getByRole('dialog').locator('button:has(.lucide-x)').click();
      await p.screenshot({ path: `${output}/${c.key}-${c.width}-call-only.png` });
      if (dining) {
        const tabs = p.locator('.aube-table-pagination-dots button,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({ visible: true });
        const count = await tabs.count();
        for (const index of [...Array(count - 1)].map((_, i) => i + 1).concat(0)) {
          await tabs.nth(index).click();
          await settle(p);
          const next = await buttonStyle(call);
          assert.deepEqual([next.bg, next.ink, next.border], [initial.bg, initial.ink, initial.border], `page ${index} retains cover palette`);
        }
        // Dining category edits are independent; the page-title accent updates actions.
        await p.locator('.aube-table-root').evaluate(e => e.style.setProperty('--menu-design-category-ink', '#70528e'));
        await settle(p);
        const categoryOnly = await buttonStyle(call);
        assert.deepEqual([categoryOnly.bg, categoryOnly.ink, categoryOnly.border], [initial.bg, initial.ink, initial.border]);
        await p.locator('.aube-table-root').evaluate(e => e.style.setProperty('--menu-text-pageTitle', '#70528e'));
        await p.waitForFunction(() => document.querySelector('[data-menu-interaction-shell]').style.getPropertyValue('--menu-call-circle-bg') === '#70528e');
        const custom = await buttonStyle(call);
        await tabs.nth(1).click(); await settle(p);
        const next = await buttonStyle(call);
        assert.deepEqual([next.bg, next.ink, next.border], [custom.bg, custom.ink, custom.border]);
      } else if (c.device !== 'mobile') {
        // Turning Order on must not change Call's shape or palette.
        await p.goto(`${base}/templates/${c.key}/preview?` + new URLSearchParams({ device: c.device, view: 'actual', callPreview: 'on', orderPreview: 'on', lang }), { waitUntil: 'networkidle' });
        await settle(p);
        const both = await buttonStyle(p.locator(callSelector).filter({ visible: true }).first());
        assert.equal(both.radius, initial.radius);
        assert.deepEqual([both.bg, both.ink, both.border], [initial.bg, initial.ink, initial.border]);
      }
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await p.screenshot({ path: `${output}/${c.key}-${c.width}.png` });
      results.push({ ...c, lang, initial });
      console.log('PASS', c.key, c.width);
    } catch (e) {
      failures.push({ ...c, error: e.message });
      console.log('FAIL', c.key, c.width, e.message.split('\n')[0]);
      await p.screenshot({ path: `${output}/${c.key}-${c.width}-failure.png` });
    } finally { await p.close(); }
  }
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, failures, errors, writes }, null, 2));
}
assert.deepEqual(failures, []);
assert.deepEqual(errors, []);
assert.deepEqual(writes, []);
console.log(JSON.stringify({ checked: results.length, failures, errors, writes }));
