import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/staff-call-selection';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const primary = [['cafe_design_a', 'basic-first-column'], ['dining_aube_table_a', 'dining-full-page']];
const devices = [['pc', 1440, 900], ['tablet', 1180, 820], ['tablet', 820, 1180], ['mobile', 390, 844], ['mobile', 320, 568], ['mobile', 844, 390]];
const extra = [
  ...['basic-top-row', 'basic-center-column', 'basic-upper-left'].map(design => ['cafe_design_a', design, 'tablet', 1180, 820]),
  ['dining_aube_table_b', '', 'pc', 1440, 900],
  ['dining_aube_table_b', '', 'mobile', 390, 844],
  ['cafe_design_a', '', 'mobile', 390, 844],
];
const cases = process.env.CALL_QA_SMOKE === '1'
  ? primary.flatMap(([key, design]) => [devices[1], devices[4]].map(size => [key, design, ...size]))
  : [...primary.flatMap(([key, design]) => devices.map(size => [key, design, ...size])), ...extra];
try {
  for (const [key, design, device, width, height] of cases) {
    const touchCheck = key.startsWith('dining') && device === 'mobile' && width === 390;
    const p = await browser.newPage({ viewport: { width, height }, reducedMotion: touchCheck ? 'no-preference' : 'reduce', hasTouch: device !== 'pc' });
    const id = `${design || key}-${device}-${width}`;
    p.on('pageerror', error => errors.push(error.message));
    await p.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
    try {
      await p.goto(`${base}/templates/${key}/preview?` + new URLSearchParams({ ...(design ? { design } : {}), device, view: 'actual', callPreview: 'on', orderPreview: 'on' }), { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.getByRole('button', { name: '직원 호출하기', exact: true }).filter({ visible: true }).first().click();
      const dialog = p.locator('[data-smart-call-dialog]');
      const group = dialog.getByRole('group', { name: '직원 호출 항목' });
      const choices = group.getByRole('button');
      const expected = key.startsWith('dining')
        ? ['주문 요청', '계산 요청', '와인 문의', '물 요청', '직원 호출']
        : ['물 요청', '식기 요청', '테이블 정리', '계산 요청', '직원 호출'];
      assert.deepEqual(await choices.allTextContents(), expected);
      assert.equal(await group.getByRole('button', { pressed: true }).count(), 1);
      await p.waitForFunction(() => document.querySelector('[data-call-more]')?.dataset.callMore === 'true');
      await dialog.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {}))));
      const viewport = dialog.locator('[data-call-list-scroll]');
      const submit = dialog.locator('[data-smart-call-submit]');
      const bounds = await dialog.boundingBox(), submitBefore = await submit.boundingBox();
      const listBounds = await viewport.boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height + 1, 'dialog fits viewport');
      assert.ok(listBounds.height >= 44, 'short viewports keep at least one readable choice');
      assert.ok(submitBefore.y >= listBounds.y + listBounds.height - 1, 'send remains below the scrolling list');
      assert.ok(submitBefore.y + submitBefore.height <= height, 'send stays onscreen');
      await p.screenshot({ path: `${output}/${id}-start.png` });
      // Use a real wheel gesture; scrolling the Dining sheet must not drag it closed.
      await viewport.hover(); await p.mouse.wheel(0, 1000);
      await p.waitForFunction(() => document.querySelector('[data-call-more]')?.dataset.callMore === 'false');
      assert.equal(await dialog.locator('[data-call-list-fade]').evaluate(el => getComputedStyle(el).opacity), '0');
      assert.deepEqual(await submit.boundingBox(), submitBefore, 'send position is independent of list scroll');
      if (touchCheck) {
        const session = await p.context().newCDPSession(p);
        const x = listBounds.x + listBounds.width / 2;
        const startY = listBounds.y + 16, endY = listBounds.y + listBounds.height - 16;
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
        for (let step = 1; step <= 6; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: startY + (endY - startY) * step / 6 }] });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await p.waitForFunction(() => document.querySelector('[data-call-more]')?.dataset.callMore === 'true');
        assert.ok(await dialog.isVisible(), 'swiping the request list never dismisses the Dining sheet');
        assert.deepEqual(await dialog.boundingBox(), bounds, 'touch scroll does not drag the sheet');
        await session.detach();
      }
      await choices.last().click();
      await submit.getByText('2개 요청 보내기', { exact: true }).waitFor();
      await p.screenshot({ path: `${output}/${id}-end.png` });
      await submit.click();
      await dialog.locator('[data-call-status]').getByText(`${expected[0]} · 직원 호출 · 호출 #12`, { exact: true }).waitFor();
      await dialog.getByRole('button', { name: '호출 취소', exact: true }).click();
      await group.waitFor();
      // Every selected choice can be cleared, and an empty request cannot be sent.
      while (await group.getByRole('button', { pressed: true }).count()) await group.getByRole('button', { pressed: true }).first().click();
      assert.equal(await submit.isDisabled(), true);
      for (const choice of await choices.all()) await choice.click();
      assert.equal(await group.getByRole('button', { pressed: true }).count(), 5);
      await submit.getByText('5개 요청 보내기', { exact: true }).waitFor();
      await submit.click();
      await dialog.locator('[data-call-status]').getByText(`${expected.join(' · ')} · 호출 #12`, { exact: true }).waitFor();
      await p.screenshot({ path: `${output}/${id}-sent.png` });
      await p.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth), width);
      results.push({ id, viewport: await p.evaluate(() => [innerWidth, innerHeight]), listHeight: listBounds.height, send: submitBefore });
      console.log('PASS', id);
    } catch (error) { await p.screenshot({ path: `${output}/${id}-failure.png` }); throw error; }
    finally { await p.close(); }
  }
} finally { await browser.close(); await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2)); }
assert.deepEqual(errors, []); assert.deepEqual(writes, []);
console.log(JSON.stringify({ checked: results.length }));
