import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { ONE_PAGE_QA_TEMPLATES, ONE_PAGE_QA_VIEWPORTS, getOnePageQaPreviewUrl } from '../lib/one-page-qa.ts';
import { measureMenuPriceAlignment, getMenuPriceAlignmentFailures } from './lib/menu-price-alignment.mjs';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures } from './lib/one-page-mobile-rhythm.mjs';

const base = process.env.ORDERED_QA_BASE || 'http://localhost:3000';
const output = process.env.ORDERED_QA_OUTPUT || '/private/tmp/ordered-layout-qa';
const templates = ONE_PAGE_QA_TEMPLATES.filter(t => !process.env.ORDERED_QA_KEYS || process.env.ORDERED_QA_KEYS.split(',').includes(t.key));
const quick = process.argv.includes('--quick');
const mode = process.env.ORDERED_QA_MODE || 'orderedFit';
const callModes = process.env.ORDERED_QA_CALL === 'on' ? [true] : process.env.ORDERED_QA_CALL === 'off' ? [false] : [false, true];
const mobile = process.argv.includes('--mobile');
const widths = process.env.ORDERED_QA_WIDTHS?.split(',').map(Number);
const locales = process.env.ORDERED_QA_LOCALES?.split(',') || ['en', 'zh', 'ja'];
const cases = templates.flatMap(template => mobile
  ? [320, 430].map(width => ({ ...template, device: 'mobile', width, height: 844, call: true, locale: 'ko' }))
  : [
    ...ONE_PAGE_QA_VIEWPORTS.filter(v => v.device !== 'mobile' && (!widths || widths.includes(v.width)) && (!quick || v.width === 1512)).flatMap(v => callModes.map(call => ({ ...template, ...v, call, locale: 'ko' }))),
    ...(!quick ? locales.filter(locale => locale !== 'ko').flatMap(locale => [ONE_PAGE_QA_VIEWPORTS[0], ONE_PAGE_QA_VIEWPORTS[2]].map(v => ({ ...template, ...v, call: true, locale }))) : []),
  ]);

