import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures } from './lib/one-page-mobile-rhythm.mjs';
import { measureMenuPriceAlignment, getMenuPriceAlignmentFailures } from './lib/menu-price-alignment.mjs';

const base = process.env.MOCHA_SPACING_QA_BASE || 'http://localhost:3026';
const baseline = process.env.MOCHA_SPACING_QA_BASELINE || 'http://localhost:3000';
const output = process.env.MOCHA_SPACING_QA_OUTPUT || '/private/tmp/mocha-reading-spacing';
const keys = ['cafe_design_a', 'cafe_mocha_forest_a'];
const cases = [];
for (const [device, width, height] of [['pc',1512,762],['pc',1920,1080],['tablet',1180,820],['tablet',1024,768]]) {
  for (const layout of ['orderedBalancedFit','orderedFit']) for (const key of keys) cases.push({key,device,width,height,layout,lang:'ko'});
}
for (const key of ['fast_food_loop_bagel_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','restaurant_onue_a']) cases.push({key,device:'tablet',width:1180,height:820,layout:'orderedBalancedFit',lang:'ko'});
for (const key of keys) for (const width of [320,430]) cases.push({key,device:'mobile',width,height:844,layout:'orderedBalancedFit',lang:'ko'});
for (const device of ['pc','tablet']) cases.push({key:'cafe_mocha_forest_a',device,width:device==='pc'?1512:1180,height:820,layout:'orderedFit',lang:'en'});
const results = [], errors = [], writes = [];
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch();
function measure() {
  const visible = e => !e.closest('[inert]') && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
  const root = document.querySelector('.cafe-a-typography');
  const board = document.querySelector('[data-native-scroll],[data-scroll-brand-board]');
  const rect = e => { const r=e.getBoundingClientRect(); return [r.left,r.top,r.width,r.height]; };
  const style = e => { const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,line:s.lineHeight}; };
  const units = [...document.querySelectorAll('[data-native-unit],[data-paged-block]')].filter(visible);
  const itemUnits = units.filter(e=>e.dataset.kind==='item');
  const headings = units.filter(e=>e.dataset.kind==='heading');
  const headingClearances = headings.flatMap(e=>{
    const i=units.indexOf(e),next=units[i+1];
    if(!next || next.dataset.kind!=='item' || Math.abs(rect(e)[0]-rect(next)[0])>1)return [];
    const title=e.querySelector('.cafe-a-category-title'),name=next.querySelector('[data-cafe-a-menu-name]');
    const group=e.querySelector('.cafe-a-category-heading');
    return [{text:e.textContent,titleToName:rect(name)[1]-rect(title)[1]-rect(title)[3],afterGroup:rect(next)[1]-rect(group)[1]-rect(group)[3],border:getComputedStyle(group).borderBottomColor}];
  });
  const menu=board?.querySelector('[data-native-menu],[data-scroll-menu]');
  const columns=[...board?.querySelectorAll('[data-native-column],[data-paged-column]')??[]].filter(visible).map(rect);
  const roles=Object.fromEntries(['.cafe-a-store-title','.cafe-a-store-description','.cafe-a-category-title','.cafe-a-menu-title','.cafe-a-menu-meta','.cafe-a-menu-description','.cafe-a-menu-price'].map(selector=>{const e=[...root.querySelectorAll(selector)].find(visible);return [selector,e?style(e):null];}));
  const heading=units[0]?.querySelector('.cafe-a-category-title');
  return {viewport:[innerWidth,innerHeight],roles,root:rect(root),menu:menu?rect(menu):null,board:board?rect(board):null,
    gutter:columns.length>1?columns[1][0]-columns[0][0]-columns[0][2]:null,
    topInset:menu?rect(menu)[1]-rect(root)[1]:null,
    headingClearances,
    itemGaps:itemUnits.filter(e=>getComputedStyle(e).paddingBottom!=='0px').map(e=>getComputedStyle(e).paddingBottom),
    names:[...root.querySelectorAll('[data-cafe-a-menu-name]')].filter(visible).map(e=>e.textContent),
    units:units.map(rect), allItemBoxes:[...root.querySelectorAll("[data-cafe-a-menu-item]")].filter(visible).map(rect),
    overflow:document.documentElement.scrollWidth-innerWidth,
    innerOverflow:menu?menu.scrollWidth-menu.clientWidth:0,
    categoryInk:heading?getComputedStyle(heading).color:null,
  };
}
async function read(url,c,screenshot) {
  const page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push({base:url,...c,message:e.message}));
  await page.route('**/api/**',route=>route.request().method()==='GET'?route.continue():(writes.push(route.request().url()),route.abort()));
  try {
    const params=new URLSearchParams({device:c.device,view:'actual',embedded:'1',layoutMode:c.layout,lang:c.lang,callPreview:'on',orderPreview:'on'});
    await page.goto(`${url}/templates/${c.key}/preview?${params}`,{waitUntil:'domcontentloaded',timeout:60000});
    await page.evaluate(()=>document.fonts.ready);
    await page.locator(c.device==='mobile'?'[data-mobile-brand-fit="ready"]':'[data-native-ready="true"],[data-paged-ready="true"]').first().waitFor({timeout:45000});
    await page.waitForTimeout(650);
    const metrics=await page.evaluate(measure);
    assert.deepEqual(metrics.viewport,[c.width,c.height]);
    assert.ok(metrics.overflow<=1 && metrics.innerOverflow<=1,'no horizontal clipping');
    assert.deepEqual(getMenuPriceAlignmentFailures(await page.evaluate(measureMenuPriceAlignment)),[]);
    if(c.device==='mobile') {
      const rhythm=await page.evaluate(measureOnePageMobileRhythm);
      // REAL MATCHA's delegated mobile wrapper already uses the approved 26px
      // heading gap; the shared legacy checker otherwise expects 24px.
      if(c.key==='cafe_design_a') {
        assert.ok(rhythm.categories.every(category=>Math.abs(category.headingGap-26)<.25),'preserve approved Matcha 26px mobile heading gap');
        rhythm.categories=rhythm.categories.map(category=>({...category,headingGap:24}));
      }
      assert.deepEqual(getOnePageMobileRhythmFailures(rhythm),[]);
    }
    if(screenshot)await page.screenshot({path:`${output}/${c.key}-${c.device}-${c.width}-${c.layout}-${c.lang}.png`});
    return metrics;
  } finally {await page.close();}
}
try {
  for(const c of cases) {
    const old=await read(baseline,c,false),current=await read(base,c,c.lang==='ko'&&c.device!=='mobile'&&keys.includes(c.key));
    assert.deepEqual(current.roles,old.roles,'native fonts, sizes, weights and colors preserved');
    assert.deepEqual(current.names,old.names,'registered products preserved');
    assert.deepEqual(current.itemGaps,old.itemGaps,'ordinary item/category rhythms preserved');
    if(c.device==='mobile'||!keys.includes(c.key)||c.key==='cafe_design_a') {
      assert.deepEqual(current.units,old.units,'unaffected geometry preserved');
      assert.deepEqual(current.allItemBoxes,old.allItemBoxes,'unaffected product geometry preserved');
      assert.deepEqual(current.menu,old.menu,'unaffected menu insets preserved');
    }
    if(c.key==='cafe_mocha_forest_a'&&c.device!=='mobile') {
      const expected=Math.max(32,Math.min(Math.min(c.width,c.height)*.042,68));
      assert.ok(Math.abs(current.topInset-expected)<1,'common outer inset');
      if(current.gutter!==null)assert.ok(Math.abs(current.gutter-expected)<1,'common column gutter');
      assert.ok(current.headingClearances.every(h=>h.border==='rgba(0, 0, 0, 0)'),'Mocha keeps unruled headings');
      assert.ok(current.headingClearances[0].titleToName>old.headingClearances[0].titleToName+5,'heading breathing room actually increases');
      const matcha=results.find(r=>r.key==='cafe_design_a'&&r.device===c.device&&r.width===c.width&&r.height===c.height&&r.layout===c.layout&&r.lang===c.lang);
      if(matcha)assert.ok(Math.abs(current.headingClearances[0].titleToName-matcha.current.headingClearances[0].titleToName)<1,'first heading clearance matches Matcha');
    }
    results.push({...c,before:old,current});
    await fs.writeFile(`${output}/report.json`,JSON.stringify({base,baseline,results,errors,writes},null,2));
    console.log(`PASS ${c.key} ${c.device} ${c.width} ${c.layout} ${c.lang}`);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log(`PASS ${results.length} spacing/palette/mobile cases`);
} finally {await browser.close();}
