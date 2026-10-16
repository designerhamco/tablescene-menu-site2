import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { measureMenuPriceAlignment, getMenuPriceAlignmentFailures } from './lib/menu-price-alignment.mjs';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures } from './lib/one-page-mobile-rhythm.mjs';
const base = process.env.ADAPTIVE_QA_BASE || 'http://127.0.0.1:3000';
const keys = process.env.ADAPTIVE_QA_KEYS?.split(',') || ['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a'];
const full = process.env.ADAPTIVE_QA_FULL === '1';
const fixtures = process.env.ADAPTIVE_QA_FIXTURES === '1';
const quiet = process.env.ADAPTIVE_QA_QUIET === '1';
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce' });
await page.addInitScript(() => { localStorage.clear(); sessionStorage.clear(); });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const results = [];
async function check(key, device, width, height, extra = '') {
  await page.setViewportSize({width,height});
  const params = new URLSearchParams({device, view:'actual', embedded:'1', lang:'ko'});
  for (const [name,value] of new URLSearchParams(extra)) params.set(name,value);
  await page.goto(`${base}/templates/${key}/preview?${params}`, { waitUntil:'domcontentloaded', timeout:60000 });
  await page.evaluate(() => document.fonts.ready);
  if (device === "mobile") await page.waitForFunction(() => document.querySelector("[data-mobile-brand-fit]")?.dataset.mobileBrandFit === "ready", null, {timeout:60000});
  if (device !== 'mobile' && width >= 768) await page.waitForFunction(() => document.querySelector('.cafe-a-desktop-fit-board')?.dataset.fitPresentationState === 'ready', null, {timeout:60000});
  if (device !== 'mobile' && width >= 768) await page.waitForFunction(() => {
    const board = document.querySelector('.cafe-a-desktop-fit-board');
    const cover = document.querySelector('[data-cafe-a-fit-presentation]');
    return board?.dataset.fitPresentationState === 'ready' && (!cover || parseFloat(getComputedStyle(cover).opacity) < .01);
  }, null, {timeout:60000});
  await page.waitForTimeout(500);
  await page.evaluate(async () => { await Promise.all([...document.images].filter(e=>e.getBoundingClientRect().width).map(e=>e.decode().catch(()=>null))); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); });
  const m = await page.evaluate(() => {
    const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
    const find=s=>[...document.querySelectorAll(s)].find(visible);
    const font=s=>{const e=find(s);return e?parseFloat(getComputedStyle(e).fontSize):null;};
    const board=find('.cafe-a-desktop-fit-board');
    const menu=board?.querySelector('[data-cafe-a-fit-menu]');
    const header=find('[data-cafe-a-topline-info-header]');
    const brand=find('[data-cafe-a-store-title]');
    const b=board?.getBoundingClientRect();const h=header?.getBoundingClientRect();
    const size=font('[data-cafe-a-menu-name]');
    const copy=[...document.querySelectorAll('[data-cafe-a-menu-item] [data-cafe-a-menu-description]')].filter(visible).map(e=>parseFloat(getComputedStyle(e).fontSize)/(e.closest('[data-cafe-a-content-variant="description-only"]') && e.closest('.cafe-a-typography')?.dataset.cafeATwoFieldBoost !== 'off' ? 1.05 : 1));
    const columns=menu?[...menu.querySelectorAll(':scope > [data-cafe-a-balanced-column]')].filter(visible):[];
    const columnRects=columns.map(e=>e.getBoundingClientRect());
    const columnCollision=columnRects.some((rect,index)=>columnRects.slice(index+1).some(other=>rect.right>other.left+1&&other.right>rect.left+1));
    const blockCollisions=[];
    for(const column of columns) {
      const rows=[...column.querySelectorAll('[data-cafe-a-category-heading],[data-cafe-a-item-stack]')].filter(visible);
      for(let index=1;index<rows.length;index++) {
        const previous=rows[index-1];
        const leaves=[...previous.querySelectorAll('[data-cafe-a-menu-name],.cafe-a-menu-description,.cafe-a-menu-meta,.cafe-a-menu-price,.cafe-a-menu-badge,.cafe-a-menu-chip')].filter(visible);
        const bottom=Math.max(previous.getBoundingClientRect().bottom,...leaves.map(e=>e.getBoundingClientRect().bottom));
        if(bottom>rows[index].getBoundingClientRect().top+1) blockCollisions.push(previous.textContent.slice(0,50));
      }
    }
    const hero=board?[...board.querySelectorAll('.cafe-a-cover-hero')].find(visible):null;
    const featuredBottomGap=hero?b.bottom-parseFloat(getComputedStyle(board).paddingBottom)-hero.getBoundingClientRect().bottom:null;
    return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth-innerWidth,
      columnCollision,blockCollisions,featuredBottomGap,
      state:board?.dataset.fitPresentationState, basis:board?.dataset.fitCopyBasis,
      scroll:menu?getComputedStyle(menu).overflowY:null,
      scale:Number(board?.dataset.fitFontScale),columns:Number(board?.dataset.fitColumns),
      fill:Number(board?.dataset.fitVisibleAverageFillRatio), minFill:Number(board?.dataset.fitVisibleMinFillRatio),
      bottomGap:Number(board?.dataset.fitBottomGap),order:board?.dataset.fitOrderedBalancedBreaks,
      firstName:find("[data-cafe-a-menu-name]")?.textContent, names:size,copy,store:font('[data-cafe-a-store-description],.cafe-a-store-description,.cafe-a-topline-description'),notice:font('.cafe-a-footer-info .cafe-a-menu-description,.cafe-a-topline-notice-text,.cafe-a-notice-text,.cafe-a-round-focus-notice'),featured:font('.cafe-a-featured-title'),
      brand:brand?parseFloat(getComputedStyle(brand).fontSize):null,
      brandText:brand?.getAttribute('aria-label') || brand?.textContent,
      header:h?{
        height:h.height,
        boardInner:b.height-parseFloat(getComputedStyle(board).paddingTop)-parseFloat(getComputedStyle(board).paddingBottom),
        gap:parseFloat(getComputedStyle(board).rowGap),
        baseGapCss:getComputedStyle(board).getPropertyValue('--sunday-line-row-gap').trim(),
        boardPaddingCss:getComputedStyle(board).getPropertyValue('--board-padding').trim(),
        columnGapCss:getComputedStyle(board).getPropertyValue('--menu-board-column-gap').trim(),
        gapScale:Number(board.dataset.fitHeaderGapScale || 1),
      }:null,
      items:[...document.querySelectorAll('[data-cafe-a-menu-item]')].filter(visible).length,
      categories:menu?[...menu.querySelectorAll('[data-cafe-a-balanced-column]')].map(c=>[...c.querySelectorAll('[data-cafe-a-category-title-text]')].map(e=>e.textContent)):[],
      menu:menu?{height:menu.clientHeight,scrollHeight:menu.scrollHeight,width:menu.clientWidth,scrollWidth:menu.scrollWidth}:null,
      rem:parseFloat(getComputedStyle(document.documentElement).fontSize),
      references:[...document.querySelectorAll('[data-cafe-a-reference-copy]')].some(visible),
    };
  });
  const failures=[];
  if(m.overflow>1 || m.references) failures.push('horizontal overflow or visible reference');
  if(device!=='mobile') {
    if(m.columnCollision||m.blockCollisions.length) failures.push('columns or category/item content overlap');
    if(m.featuredBottomGap!==null&&m.featuredBottomGap < -1) failures.push('featured frame crosses the board inner bottom');
    if(m.names!==null && m.names<m.rem-0.1) failures.push('name below readable floor');
    if(m.brand===null||m.store===null) failures.push('brand and store description must remain visible');
    if(m.copy.some(size=>size<m.rem*.75-.1)) failures.push('copy below readable floor');
    const linked=[...m.copy,m.store,m.notice].filter(size=>size!==null);
    if(linked.length && Math.max(...linked)-Math.min(...linked)>.1) failures.push('description/store/notices are not linked');
    if(m.featured!==null && Math.abs(m.featured-m.names)>.1) failures.push('featured name and menu name are not linked');
    if(m.scroll==='auto'||m.scroll==='scroll') failures.push('one-page menu must not scroll');
    if(m.menu && m.menu.scrollWidth-m.menu.width>1) failures.push('menu horizontal overflow');
    if(m.menu && m.menu.scrollHeight-m.menu.height>1) failures.push('menu vertical overflow');
    if(m.header && Math.abs(m.header.height/(m.header.boardInner-m.header.gap)-.16)>.003) failures.push('header is outside the fixed 16 percent budget');
  } else failures.push(...getOnePageMobileRhythmFailures(await page.evaluate(measureOnePageMobileRhythm)));
  failures.push(...getMenuPriceAlignmentFailures(await page.evaluate(measureMenuPriceAlignment)));
  results.push({key,device,extra,...m,failures});
  if (!quiet) console.log(JSON.stringify(results.at(-1)));
  if(!extra && device==='pc') await page.screenshot({path:`/private/tmp/adaptive-${key}-pc.png`});
  return m;
}
try {
 for(const key of keys) {
  await check(key,'pc',1512,762);
  await check(key,'tablet',1198,838);
  await check(key,'tablet',838,1198);
  if(full) {
   await check(key,'pc',1920,1080);
   for(const locale of ['en','zh','ja']) await check(key,'pc',1512,762,`&lang=${locale}`);
   for(const width of [320,390,430]) await check(key,'mobile',width,844);
   for(const locale of ['en','zh','ja']) await check(key,'mobile',390,844,`&lang=${locale}`);
   await check(key,'pc',1512,762,'&layoutMode=orderedFit');
  }
  if(fixtures) {
   for(const fixture of ['reference-full','reference-two','reference-one','adaptive-sparse']) await check(key,'pc',1512,762,`&rhythmQa=${fixture}`);
  }
 }
} finally {
 await writeFile('/private/tmp/one-page-adaptive-qa.json',JSON.stringify({base,errors,results},null,2));
 await browser.close();
}
console.log(JSON.stringify({checked:results.length,failed:results.filter(r=>r.failures.length).length,errors}));
if(results.some(r=>r.failures.length)||errors.length) process.exitCode=1;