/** Check physical painted rows; union rectangles of fragmented categories are not rows. */
function measureOrderedLayout() {
  const visible = e => e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
  const board = document.querySelector('.cafe-a-desktop-fit-board');
  const menu = board?.querySelector('[data-cafe-a-fit-menu]');
  if (!menu || !visible(board)) return { missing: true, viewport: [innerWidth, innerHeight] };
  const rect = r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  const menuRect = menu.getBoundingClientRect();
  const rows = [...menu.querySelectorAll('[data-cafe-a-category-heading], [data-cafe-a-item-stack]')].filter(visible);
  const physicalRows = rows.flatMap((e, order) => [...e.getClientRects()].filter(r => r.width > 0 && r.height > 0).map(r => ({ ...rect(r), order, type: e.hasAttribute('data-cafe-a-category-heading') ? 'heading' : 'item', text: e.textContent.slice(0, 55) })));
  const collisions = [];
  for (let i = 0; i < physicalRows.length; i++) for (let j = i + 1; j < physicalRows.length; j++) {
    const a = physicalRows[i], b = physicalRows[j];
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1.5) collisions.push([a.text, b.text]);
  }
  const clipped = physicalRows.filter(r => r.left < menuRect.left - 2 || r.right > menuRect.right + 2 || r.top < menuRect.top - 2 || r.bottom > menuRect.bottom + 2);
  const splitItems = rows.filter(e => e.hasAttribute('data-cafe-a-item-stack') && [...e.getClientRects()].filter(r => r.width > 0 && r.height > 0).length > 1).map(e => e.textContent.slice(0, 55));
  const visualOrder = [...physicalRows].sort((a, b) => Math.abs(a.left - b.left) < 3 ? a.top - b.top : a.left - b.left).map(r => r.order);
  const outOfOrder = visualOrder.some((order, i) => i > 0 && order < visualOrder[i - 1]);
  const blocks = [...menu.querySelectorAll('[data-cafe-a-block-type]')].filter(visible);
  const fragments = blocks.flatMap((e, order) => [...e.getClientRects()].filter(r => r.width > 0 && r.height > 0).map(r => ({ e, order, ...rect(r) })));
  const boundaries = blocks.filter(e => e.dataset.cafeABlockType === 'category').map(e => {
    const tail = [...fragments].filter(f => f.e === e).sort((a, b) => a.left - b.left || a.top - b.top).at(-1);
    const next = tail && fragments.filter(f => f.e !== e && Math.abs(f.left - tail.left) < 3 && f.top >= tail.top).sort((a, b) => a.top - b.top || a.order - b.order)[0];
    const last = [...e.querySelectorAll('[data-cafe-a-item-stack]')].at(-1);
    return { title: e.querySelector('[data-cafe-a-category-title-text]')?.textContent, fragments: e.getClientRects().length, expected: next?.e.dataset.cafeABlockType || null, actual: e.dataset.cafeAVisualNextBlockType || null, margin: parseFloat(getComputedStyle(e).marginBottom), lastItemMargin: last ? parseFloat(getComputedStyle(last).marginBottom) : null, physicalGap: next ? next.top - tail.bottom : null };
  });
  const footerLeaves = [...board.querySelectorAll('[data-cafe-a-footer-info] button, [data-cafe-a-footer-info] p')].filter(visible).map(e => rect(e.getBoundingClientRect()));
  const footerOverlaps = physicalRows.filter(r => footerLeaves.some(f => Math.min(r.right, f.right) - Math.max(r.left, f.left) > 2 && Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top) > 1.5));
  const itemNames = [...menu.querySelectorAll('[data-cafe-a-menu-name]')].filter(visible);
  const sourceItems = document.querySelector('[data-cafe-a-scroll-content]')?.querySelectorAll('[data-cafe-a-menu-item]').length;
  return {
    viewport: [innerWidth, innerHeight], state: board.dataset.fitPresentationState, mode: board.dataset.layoutMode, fallback: board.dataset.fitLayoutFallback || null,
    overflow: board.dataset.fitOverflow, columns: Number(board.dataset.fitColumns), basis: board.dataset.fitCopyBasis,
    scale: Number(board.dataset.fitFontScale), gapScale: Number(board.dataset.fitGapScale),
    documentOverflow: document.documentElement.scrollWidth - innerWidth,
    menuOverflow: [menu.scrollWidth - menu.clientWidth, menu.scrollHeight - menu.clientHeight],
    scroll: getComputedStyle(menu).overflowY, itemCount: itemNames.length, sourceItems,
    minimumName: Math.min(...itemNames.map(e => parseFloat(getComputedStyle(e).fontSize))),
    rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
    boundaries, collisions, clipped, splitItems, outOfOrder, footerOverlaps,
    brokenImages: [...board.querySelectorAll('img')].filter(visible).filter(e => !e.complete || !e.naturalWidth).map(e => e.getAttribute('src')),
  };
}

