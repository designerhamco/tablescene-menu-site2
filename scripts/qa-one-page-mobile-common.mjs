import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures, compareMobileRhythmViewports } from './lib/one-page-mobile-rhythm.mjs';
import { measureMenuPriceAlignment, getMenuPriceAlignmentFailures } from './lib/menu-price-alignment.mjs';

const base = process.env.MOBILE_COMMON_QA_BASE_URL || 'http://127.0.0.1:3000';
const production = process.env.MOBILE_COMMON_QA_PRODUCTION === '1';
const fixturesOnly = process.env.MOBILE_COMMON_QA_FIXTURES_ONLY === '1';
const keys = ['cafe_design_a', 'cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a', 'cafe_round_focus_a', 'fast_food_loop_bagel_a'];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const results = [];
async function visit(key, width, device = 'mobile', extra = '') {
  console.log(`visit ${key} ${device} ${width} ${extra}`);
  await page.setViewportSize({ width, height: device === 'pc' ? 900 : device === 'tablet' ? (width < 1000 ? 1198 : 838) : 844 });
  const params = new URLSearchParams({ device, view: 'actual', embedded: '1', lang: 'ko' });
  for (const [name, value] of new URLSearchParams(extra)) params.set(name, value);
  const response = await page.goto(`${base}/templates/${key}/preview?${params}`, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`HTTP ${response?.status()} ${key}`);
  if (device === 'mobile' && !extra.includes('brand-logo')) await page.waitForFunction(() => document.querySelector('[data-mobile-brand-fit]')?.dataset.mobileBrandFit === 'ready', null, { timeout: 60000 });
  if (device !== 'mobile') await page.waitForFunction(() => document.querySelector('.cafe-a-desktop-fit-board')?.getAttribute('data-fit-presentation-state') === 'ready', null, { timeout: 60000 });
  await page.evaluate(async () => {
    await Promise.race([document.fonts.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('font loading timeout')), 15000))]);
    const visibleImages = [...document.images].filter((img) => img.getBoundingClientRect().width && img.getBoundingClientRect().height);
    await Promise.race([Promise.all(visibleImages.map((img) => img.decode().catch(() => null))), new Promise((_, reject) => setTimeout(() => reject(new Error('visible image loading timeout')), 15000))]);
  });
}
async function check(key, width, extra = '') {
  await visit(key, width, 'mobile', extra);
  const measurement = await page.evaluate(measureOnePageMobileRhythm);
  const failures = [...getOnePageMobileRhythmFailures(measurement), ...getMenuPriceAlignmentFailures(await page.evaluate(measureMenuPriceAlignment))];
  results.push({ key, width, extra, measurement, failures });
  console.log(JSON.stringify({ key, width, extra, failures, brand: measurement.fonts.brand }));
  return measurement;
}
async function languageFonts(key, fixture = false) {
  await visit(key, 390, 'mobile', fixture ? '&rhythmQa=brand-font-outfit' : '');
  await page.getByRole('button', { name: '언어 변경', exact: true }).click();
  await page.getByRole('menuitem').first().waitFor();
  const measurement = await page.evaluate(() => {
    const root = document.querySelector('.cafe-a-typography');
    const normalize = (value) => value.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
    const expected = { ko: normalize(getComputedStyle(root).getPropertyValue('--menu-font-ko')), en: normalize(getComputedStyle(root).getPropertyValue('--menu-font-en')) };
    const labels = [...document.querySelectorAll('[data-template-language-control] [role="menuitem"] .cafe-a-script-ko, [data-template-language-control] [role="menuitem"] .cafe-a-script-en')].map((element) => ({ text: element.textContent, script: element.classList.contains('cafe-a-script-en') ? 'en' : 'ko', font: normalize(getComputedStyle(element).fontFamily) }));
    return { expected, labels };
  });
  const failures = measurement.labels.length ? measurement.labels.filter((label) => label.font !== measurement.expected[label.script]).map((label) => `${label.text}: configured font not applied`) : ['missing script-aware labels'];
  results.push({ key, languageFonts: measurement, fixture, failures });
  console.log(JSON.stringify({ key, languageFonts: measurement, fixture, failures }));
}
try {
  for (const key of keys) {
    let first;
    for (const width of fixturesOnly ? [] : [320, 390, 430]) {
      const m = await check(key, width);
      if (first) results.at(-1).failures.push(...compareMobileRhythmViewports(first, m));
      else first = m;
      if (width === 390) await page.screenshot({ path: `/private/tmp/${key}-mobile-common.png`, fullPage: true });
    }
    if (!fixturesOnly) await languageFonts(key);
    if (!fixturesOnly) await check(key, 390, '&callPreview=on');
    if (!production) {
      for (const fixture of ['copy-no-cover', 'cover', 'brand-long', 'brand-cjk', 'brand-unbroken', 'brand-oversized', 'brand-logo']) await check(key, 320, `&rhythmQa=${fixture}`);
      await languageFonts(key, true);
    }
    for (const locale of ['en', 'zh', 'ja']) await check(key, 390, `&lang=${locale}`);
    for (const [device, width] of fixturesOnly ? [] : [['pc', 1440], ['tablet', 1198], ['tablet', 838]]) {
      await visit(key, width, device);
      const measurement = await page.evaluate(() => ({ mobile: document.querySelector('[data-cafe-a-mobile-style="true"]') !== null, brand: document.querySelector('[data-mobile-brand-fit]') !== null, overflow: document.documentElement.scrollWidth - innerWidth, state: document.querySelector('.cafe-a-desktop-fit-board')?.getAttribute('data-fit-presentation-state') }));
      const failures = measurement.mobile || measurement.brand || measurement.overflow > 1 ? ['PC/tablet policy isolation or overflow failure'] : [];
      failures.push(...getMenuPriceAlignmentFailures(await page.evaluate(measureMenuPriceAlignment)));
      results.push({ key, device, width, measurement, failures });
      console.log(JSON.stringify({ key, device, width, measurement, failures }));
    }
  }
  for (const key of fixturesOnly ? [] : ['display_menu_a', 'dining_aube_table_a', 'dining_aube_table_b']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/templates/${key}/preview?device=mobile&view=actual&embedded=1`);
    const changed = await page.locator('[data-cafe-a-mobile-style="true"], [data-mobile-brand-fit]').count();
    results.push({ key, excluded: true, failures: changed ? ['excluded engine has mobile one-page flags'] : [] });
  }
} finally {
  await writeFile('/private/tmp/mobile-common-qa.json', JSON.stringify({ base, errors, results }, null, 2));
  await browser.close();
}
const failures = results.flatMap((result) => result.failures);
console.log(JSON.stringify({ checked: results.length, failures: failures.length, errors }));
if (failures.length || errors.length) process.exitCode = 1;
