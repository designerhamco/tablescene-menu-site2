import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures } from './lib/one-page-mobile-rhythm.mjs';
import { measureMenuPriceAlignment, getMenuPriceAlignmentFailures } from './lib/menu-price-alignment.mjs';

const base = process.env.THREE_RULES_QA_BASE || 'http://127.0.0.1:3000';
const keys = process.env.THREE_RULES_QA_KEYS?.split(',') || ['cafe_kohi_a', 'cafe_design_a', 'cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a', 'cafe_round_focus_a', 'fast_food_loop_bagel_a'];
const referencesOnly = process.env.THREE_RULES_QA_REFERENCES_ONLY === '1';
const skipReferences = process.env.THREE_RULES_QA_SKIP_REFERENCES === '1';
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = [];
async function check(key, device, width, height, extra = '') {
  await page.setViewportSize({ width, height });
  const response = await page.goto(`${base}/templates/${key}/preview?device=${device}&view=actual&embedded=1&lang=ko${extra}`, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`HTTP ${response?.status()} ${key}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction((device) => {
    const visible = (e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const brand = [...document.querySelectorAll(device === 'mobile' ? '[data-mobile-brand-fit]' : '[data-canvas-brand-fit]')].find(visible);
    return brand && (brand.dataset.mobileBrandFit ?? brand.dataset.canvasBrandFit) === 'ready';
  }, device, { timeout: 30000 });
  if (device !== 'mobile' && width >= 1024) await page.waitForFunction(() => document.querySelector('.cafe-a-desktop-fit-board')?.dataset.fitPresentationState === 'ready', null, { timeout: 30000 });
  await page.evaluate(async () => {
    await Promise.all([...document.images].filter((e) => e.getBoundingClientRect().width).map((e) => e.decode().catch(() => null)));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  if (device !== 'mobile' && width >= 1024) await page.waitForFunction(() => {
    const board = document.querySelector('.cafe-a-desktop-fit-board');
    const cover = document.querySelector('[data-cafe-a-fit-presentation]');
    return board?.dataset.fitPresentationState === 'ready' && (!cover || parseFloat(getComputedStyle(cover).opacity) < 0.01);
  }, null, { timeout: 30000 });
  const measurement = await page.evaluate(() => {
    const visible = (e) => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const board = document.querySelector('.cafe-a-desktop-fit-board');
    const brand = [...document.querySelectorAll('[data-cafe-a-store-title]')].find(visible);
    const items = [...document.querySelectorAll('[data-cafe-a-menu-item]')].filter(visible);
    const header = [...document.querySelectorAll('[data-cafe-a-topline-info-header]')].find(visible);
    const center = (e) => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; };
    const font = (selector) => {
      const el = [...document.querySelectorAll(selector)].find(visible);
      return el ? parseFloat(getComputedStyle(el).fontSize) : null;
    };
    return { width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth,
      state: board?.dataset.fitPresentationState, columns: board?.dataset.fitColumns,
      scale: board?.dataset.fitFontScale, safety: board?.dataset.fitPresentationSafetyScale,
      brand: brand ? parseFloat(getComputedStyle(brand).fontSize) : null,
      brandLines: brand?.querySelectorAll('[data-canvas-brand-line]').length,
      topline: header && brand ? {
        center: center(header), titleCenter: center(brand),
        widths: [...header.children].map((e) => e.getBoundingClientRect().width),
        lineCenters: [...brand.querySelectorAll('[data-canvas-brand-line]')].map((e) => {
          const range = document.createRange(); range.selectNodeContents(e); const r = range.getBoundingClientRect(); return r.left + r.width / 2;
        }),
      } : null,
      brandBox: brand?.dataset.canvasBrandWidth ? {
        width: Number(brand.dataset.canvasBrandWidth), height: Number(brand.dataset.canvasBrandHeight),
        minimum: Number(brand.dataset.canvasBrandMinimum), target: Number(brand.dataset.canvasBrandTarget), layout: brand.dataset.canvasBrandLayout,
        lineAdvance: Number(brand.dataset.canvasBrandLineAdvance),
        renderedHeight: brand.getBoundingClientRect().height,
        natural: brand.querySelector('.cafe-a-mobile-brand-natural-wrap') !== null,
        lines: [...brand.querySelectorAll('[data-canvas-brand-line]')].map((line) => {
          const range = document.createRange(); range.selectNodeContents(line);
          return { textWidth: range.getBoundingClientRect().width, boxHeight: line.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(line).lineHeight) };
        }),
      } : null,
      name: font('[data-cafe-a-menu-name]'), description: font('[data-cafe-a-menu-description]'), count: items.length,
      leakedReference: document.querySelector('[data-cafe-a-three-part-reference]') !== null || [...document.querySelectorAll('[data-cafe-a-reference-copy]')].some(visible),
      boundaries: items.filter((e) => e.parentElement.nextElementSibling?.querySelector('[data-cafe-a-menu-item]')).map((e) => ({
        multiplier: Number(e.dataset.cafeAItemRhythm), margin: parseFloat(getComputedStyle(e.parentElement).marginBottom),
      })),
    };
  });
  const failures = [];
  if (measurement.overflow > 1 || measurement.leakedReference) failures.push('overflow or leaked measurement reference');
  if (device === 'mobile') failures.push(...getOnePageMobileRhythmFailures(await page.evaluate(measureOnePageMobileRhythm)));
  else {
    const topline = measurement.topline;
    if (topline && (topline.widths.length !== 3 || Math.max(...topline.widths) - Math.min(...topline.widths) > 1 || Math.abs(topline.titleCenter - topline.center) > 1 || topline.lineCenters.some((center) => Math.abs(center - topline.center) > 1)))
      failures.push('horizontal header is not three equal columns with centered title');
    const box = measurement.brandBox;
    if (box && measurement.brand < box.minimum - 0.1) failures.push('brand relative floor');
    if (box && box.target !== (box.layout === 'horizontal-header' ? 0.6 : 0.75)) failures.push('brand geometry target');
    if (box && !box.natural && measurement.brand > box.minimum + 0.1 && box.lines.some((line) => line.textWidth > box.width * box.target + 1))
      failures.push('brand exceeds coverage target');
    if (box && !box.natural && (box.renderedHeight > box.height + 1 || box.lines.some((line) => line.textWidth > box.width + 1 || line.boxHeight > Math.max(line.lineHeight, measurement.brand * box.lineAdvance) + 1)))
      failures.push('brand exceeds slot or wraps a planned line');
  }
  failures.push(...getMenuPriceAlignmentFailures(await page.evaluate(measureMenuPriceAlignment)));
  results.push({ key, device, extra, measurement, failures });
  console.log(JSON.stringify(results.at(-1)));
  if (!extra) await page.screenshot({ path: `/private/tmp/three-rules-${key}-${device}-${width}.png`, fullPage: true });
  return measurement;
}
try {
  for (const key of keys) {
    if (!referencesOnly) for (const [device, width, height] of [['tablet', 1198, 838], ['pc', 1440, 900], ['tablet', 838, 1198], ['mobile', 390, 844]]) await check(key, device, width, height);
    for (const layout of skipReferences ? [] : ['orderedBalancedFit', 'orderedFit']) {
      let full;
      for (const fixture of ['reference-full', 'reference-two', 'reference-one']) {
        const measured = await check(key, 'tablet', 1198, 838, `&layoutMode=${layout}&rhythmQa=${fixture}`);
        if (!full) full = measured;
        else if (full.columns === measured.columns) {
          const fullSafety = Number(full.safety) || 1;
          const safety = Number(measured.safety) || 1;
          // Compare the three-field candidate separately from the existing final
          // clipping backoff. Never waive a changed reference candidate.
          if (Math.abs(Number(full.scale) / fullSafety - Number(measured.scale) / safety) > 0.002)
            results.at(-1).failures.push('support visibility changed same-column reference font');
          if (Math.abs(fullSafety - safety) < 0.001 && Math.abs(full.name - measured.name) > 0.15)
            results.at(-1).failures.push('same candidate and safety produced different font');
        }
      }
    }
  }
} finally {
  await writeFile('/private/tmp/three-rules-qa.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
const failures = results.flatMap((r) => r.failures);
console.log(JSON.stringify({ checked: results.length, failures, errors }));
if (failures.length || errors.length) process.exitCode = 1;