await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ reducedMotion: 'reduce' });
const results = [];
try {
  // Keep fit measurements stable and avoid making four renderers compete for the CPU.
  for (const c of cases) {
    const started = Date.now();
    const page = await context.newPage();
    await page.setViewportSize({ width: c.width, height: c.height });
    const failures = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    let metrics;
    try {
      await page.goto(base + getOnePageQaPreviewUrl(c.key, c.device, c.call, c.locale, mode), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.evaluate(async () => { await document.fonts.ready; await Promise.race([Promise.all([...document.images].filter(e => e.getBoundingClientRect().width > 0).map(e => e.decode().catch(() => null))), new Promise(resolve => setTimeout(resolve, 5000))]); });
      if (!mobile) {
        await page.waitForFunction(() => {
          const board = document.querySelector('.cafe-a-desktop-fit-board');
          const cover = document.querySelector('[data-cafe-a-fit-presentation]');
          if (board?.dataset.fitPresentationState !== 'ready' || (cover && parseFloat(getComputedStyle(cover).opacity) > .01)) { window.__orderedQaSettle = null; return false; }
          const menu = board.querySelector('[data-cafe-a-fit-menu]');
          const geometry = JSON.stringify([board.dataset.fitFontScale, board.dataset.fitGapScale, board.dataset.fitColumns, ...[...menu.querySelectorAll('[data-cafe-a-item-stack]')].map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.height]; })]);
          if (window.__orderedQaSettle?.geometry !== geometry) { window.__orderedQaSettle = { geometry, since: Date.now() }; return false; }
          return Date.now() - window.__orderedQaSettle.since >= 650;
        }, null, { timeout: 45000 });
        metrics = await page.evaluate(measureOrderedLayout);
        if (metrics.missing) failures.push('missing visible canvas');
        else {
          const expectedMode = metrics.mode === mode || (mode === 'orderedBalancedFit' && metrics.mode === 'orderedFit' && metrics.fallback === 'ordered-flow');
          // fitOverflow is the candidate estimate; final actual-copy validation can safely supersede it.
          if (!expectedMode || metrics.state !== 'ready') failures.push('selected layout mode or ready state mismatch');
          if (metrics.documentOverflow > 1 || metrics.menuOverflow.some(v => v > 1)) failures.push('viewport/menu overflow');
          if (metrics.collisions.length || metrics.clipped.length || metrics.footerOverlaps.length || metrics.splitItems.length) failures.push('content clipping, collision or split product');
          if (mode === 'orderedFit' && metrics.outOfOrder) failures.push('registered visual order changed');
          if (metrics.itemCount !== metrics.sourceItems) failures.push('items missing or duplicated');
          if (metrics.minimumName < metrics.rem - .1) failures.push('name below reading floor');
          if (['auto', 'scroll'].includes(metrics.scroll)) failures.push('canvas scrolling');
          if (metrics.brokenImages.length) failures.push('broken image');
          if (metrics.boundaries.some(b => b.expected && b.actual !== b.expected)) failures.push('wrong physical category boundary');
          if (metrics.boundaries.some(b => b.expected === 'category' && (b.margin <= 0 || Math.abs(b.lastItemMargin) > .1))) failures.push('missing category gap or duplicate last-item margin');
        }
      } else {
        await page.waitForFunction(() => [...document.querySelectorAll('[data-mobile-brand-fit]')].filter(e => e.getBoundingClientRect().width > 0).every(e => e.dataset.mobileBrandFit === 'ready'));
        metrics = await page.evaluate(measureOnePageMobileRhythm);
        failures.push(...getOnePageMobileRhythmFailures(metrics));
      }
      if (getMenuPriceAlignmentFailures(await page.evaluate(measureMenuPriceAlignment)).length) failures.push('price/name first-line mismatch');
    } catch (error) { failures.push(error.message); if (!mobile) metrics = await page.evaluate(measureOrderedLayout).catch(() => null); }
    failures.push(...errors);
    const name = `${c.key}-${c.device}-${c.width}-${c.height}-${c.locale}-${c.call ? 'on' : 'off'}`;
    if (failures.length || (!mobile && c.locale === 'ko' && c.call)) await page.screenshot({ path: `${output}/${name}.png`, fullPage: false, animations: 'disabled', timeout: 15000 }).catch(e => failures.push(`screenshot: ${e.message.split('\n')[0]}`));
    results.push({ ...c, elapsedMs: Date.now() - started, metrics, failures });
    await writeFile(`${output}/report.json`, JSON.stringify({ base, results }, null, 2));
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ${name}${failures.length ? `: ${failures.join('; ').slice(0, 200)}` : ''}`);
    await page.close();
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ checked: results.length, failed: results.filter(r => r.failures.length).length, report: `${output}/report.json` }));
if (results.some(r => r.failures.length)) process.exitCode = 1;
