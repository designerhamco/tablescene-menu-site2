import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/dining-menu-actions';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], failures = [], errors = [], writes = [];
const sizes = [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180], ['mobile', 320, 800], ['mobile', 390, 844], ['mobile', 430, 932]];
const designs = [['dining_aube_table_a', ''], ['dining_aube_table_b', ''], ['dining_aube_table_a', 'dining-full-page']];
const cases = designs.flatMap(([key, design]) => sizes.map(([device, width, height]) => ({ key, design, device, width, height, call: true, order: true })));
for (const [key] of designs.slice(0, 2)) for (const [device, width, height] of [sizes[0], sizes[2], sizes[4]]) for (const [call, order] of [[true, false], [false, true], [false, false]]) cases.push({ key, device, width, height, call, order });
for (const key of ['cafe_design_a', 'cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a', 'cafe_round_focus_a', 'restaurant_onue_a', 'fast_food_loop_bagel_a']) for (const [device, width, height] of [sizes[0], sizes[2], sizes[4]]) cases.push({ key, device, width, height, call: true, order: true });

async function settle(p) {
  await p.waitForFunction(() => document.querySelectorAll('.aube-table-stage').length <= 1 && !document.getAnimations().some(a => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity));
}
try {
  for (const c of cases) {
    const p = await browser.newPage({ viewport: { width: c.width, height: c.height }, reducedMotion: 'reduce' });
    p.on('pageerror', e => errors.push({ ...c, error: e.message }));
    await p.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : (writes.push(r.request().url()), r.abort()));
    const id = `${c.design || c.key}-${c.device}-${c.width}-${+c.call}${+c.order}`;
    try {
      await p.goto(`${base}/templates/${c.key}/preview?` + new URLSearchParams({ view: 'actual', device: c.device, ...(c.design ? { design: c.design } : {}), ...(c.call ? { callPreview: 'on' } : {}), ...(c.order ? { orderPreview: 'on' } : {}) }), { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      assert.deepEqual(await p.evaluate(() => [innerWidth, innerHeight]), [c.width, c.height]);
      const dining = c.key.startsWith('dining');
      if (!dining) {
        await p.locator(c.device === 'mobile' ? '[data-mobile-brand-fit="ready"]' : c.key === 'cafe_design_a' ? '[data-paged-ready="true"]' : '[data-fit-presentation-state="ready"]').first().waitFor();
        assert.ok(await p.locator('.lucide-concierge-bell').filter({ visible: true }).count() > 0, 'Basic uses service bell');
        assert.equal(await p.locator('[data-menu-order-icon="document"]').count(), 0, 'Basic keeps cart glyph');
      } else {
        await settle(p);
        const toolbar = p.locator('[data-dining-menu-toolbar]').filter({ visible: true });
        const mobile = c.device === 'mobile';
        assert.equal(await toolbar.count(), !mobile && (c.call || c.order) ? 1 : 0);
        const floatingCall = p.locator('[data-dining-floating-call]');
        assert.equal(await floatingCall.count(), !mobile && c.call ? 1 : 0);
        if (!mobile && c.call) {
          const circle = await floatingCall.boundingBox();
          assert.equal(circle.width, circle.height);
          await floatingCall.click();
          await p.getByRole('dialog').waitFor();
          await p.getByRole('dialog').getByRole('button', { name: '직원 호출 닫기', exact: true }).last().click();
        }
        if (!mobile && (c.call || c.order)) {
          const controls = await toolbar.locator('button').evaluateAll(els => els.map(e => ({ label: e.getAttribute('aria-label'), x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y, h: e.getBoundingClientRect().height })));
          assert.equal(controls.length, 1 + Number(c.order));
          assert.match(controls[0].label, /언어/);
          assert.equal(await toolbar.getByRole('button', { name: '직원 호출', exact: true }).count(), 0, 'floating call is the sole desktop call entry');
          if (c.order) assert.match(controls.at(-1).label, /^장바구니/);
          for (let i = 1; i < controls.length; i++) { assert.ok(controls[i].x > controls[i - 1].x); assert.equal(controls[i].y, controls[0].y); }
          assert.ok(controls[0].y < 80 && controls[0].h >= 44);
          assert.equal(await p.locator('[data-table-menu-actions]').filter({ visible: true }).count(), c.order ? 1 : 0, 'only order belongs in desktop toolbar');
          const language = toolbar.locator('button').first();
          assert.match(await language.innerText(), /KR/);
          assert.equal(await language.locator('.lucide-globe').count(), 0);
          if (await language.isEnabled()) { await language.click(); await toolbar.getByRole('menu').waitFor(); await p.keyboard.press('Escape'); }
        }
        if (mobile && (c.call || c.order)) {
          const header = p.locator('[data-table-menu-header]');
          assert.equal(await header.locator('[data-table-menu-actions] button').count(), 1);
          assert.match(await header.locator('[data-table-menu-actions] button').getAttribute('aria-label'), c.order ? /^장바구니/ : /^직원 호출/);
          assert.equal(await p.locator('[data-table-mobile-dock] button').count(), +c.call + +c.order);
          assert.ok(await header.getByText('Table 1', { exact: true }).isVisible());
        }
        if (c.call) assert.ok(await p.locator('.lucide-concierge-bell').filter({ visible: true }).count() > 0);
        if (c.order) assert.equal(await p.locator('.lucide-shopping-cart').filter({ visible: true }).count(), 0);
        if (c.order) {
          const cartEntry = p.locator('[data-table-menu-actions] [data-menu-order-icon="document"]').filter({ visible: true });
          assert.equal(await cartEntry.getAttribute('data-menu-order-purpose'), 'view');
          assert.equal(await cartEntry.locator('circle').count(), 0, 'opening an order has no add badge');
        }
        if (c.call && c.order) {
          const pages = p.locator('.aube-table-pagination-dots button,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({ visible: true });
          const count = await pages.count();
          for (let index = 1; index < count; index++) {
            await pages.nth(index).click(); await settle(p);
            const measurements = await p.locator('.aube-table-course-purchase:has([data-menu-order-add]),.aube-table-item-purchase:has([data-menu-order-add])').evaluateAll(els => els.map(e => {
              const button = e.querySelector('button'), price = e.querySelector('p');
              const b = button.getBoundingClientRect(), r = price?.getBoundingClientRect(), item = e.closest('.aube-table-item')?.getBoundingClientRect();
              return { icon: !!button.querySelector('[data-menu-order-icon="document"][data-menu-order-purpose="add"] circle'), button: { x: b.x, right: b.right, y: b.y, bottom: b.bottom }, price: r && { right: r.right, y: r.y, bottom: r.bottom }, itemRight: item?.right };
            }));
            for (const m of measurements) {
              assert.ok(m.icon);
              if (m.price) { assert.ok(m.button.x >= m.price.right - 1, JSON.stringify(m)); assert.ok(m.button.bottom > m.price.y && m.button.y < m.price.bottom, JSON.stringify(m)); }
              if (m.itemRight) assert.ok(m.button.right <= m.itemRight + 1, 'purchase stays inside item: ' + JSON.stringify(m));
            }
            const scroll = p.locator('.aube-table-page-scroll');
            const before = await toolbar.count() ? await toolbar.boundingBox() : null;
            await scroll.evaluate(e => e.scrollTo(0, e.scrollHeight));
            if (before) assert.deepEqual(await toolbar.boundingBox(), before, 'top controls stay fixed during content scroll');
            await p.screenshot({ path: `${output}/${id}-page${index}.png` });
          }
        }
      }
      assert.equal(await p.locator('.lucide-bell').filter({ visible: true }).count(), 0, 'no hanging call bell');
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      results.push(c); console.log('PASS', id);
    } catch (e) { failures.push({ ...c, error: e.message }); console.log('FAIL', id, e.message.split('\n')[0]); await p.screenshot({ path: `${output}/${id}-failure.png` }); }
    finally { await p.close(); }
  }
} finally { await browser.close(); await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, failures, errors, writes }, null, 2)); }
assert.deepEqual(failures, []); assert.deepEqual(errors, []); assert.deepEqual(writes, []);
console.log(JSON.stringify({ checked: results.length, failures, errors, writes }));
