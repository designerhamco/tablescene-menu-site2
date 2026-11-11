import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

const base = process.env.ORDER_QA_BASE || 'http://localhost:3027';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/preview-color-reset';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], writes = [];
const cases = [
  ['cafe_mocha_forest_a', 'pc', 1512, null],
  ['cafe_mocha_forest_a', 'mobile', 390, null],
  ['dining_aube_table_a', 'pc', 1512, null],
  ['dining_aube_table_b', 'tablet', 820, null],
  ['cafe_design_a', 'tablet', 820, 'basic-first-column-album'],
];
try {
  for (const [key, device, width, designId] of cases.filter(([key]) => !process.env.PREVIEW_COLOR_QA_TEMPLATE || key === process.env.PREVIEW_COLOR_QA_TEMPLATE)) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
    try {
      const dining = key.startsWith('dining_');
      const fields = [
        { label: dining ? '본문 페이지 배경색' : '페이지 배경색', read: value => value.pageBackground },
        ...(dining ? [] : [{ label: '보조 배경색', read: value => value.auxiliaryBackground }]),
        { label: dining ? '페이지 제목 글자색' : '카테고리명 글자색', read: value => value.textColors?.[dining ? 'pageTitle' : 'category'] },
        ...(dining ? [] : [{ label: '일반 텍스트칩 배경색', read: value => value.chipColors?.generalBackground }]),
      ];
      const url = new URL(`/templates/${key === "cafe_design_a" ? "cafe_real_matcha_a" : key}/preview`, base);
      for (const [name, value] of Object.entries({ device, previewOptions: 'design', secondaryNamesPreview: 'off', ...(designId ? { design: designId } : {}) })) url.searchParams.set(name, value);
      async function ready() {
        const guide = page.locator('[data-preview-guide-variant]');
        if (await guide.isVisible()) await guide.getByRole('button', { name: '닫기', exact: true }).click();
        const panel = page.locator('[data-preview-options-panel]');
        await panel.waitFor();
        await expect(async () => {
          if (await panel.getAttribute('data-options-open') !== 'true') await page.locator('[data-preview-options-toggle]').click();
          await expect(panel).toHaveAttribute('data-options-open', 'true', { timeout: 500 });
        }).toPass({ timeout: 10000 });
        await page.getByRole('tab', { name: '디자인 옵션', exact: true }).click();
        await expect(page.getByRole('button', { name: `${fields[2]?.label ?? fields[1].label} 선택`, exact: true })).toBeEnabled();
      }
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await ready();
      const defaults = await Promise.all(fields.map(field => page.getByRole('button', { name: `${field.label} 선택`, exact: true }).getAttribute('title')));
      url.searchParams.set('designPreview', JSON.stringify({ pageBackground: '#234567', auxiliaryBackground: '#345678', textColorGroupsVersion: 2, diningTextColorGroupsVersion: 3, textColors: { category: '#456789', pageTitle: '#456789' }, chipColors: { generalBackground: '#56789A' } }));
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await ready();
      for (const [index, field] of fields.entries()) {
        const trigger = page.getByRole('button', { name: `${field.label} 기본색 복원`, exact: true });
        const before = page.url(), design = JSON.parse(new URL(before).searchParams.get('designPreview'));
        await trigger.click();
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toContainText(field.label);
        await expect(dialog).toHaveCSS('opacity', '1');
        assert.equal(await dialog.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('[data-preview-color-reset]') === element;
        }), true, 'confirmation must be above the preview toolbar/options');
        assert.equal(await page.locator('[data-preview-color-picker]').count(), 0);
        assert.equal(page.url(), before, 'opening confirmation must not change the preview');
        if (index === 0) {
          if (key === 'cafe_mocha_forest_a' && device === 'pc') await page.screenshot({ path: `${output}/reset-confirmation.png` });
          await dialog.getByRole('button', { name: '취소', exact: true }).click();
          await expect(trigger).toBeFocused();
          assert.equal(page.url(), before);
          await trigger.click();
          await page.keyboard.press('Escape');
          await expect(dialog).toBeHidden();
          assert.equal(page.url(), before);
          assert.equal(await page.locator('[data-preview-options-panel]').getAttribute('data-options-open'), 'true', 'Escape closes only the confirmation');
          await expect(trigger).toBeFocused();
          await trigger.click();
        }
        await dialog.getByRole('button', { name: '되돌리기', exact: true }).click();
        await page.waitForURL(next => field.read(JSON.parse(next.searchParams.get('designPreview') || '{}')) === undefined);
        await expect(dialog).toBeHidden();
        const next = JSON.parse(new URL(page.url()).searchParams.get('designPreview') || '{}');
        for (const other of fields) if (other !== field) assert.deepEqual(other.read(next), other.read(design), 'reset affects only its field');
        assert.equal(new URL(page.url()).searchParams.get('secondaryNamesPreview'), 'off');
        await expect(page.getByRole('button', { name: `${field.label} 선택`, exact: true })).toHaveAttribute('title', defaults[index]);
        results.push({ key, device, label: field.label, defaultColor: defaults[index] });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      console.log('PASS confirmed color reset', key, device);
    } catch (error) {
      await page.screenshot({ path: `${output}/failure.png` });
      await fs.writeFile(`${output}/failure.txt`, await page.locator('body').innerText());
      throw error;
    } finally { await page.close(); }
  }
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  console.log(JSON.stringify({ checked: results.length, errors, writes }));
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, errors, writes }, null, 2));
}
