import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/menu-heading-price-spacing';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const p = await browser.newPage({ reducedMotion: 'reduce' });
p.on('pageerror', error => errors.push(error.message));
await p.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
try {
  for (const design of ['', 'basic-first-column']) {
    for (const [device, width, height] of [['pc', 1920, 1080], ['tablet', 1180, 820], ...[320, 390, 430, 820].map(width => ['mobile', width, 932])]) {
      await p.setViewportSize({ width, height });
      await p.goto(`${base}/templates/cafe_design_a/preview?` + new URLSearchParams({ view: 'actual', embedded: '1', device, design, callPreview: 'on', orderPreview: 'on' }), { waitUntil: 'networkidle' });
      await p.locator(device === 'mobile' ? '[data-mobile-brand-fit="ready"]' : '[data-paged-ready="true"]').first().waitFor();
      await p.evaluate(() => document.fonts.ready);
      const metrics = await p.evaluate(mobile => {
        const root = document.querySelector(mobile ? '[data-cafe-a-mobile-style="true"]' : '[data-scroll-template]');
        const visible = el => getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
        const rect = el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, center: (b.left + b.right) / 2 }; };
        const headings = mobile
          ? [...root.querySelectorAll('.cafe-a-category-heading')].filter(visible).map(el => parseFloat(getComputedStyle(el).marginBottom))
          : [...root.querySelectorAll('[data-paged-column] [data-kind="heading"]')].map(el => parseFloat(getComputedStyle(el).paddingBottom));
        const items = mobile
          ? [...root.querySelectorAll('[data-cafe-a-item-stack]')].filter(visible).slice(0, -1).map(el => parseFloat(getComputedStyle(el).marginBottom))
          : [...root.querySelectorAll('[data-paged-column] [data-kind="item"][data-next-kind="item"]')].map(el => parseFloat(getComputedStyle(el).paddingBottom));
        const rails = mobile ? [...root.querySelectorAll('.cafe-a-price-column-header')].filter(visible).map(header => {
          const category = header.closest('[data-cafe-a-category-block]');
          const labels = [...header.querySelectorAll('.cafe-a-price-column-heading-label')].map(rect);
          const cells = [...category.querySelector('.cafe-a-price-columns-grid').children].map(cell => rect(cell.querySelector(':scope > .cafe-a-menu-price')));
          return { labels, cells, gaps: labels.slice(1).map((label, i) => label.left - labels[i].right) };
        }) : [];
        return { viewport: [innerWidth, innerHeight], outerWidth: document.documentElement.scrollWidth, headings, items, rails,
          categoryDescriptions: [...root.querySelectorAll('[data-cafe-a-category-description]')].filter(visible).length,
          columnCount: root.querySelectorAll('[data-paged-column]').length,
          section: getComputedStyle(root).getPropertyValue('--cafe-a-mobile-section-gap').trim(),
          cover: root.querySelector('[data-cafe-a-cover-image] img, img[data-cafe-a-cover-image]')?.getAttribute('src') };
      }, device === 'mobile');
      assert.deepEqual(metrics.viewport, [width, height]);
      assert.equal(metrics.outerWidth, width);
      assert.ok(metrics.headings.length);
      if (device === 'mobile') {
        assert.ok(metrics.headings.every(gap => gap === 26));
        assert.ok(metrics.items.every(gap => gap === 20 || gap === 0));
        assert.equal(metrics.section, '3rem');
        for (const rail of metrics.rails) {
          assert.ok(rail.gaps.every(gap => gap >= 9.9), JSON.stringify(rail));
          rail.labels.forEach((label, i) => assert.ok(Math.abs(label.center - rail.cells[i].center) < 1, 'option labels and prices share column centers'));
          assert.ok(rail.labels.at(-1).right <= width);
        }
        if (design) assert.deepEqual(metrics.rails.map(rail => rail.labels.length), [2, 3]);
        if (design) await p.locator('[data-cafe-a-category-block]').filter({ visible: true, has: p.locator('.cafe-a-category-title', { hasText: 'ADE' }) }).scrollIntoViewIfNeeded();
      } else {
        assert.ok(metrics.headings.every(gap => gap >= Math.max(...metrics.items) - .1));
        assert.ok(metrics.columnCount >= 1 && metrics.columnCount <= 3);
      }
      if (design) assert.equal(metrics.categoryDescriptions, 2);
      results.push({ design, device, ...metrics });
      await p.screenshot({ path: `${output}/${design || 'matcha'}-${device}-${width}.png` });
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
console.log(JSON.stringify({ checked: results.length, errors, writes }));
