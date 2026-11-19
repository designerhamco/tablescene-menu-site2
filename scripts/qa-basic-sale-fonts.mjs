// Run with node --import tsx scripts/qa-basic-sale-fonts.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { KOREAN_FONT_OPTIONS } from '../lib/font-options.ts';
import { getBasicTimeSaleFont } from '../lib/basic-time-sale-font.ts';

const base = process.env.SALE_FONT_QA_BASE || 'http://127.0.0.1:3037';
const output = process.env.SALE_FONT_QA_OUTPUT || '/private/tmp/basic-sale-fonts';
const selected = process.env.SALE_FONT_QA_KEYS?.split(',');
const fonts = KOREAN_FONT_OPTIONS.filter(font => !selected || selected.includes(font.value));
const cases = fonts.flatMap(font => [
  { font, design: 'basic-top-row', device: 'pc', width: 1440, height: 900 },
  { font, design: 'basic-first-column-album', device: 'mobile', width: 390, height: 844 },
]);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], failures = [], errors = [];
try {
  await Promise.all(Array.from({ length: 3 }, async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    try {
      for (let entry; (entry = cases.shift());) {
        const label = [entry.font.value, entry.design, entry.device].join('/');
        try {
          await page.setViewportSize({ width: entry.width, height: entry.height });
          const expected = getBasicTimeSaleFont(entry.font.value);
          const family = expected.family.match(/^["']([^"']+)/)[1];
          const query = new URLSearchParams({
            design: entry.design, device: entry.device, view: 'actual',
            designPreview: JSON.stringify({ fontFamily: { ko: entry.font.value, en: 'tenor-sans' } }),
          });
          assert.equal((await page.goto(base + '/templates/cafe_design_a/preview?' + query, { waitUntil: 'networkidle' })).status(), 200);
          await page.locator('.cafe-a-time-sale-time-text:visible').first().waitFor();
          const measured = await page.evaluate(async ({ family, weight }) => {
            await document.fonts.ready;
            const loaded = await document.fonts.load(`${weight} 16px "${family}"`, '매일 오전 11시 00:59:59');
            const visible = element => element.checkVisibility({ checkVisibilityCSS: true }) && !element.closest('[inert],[aria-hidden=true]');
            const sales = [...document.querySelectorAll('.cafe-a-time-sale-time-text')].filter(visible);
            const text = sales.find(element => element.textContent.includes('매일')).querySelector('.cafe-a-script-ko');
            text.setAttribute('data-sale-font-probe', '');
            return {
              sales: sales.map(element => ({
                family: getComputedStyle(element).fontFamily,
                weight: getComputedStyle(element).fontWeight,
                synthesis: getComputedStyle(element).fontSynthesis,
                children: [...element.querySelectorAll('span')].map(child => ({ family: getComputedStyle(child).fontFamily, weight: getComputedStyle(child).fontWeight })),
              })),
              faces: loaded.map(face => ({ family: face.family, weight: face.weight, status: face.status })),
              normalNames: [...document.querySelectorAll('[data-cafe-a-menu-name]')].filter(visible).map(element => getComputedStyle(element).fontFamily),
              viewport: [innerWidth, innerHeight],
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
            };
          }, { family, weight: expected.weight });
          assert.deepEqual(measured.viewport, [entry.width, entry.height]);
          assert.equal(measured.overflow, false);
          assert.ok(measured.faces.length > 0, 'matching font face loads');
          assert.ok(measured.faces.every(face => face.status === 'loaded'), 'font files finish loading');
          for (const sale of measured.sales) {
            assert.equal(sale.weight, String(expected.weight), 'maximum provided weight');
            assert.ok(sale.family.includes(family), 'selected promotion family');
            assert.equal(sale.synthesis, 'none', 'single-weight faces keep their real weight');
            for (const child of sale.children) {
              assert.equal(child.weight, sale.weight);
              assert.ok(child.family.includes(family));
            }
          }
          assert.ok(measured.normalNames.every(family => !family.includes('ArtiMenuTimeSale')), 'extra faces are specific to promotion copy');
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('DOM.enable');
          await cdp.send('CSS.enable');
          const { root } = await cdp.send('DOM.getDocument');
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-sale-font-probe]' });
          const { fonts: platformFonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
          assert.ok(platformFonts.some(font => font.glyphCount > 0), 'selected text has a rendered font');
          if (expected.asset) assert.ok(platformFonts.some(font => font.isCustomFont && font.glyphCount > 0), 'extra maximum-weight face is actually used');
          await cdp.detach();
          results.push({ label, weight: expected.weight, family, measured, platformFonts });
          console.log('PASS', label, expected.weight);
        } catch (error) {
          failures.push({ label, error: error.message });
          console.log('FAIL', label, error.message);
        }
      }
    } finally { await page.close(); }
  }));
} finally {
  await browser.close();
  await fs.writeFile(output + '/report.json', JSON.stringify({ base, results, failures, errors }, null, 2));
}
assert.deepEqual(failures, []);
assert.deepEqual(errors, []);
console.log(JSON.stringify({ checked: results.length, failures, errors }));
