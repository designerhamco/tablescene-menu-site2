import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const out = process.env.ORDER_QA_OUTPUT || '/private/tmp/advertisement-album-qa';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [], writes = [];
const sizes = process.env.ALBUM_QA_SMOKE === '1'
  ? [['tablet', 1180, 820], ['mobile', 390, 844]]
  : [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180], ['mobile', 320, 740], ['mobile', 390, 844], ['mobile', 430, 932]];
async function pageFor(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.addInitScript(() => sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed', '1'));
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
  return page;
}
function url(key, query) { return `${base}/templates/${key}/preview?${new URLSearchParams(query)}`; }
async function selectDiningPage(page, index) {
  await page.locator('.aube-table-mobile-page-tabs button,.aube-table-pagination-dots button,.aube-table-sidebar-list button').filter({ visible: true }).nth(index).click();
  await page.locator('.aube-table-page').last().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}
try {
  for (const design of process.env.ALBUM_QA_TOOLBAR_ONLY === '1' ? [] : ['basic-first-column-album', 'basic-top-row-album', 'dining-full-page-album', 'dining-sidebar-album']) {
    for (const [device, width, height] of sizes) {
      const basic = design.startsWith('basic');
      const key = basic ? 'cafe_design_a' : design.includes('sidebar') ? 'dining_aube_table_b' : 'dining_aube_table_a';
      const page = await pageFor(width, height);
      try {
        await page.goto(url(key, { design, device, view: 'actual', callPreview: 'on', orderPreview: 'on', coverPreview: basic ? 'on' : 'off' }), { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('[data-menu-advertisement-popup]').count(), 0, 'advertisement defaults OFF');
        if (basic && device !== 'mobile') await page.locator('[data-paged-ready=true]').waitFor();
        if (!basic) {
          const course = page.locator('.aube-table-course[data-course-priced=true]').first();
          assert.equal(await course.locator('.aube-table-item-image').count(), 0, 'priced courses never have item images');
          assert.equal(await course.locator('.aube-table-course-items').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 1, 'priced course items always use one column');
          await selectDiningPage(page, 1);
        }
        const images = page.locator(basic ? '.cafe-a-menu-item-image' : '.aube-table-item-image').filter({ visible: true });
        assert.ok(await images.count() > 0, 'ordinary album items have images');
        const dimensions = await images.evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }));
        assert.ok(dimensions.every(([w, h]) => Math.abs(w - h) < 1), 'album images remain square');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal viewport overflow');
        const card = images.first().locator('xpath=ancestor::article[1]');
        const image = await images.first().boundingBox(), name = await card.locator(basic ? '[data-cafe-a-menu-name]' : 'h3').boundingBox();
        assert.ok(name.y >= image.y + image.height - 1, 'title follows image');
        await images.first().scrollIntoViewIfNeeded();
        await images.first().click();
        await page.locator('[role=dialog]').filter({ visible: true }).first().waitFor();
        await page.keyboard.press('Escape');
        if (basic) {
          assert.equal(await page.locator('.cafe-a-price-column-heading-label').filter({ visible: true }).count(), 0, 'Basic album omits category price-option columns');
          const edges = await card.evaluate(e => {
            const row = e.getBoundingClientRect(), add = e.querySelector('[data-menu-order-add]').getBoundingClientRect();
            return { rowRight: row.right, addRight: add.right };
          });
          assert.ok(Math.abs(edges.rowRight - edges.addRight) < 2, 'Basic add icon sits at far right');
        } else {
          await selectDiningPage(page, 2);
          const wine = page.locator('.aube-table-item').filter({ has: page.locator('.aube-table-item-copy[data-price-options=true]') }).first();
          await wine.locator('.aube-table-item-price').scrollIntoViewIfNeeded();
          const rows = await wine.locator('.aube-table-album-price-row').evaluateAll(es => es.map(e => {
            const r = e.getBoundingClientRect(), leader = e.querySelector('[data-album-price-leader]').getBoundingClientRect(), text = e.querySelector('.aube-table-option-price').getBoundingClientRect();
            return { y: r.y, bottom: r.bottom, right: r.right, textRight: text.right, leaderWidth: leader.width, leaderRight: leader.right, textX: text.x };
          }));
          assert.ok(rows.length >= 2);
          rows.forEach((r, i) => {
            assert.ok(r.leaderWidth >= 7 && r.leaderRight <= r.textX, 'every price row has a visible dotted leader');
            assert.ok(Math.abs(r.right - r.textRight) < 1, 'every option price aligns right');
            if (i) assert.ok(r.y >= rows[i - 1].bottom - 1, 'options occupy separate rows');
          });
          const geometry = await wine.evaluate(e => {
            const card = e.getBoundingClientRect(), price = e.querySelector('.aube-table-item-price').getBoundingClientRect(), add = e.querySelector('[data-menu-order-add]').getBoundingClientRect();
            return { cardRight: card.right, priceRight: price.right, addX: add.x, addRight: add.right };
          });
          assert.ok(geometry.addX >= geometry.priceRight + 3, 'add icon does not overlap option prices');
          assert.ok(Math.abs(geometry.cardRight - geometry.addRight) < 2, 'Dining add icon aligns to card edge');
          if (device === 'mobile' && width >= 390) {
            const grid = wine.locator('xpath=ancestor::*[contains(@class,"aube-table-course-items")][1]');
            assert.equal(await grid.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length), 2, 'option products use the same two mobile card columns');
            const direct = page.locator('.aube-table-direct-items');
            const matching = await direct.evaluate(e => {
              const peer = e.closest('.aube-table-page-content').querySelector('.aube-table-course[data-course-priced=false] .aube-table-course-items');
              return { columns: getComputedStyle(e).gridTemplateColumns, gap: getComputedStyle(e).columnGap,
                peerColumns: getComputedStyle(peer).gridTemplateColumns, peerGap: getComputedStyle(peer).columnGap };
            });
            assert.equal(matching.columns, matching.peerColumns, 'standalone products use the same mobile album tracks');
            assert.equal(matching.gap, matching.peerGap, 'standalone products use the same mobile album gutter');
            await direct.scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${out}/${design}-standalone-${width}.png` });
          }
        }
        const add = page.locator('[data-menu-order-add]').filter({ visible: true }).first();
        await add.scrollIntoViewIfNeeded(); await add.click();
        await page.locator('[role=dialog]').filter({ visible: true }).first().waitFor(); await page.keyboard.press('Escape');
        await page.screenshot({ path: `${out}/${design}-${device}-${width}.png` });
        results.push({ design, device, width, height }); console.log('PASS', design, device, width);
      } finally { await page.close(); }
    }
  }
  for (const [key, design] of [['cafe_design_a', 'basic-first-column'], ['dining_aube_table_a', 'dining-full-page']]) {
    const page = await pageFor(1440, 1000);
    try {
      await page.goto(url(key, { design, device: 'tablet' }), { waitUntil: 'networkidle' });
      const options = page.getByRole('button', { name: /보기 옵션/ });
      if (await options.getAttribute('aria-expanded') === 'false') await options.click();
      await page.getByRole('checkbox', { name: '광고 보기', exact: true }).check();
      await page.waitForURL(u => u.searchParams.get('popupPreview') === 'on');
      const frame = page.frameLocator('iframe'), popup = frame.locator('[data-menu-advertisement-popup]');
      await popup.waitFor();
      assert.equal(await popup.locator('footer,input[type=checkbox]').count(), 0, 'no footer or daily suppression');
      assert.equal(await popup.getByRole('button', { name: '닫기', exact: true }).count(), 1);
      const geometry = await popup.evaluate(e => {
        const box = e.getBoundingClientRect(), image = e.querySelector('img').getBoundingClientRect(), dots = e.querySelector('[data-popup-dots]').getBoundingClientRect(), x = e.querySelector('button'), cs = getComputedStyle(e);
        return { box: { x: box.x, right: box.right, bottom: box.bottom }, image: { x: image.x, right: image.right, bottom: image.bottom }, dots: { bottom: dots.bottom, width: dots.width }, outline: cs.outlineStyle, border: cs.borderWidth, xColor: getComputedStyle(x).color, xBg: getComputedStyle(x).backgroundColor, shadow: getComputedStyle(x.querySelector('svg')).filter };
      });
      assert.equal(geometry.outline, 'none'); assert.equal(geometry.border, '0px');
      assert.equal(geometry.xColor, 'rgb(255, 255, 255)'); assert.equal(geometry.xBg, 'rgba(0, 0, 0, 0)'); assert.notEqual(geometry.shadow, 'none');
      assert.ok(Math.abs(geometry.image.x - geometry.box.x) < 1 && Math.abs(geometry.image.right - geometry.box.right) < 1, 'image fills entire dialog width');
      assert.ok(geometry.dots.bottom < geometry.image.bottom && geometry.dots.width <= 45, 'compact dots overlay the image');
      await popup.getByRole('button', { name: '이미지 3', exact: true }).click();
      assert.equal(await popup.getByRole('button', { name: '이미지 3', exact: true }).getAttribute('aria-current'), 'true');
      await popup.getByRole('button', { name: '닫기', exact: true }).click();
      await page.reload({ waitUntil: 'networkidle' }); await popup.waitFor();
      await page.screenshot({ path: `${out}/${design}-advertisement.png` });
      await popup.getByRole('button', { name: '닫기', exact: true }).click();
      await page.getByRole('checkbox', { name: '광고 보기', exact: true }).uncheck();
      await popup.waitFor({ state: 'hidden' });
      results.push({ design, toolbar: true }); console.log('PASS advertisement toolbar', design);
    } finally { await page.close(); }
  }
  const page = await pageFor(1180, 820);
  try {
    await page.goto(url('cafe_design_a', { design: 'basic-top-row-album', device: 'tablet' }), { waitUntil: 'networkidle' });
    const options = page.getByRole('button', { name: /보기 옵션/ });
    if (await options.getAttribute('aria-expanded') === 'false') await options.click();
    assert.equal(await page.getByRole('checkbox', { name: '대표 영역 보기', exact: true }).isChecked(), false);
    results.push({ design: 'basic-top-row-album', representativeDefaultOff: true });
  } finally { await page.close(); }
} finally {
  await browser.close();
  await fs.writeFile(`${out}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
assert.deepEqual(errors, []); assert.deepEqual(writes, []);
console.log(JSON.stringify({ checked: results.length }));
