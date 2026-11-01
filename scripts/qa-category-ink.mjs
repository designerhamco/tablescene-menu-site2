import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/category-ink';
await fs.mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `import {readPreviewRenderedDesign} from './lib/menu-preview-rendered-design'; window.readCategoryInkDesign = () => readPreviewRenderedDesign(document);`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, platform: 'browser', format: 'iife' });
const browser = await chromium.launch();
const results = [], failures = [], errors = [], writes = [];
const native = ['cafe_design_a', 'cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a', 'cafe_round_focus_a', 'fast_food_loop_bagel_a', 'restaurant_onue_a', 'dining_aube_table_a', 'dining_aube_table_b'].map(key => ({ key }));
const defaults = ['basic-first-column', 'basic-top-row', 'basic-center-column', 'basic-upper-left', 'basic-first-column-album', 'basic-top-row-album', 'dining-full-page', 'dining-sidebar', 'dining-full-page-album', 'dining-sidebar-album'].map(design => ({ design, key: design.startsWith('basic') ? 'cafe_design_a' : design.includes('sidebar') ? 'dining_aube_table_b' : 'dining_aube_table_a' }));
const devices = [['pc', 1440, 900], ['tablet', 1180, 820], ['mobile', 390, 844]];
const variants = {
  supporting: { textColorGroupsVersion: 2, textColors: { supporting: '#237A51' } },
  category: { textColorGroupsVersion: 2, textColors: { category: '#9B2743' } },
  combined: { textColorGroupsVersion: 2, textColors: { category: '#9B2743', supporting: '#237A51' } },
  legacy: { fonts: { category: { color: '#5432A8' }, other: { color: '#237A51' } } },
};
async function check(c, device, variant, lang = 'ko') {
  const [hint, width, height] = device;
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
  try {
    const query = new URLSearchParams({ device: hint, view: 'actual', categoryDescriptionsPreview: 'on', descriptionsPreview: 'on', lang });
    if (c.design) query.set('design', c.design);
    if (variants[variant]) query.set('designPreview', JSON.stringify(variants[variant]));
    await page.goto(`${base}/templates/${c.key}/preview?${query}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (c.key.startsWith('dining')) {
      await page.locator('.aube-table-pagination-dot,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({ visible: true }).nth(1).click();
      await page.locator('.aube-table-course-title h2').first().waitFor();
      await page.waitForTimeout(300);
    } else {
      await page.locator('[data-native-ready=true],[data-paged-ready=true],[data-mobile-brand-fit=ready]').filter({ visible: true }).first().waitFor();
    }
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const nativeTextColors = await page.evaluate(() => window.readCategoryInkDesign()?.nativeTextColors);
    const measured = await page.evaluate(() => {
      const visible = e => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0 && !e.closest('[aria-hidden=true],[inert]');
      const descriptions = [...document.querySelectorAll('[data-cafe-a-category-description],.aube-table-course-description')].filter(visible);
      const groups = descriptions.map(description => {
        const group = description.closest('.aube-table-course,.cafe-a-category-heading,.brew-chapter-selected-category-heading');
        const title = group?.querySelector('.cafe-a-category-title,.aube-table-course-title h2');
        const style = getComputedStyle(description);
        return { title: title && getComputedStyle(title).color, description: style.color, fontSize: style.fontSize, lineHeight: style.lineHeight };
      });
      const decorations = [...document.querySelectorAll('.cafe-a-category-heading,.aube-table-course-rule,[data-cafe-a-category-divider]')].filter(visible).flatMap(e => {
        const title = e.querySelector('.cafe-a-category-title') || e.closest('.aube-table-course,.cafe-a-menu-category-block')?.querySelector('.cafe-a-category-title,.aube-table-course-title h2');
        if (!title) return [];
        const style = getComputedStyle(e), color = getComputedStyle(title).color;
        return ['Top', 'Bottom', 'Left', 'Right'].filter(side => parseFloat(style[`border${side}Width`]) > 0 && style[`border${side}Style`] !== 'none').map(side => ({ title: color, ink: style[`border${side}Color`] }));
      });
      const productDescriptions = [...document.querySelectorAll('.cafe-a-menu-copy .cafe-a-menu-description:not([data-cafe-a-category-description]),.aube-table-item-description')].filter(e => visible(e) && !e.closest('.cafe-a-cover-hero,[data-cafe-a-footer-info],[data-native-notices],[data-paged-notices]') && !e.classList.contains('cafe-a-time-sale-time-text')).map(e => getComputedStyle(e).color);
      return { viewport: [innerWidth, innerHeight], groups, decorations, productDescriptions, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.deepEqual(measured.viewport, [width, height]);
    assert.equal(measured.overflow, false);
    assert.ok(measured.groups.length > 0, 'category descriptions are rendered');
    for (const group of measured.groups) {
      assert.equal(group.description, group.title, 'category description follows heading');
      if ((variant === 'combined' || variant === 'category')) assert.equal(group.title, 'rgb(155, 39, 67)');
      if (variant === 'legacy') assert.equal(group.title, 'rgb(84, 50, 168)');
    }
    for (const decoration of measured.decorations) assert.equal(decoration.ink, decoration.title, 'category decoration follows heading');
    if (c.key === 'cafe_design_a' && !c.design && variant === 'combined') {
      assert.ok(measured.decorations.length > 0, 'REAL MATCHA underline is measured');
      await page.screenshot({ path: `${output}/real-matcha-${hint}-${width}.png` });
    }
    results.push({ ...c, device: hint, variant, lang, nativeTextColors, ...measured });
  } catch (error) { const failure = { ...c, device: hint, variant, lang, error: error.message }; failures.push(failure); console.log(JSON.stringify(failure)); }
  finally { await page.close(); }
}
try {
  const targets = process.env.QA_KEYS ? [...native, ...defaults].filter(c => process.env.QA_KEYS.split(',').includes(c.design || c.key)) : [...native, ...defaults];
  const jobs = targets.flatMap(c => devices.flatMap(device => ['supporting', 'combined'].map(variant => () => check(c, device, variant))));
  for (const c of native.filter(c => !c.key.startsWith('dining') && c.key !== 'cafe_brew_chapter_a')) {
    if (process.env.QA_KEYS && !targets.includes(c)) continue;
    jobs.push(() => check(c, ['mobile', 320, 844], 'combined'), () => check(c, ['mobile', 430, 932], 'combined', 'en'));
  }
  for (const key of ['cafe_design_a', 'cafe_mocha_forest_a', 'cafe_round_focus_a', 'dining_aube_table_b']) {
    const c = targets.find(c => c.key === key && !c.design);
    if (c) for (const device of [devices[0], devices[2]]) jobs.push(() => check(c, device, 'legacy'), () => check(c, device, 'reset'), () => check(c, device, 'category'));
  }
  for (let index = 0; index < jobs.length; index += 3) {
    await Promise.all(jobs.slice(index, index + 3).map(job => job()));
    console.log(JSON.stringify({ checked: results.length, failed: failures.length, total: jobs.length }));
  }
  for (const combined of results.filter(result => result.variant === 'combined')) {
    const supporting = results.find(result => result.key === combined.key && result.design === combined.design && result.device === combined.device && result.lang === combined.lang && result.viewport[0] === combined.viewport[0] && result.variant === 'supporting');
    if (!supporting) continue;
    assert.equal(combined.nativeTextColors.supporting, supporting.nativeTextColors.supporting, 'category changes preserve the supporting picker default');
    assert.deepEqual(combined.productDescriptions, supporting.productDescriptions, 'category changes preserve product-description ink');
    assert.deepEqual(combined.groups.map(({fontSize, lineHeight}) => ({fontSize, lineHeight})), supporting.groups.map(({fontSize, lineHeight}) => ({fontSize, lineHeight})), 'category ink preserves description typography');
  }
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, failures, errors, writes }, null, 2));
}
console.log(JSON.stringify({ passed: results.length, failures, errors, writes }));
assert.deepEqual(failures, []);
assert.deepEqual(errors, []);
assert.deepEqual(writes, []);
