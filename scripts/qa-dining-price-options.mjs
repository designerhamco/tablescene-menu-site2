import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/dining-price-options';
const baseline = process.env.DINING_PRICE_BASELINE;
const capture = process.env.DINING_PRICE_CAPTURE === '1';
await fs.mkdir(output, { recursive: true });
const previous = baseline ? JSON.parse(await fs.readFile(baseline, 'utf8')).results : [];
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const p = await browser.newPage({ reducedMotion: 'reduce' });
p.on('pageerror', e => errors.push(e.message));
await p.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : (writes.push(r.request().url()), r.abort()));
const sizes = [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180], ...[320, 390, 430, 820].map(w => ['mobile', w, 932])];
async function drinkPage(target, key, design) {
  await target.getByRole('button', { name: key.endsWith('_b') ? 'Wine & Pairing' : 'Drink Menu 페이지로 이동', exact: true }).filter({ visible: true }).click();
  await target.locator('body').evaluate(() => document.fonts.ready);
  await target.locator('body').evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
  await target.getByRole('heading', { name: key.endsWith('_b') ? 'Pierre Gimonnet Brut' : design ? '샴페인' : 'Champagne', exact: true }).waitFor();
}
const geometry = () => {
  const rect = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.right, bottom: b.bottom }; };
  const root = document.querySelector('.aube-table-root');
  return { viewport: [innerWidth, innerHeight], outerWidth: document.documentElement.scrollWidth,
    courseGap: getComputedStyle(root).getPropertyValue('--aube-space-course').trim(),
    items: [...root.querySelectorAll('.aube-table-item')].map(item => ({
      name: item.querySelector('h3').textContent, item: rect(item), title: rect(item.querySelector('h3')),
      secondary: rect(item.querySelector(".aube-table-item-secondary")),
      price: rect(item.querySelector('.aube-table-item-price')), text: item.querySelector('.aube-table-item-price')?.textContent,
      purchase: rect(item.querySelector('.aube-table-item-purchase')), button: rect(item.querySelector('[data-menu-order-add]')),
      direct: !!item.closest('.aube-table-direct-items'), font: getComputedStyle(item.querySelector('h3')).font,
      pairs: [...item.querySelectorAll('.aube-table-option-price')].map(rect),
    })) };
};
try {
  for (const [key, design] of [['dining_aube_table_a', ''], ['dining_aube_table_b', ''], ['dining_aube_table_a', 'dining-full-page']]) {
    for (const [device, width, height] of sizes) {
      const id = `${design || key}-${device}-${width}`;
      await p.setViewportSize({ width, height });
      await p.goto(`${base}/templates/${key}/preview?` + new URLSearchParams({ view: 'actual', device, design, callPreview: 'on', orderPreview: 'on' }), { waitUntil: 'networkidle' });
      await drinkPage(p, key, design);
      const value = await p.evaluate(geometry);
      assert.deepEqual(value.viewport, [width, height]);
      assert.equal(value.outerWidth, width);
      const direct = value.items.filter(i => i.direct);
      assert.equal(direct.length, 2, 'pairings remain standalone items');
      if (key.endsWith('_a')) assert.deepEqual(direct.map(i => i.text.replace(/\D/g, '')), ['120000', '65000']);
      if (!capture) {
        const champagne = value.items.find(i => i.name === (key.endsWith('_b') ? 'Pierre Gimonnet Brut' : design ? '샴페인' : 'Champagne'));
        assert.equal(champagne.pairs.length, 2);
        for (const item of value.items.filter(i => i.pairs.length)) {
          assert.ok(item.button.right <= item.item.right + 1);
          assert.ok(item.button.x >= item.price.right - 1, 'add remains next to option prices');
          assert.ok(item.pairs.every((pair, i, rows) => i === 0 || pair.y >= rows[i - 1].bottom + 3), 'one option per line');
          if (device === 'mobile') {
            if (item.secondary) {
              assert.ok(item.secondary.y >= item.purchase.bottom, 'secondary name follows option prices');
            }
            assert.ok(item.purchase.y >= item.title.bottom + 3, 'options start on their own row below the name');
            assert.ok(item.title.width >= item.purchase.width - 1, 'option prices no longer squeeze the name');
            assert.ok(item.pairs.every(pair => pair.right <= item.price.right + 1));
          }
        }
        const before = previous.find(r => r.id === id)?.value;
        const readingScale = Number(process.env.DINING_READING_SCALE || 1);
        if (before && readingScale !== 1) {
          for (const [index, item] of value.items.entries()) {
            const fontSize = font => Number(font.match(/([\d.]+)px/)[1]);
            const ratio = fontSize(item.font) / fontSize(before.items[index].font);
            assert.ok(Math.abs(ratio - (device === 'mobile' ? 1 : readingScale)) < .002, 'requested reading gain is PC/tablet only');
          }
        }
        if (before && device !== 'mobile' && readingScale === 1) {
          assert.deepEqual(value.viewport, before.viewport);
          assert.equal(value.items.length, before.items.length);
          for (const [index, item] of value.items.entries()) for (const [key, actual] of Object.entries(item)) {
            if (key === 'pairs' || (key === 'secondary' && !before.items[index].secondary)) continue;
            const expected = before.items[index][key];
            if (actual && typeof actual === 'object') {
              // Splitting the same inline string can round font advances by 1/64px.
              for (const [axis, px] of Object.entries(actual)) assert.ok(Math.abs(px - expected[axis]) <= 0.1, `${id} ${item.name} ${key}.${axis}: ${px} vs ${expected[axis]}`);
            } else assert.deepEqual(actual, expected, 'PC/tablet text and typography are unchanged');
          }
        }
        if (before) assert.equal(value.courseGap, before.courseGap, 'standalone section spacing token is unchanged');
      }
      results.push({ id, value });
      if (design || device === 'mobile') await p.screenshot({ path: `${output}/${id}.png` });
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
} finally { await browser.close(); await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2)); }
console.log(JSON.stringify({ checked: results.length, errors, writes }));
