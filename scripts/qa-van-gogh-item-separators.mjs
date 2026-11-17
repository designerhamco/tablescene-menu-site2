import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { measureMenuPriceAlignment, getMenuPriceAlignmentFailures } from './lib/menu-price-alignment.mjs';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures } from './lib/one-page-mobile-rhythm.mjs';

const base = process.env.VAN_GOGH_SEPARATOR_QA_BASE || 'http://localhost:3019';
const out = process.env.VAN_GOGH_SEPARATOR_QA_OUTPUT || '/private/tmp/van-gogh-item-separators';
const smoke = process.env.VAN_GOGH_SEPARATOR_QA_SMOKE === '1';
const cases = [];
for (const [device, width, height] of smoke ? [['mobile',390,844],['tablet',820,1180],['pc',1440,900]] : [['mobile',320,844],['mobile',390,844],['mobile',430,932],['tablet',768,1024],['tablet',820,1180],['tablet',1180,820],['pc',1440,900],['pc',1920,1080]]) {
  for (const layout of device === 'mobile' ? ['orderedBalancedFit'] : ['orderedBalancedFit','orderedFit']) cases.push({device,width,height,layout});
}
if (!smoke) for (const lang of ['en','zh','ja']) for (const [device,width,height] of [['mobile',390,844],['pc',1440,900]]) cases.push({device,width,height,lang});
for (const [secondary, descriptions] of smoke ? [['off','off']] : [['off','on'],['on','off'],['off','off']]) cases.push({device:'pc',width:1440,height:900,secondary,descriptions});
for (const [device,width,height] of [['mobile',390,844],['tablet',820,1180],['pc',1440,900]]) for (const descriptions of ['on','off']) cases.push({device,width,height,descriptions,custom:true});
for (const [device,width,height] of [['mobile',390,844],['tablet',820,1180]]) cases.push({device,width,height,images:'on'});
if (process.env.VAN_GOGH_SEPARATOR_QA_IMAGES_ONLY === '1') cases.splice(0,cases.length,...cases.filter(c=>c.images));
const colors = {supporting:'#805D3A',category:'#2C5C91',product:'#25744F',price:'#9D324D'};
const browser = await chromium.launch(), results = [], errors = [], writes = [];
await mkdir(out,{recursive:true});

function measure() {
  const root = document.querySelector('.cafe-a-typography');
  const rows = [...root.querySelectorAll('[data-cafe-a-menu-item]')].filter(e => e.checkVisibility() && !e.closest('[inert]'));
  return rows.map(row => {
    const host = row.closest('[data-native-unit]') || row.closest('[data-cafe-a-item-stack]');
    const next = host?.nextElementSibling;
    const nextRow = next?.matches('[data-native-unit][data-kind="item"], [data-cafe-a-item-stack]') ? next.querySelector('[data-cafe-a-menu-item]') : null;
    const r = row.getBoundingClientRect(), style = getComputedStyle(row,'::after');
    const shown = style.content !== 'none' && style.content !== 'normal';
    const desc = row.querySelector('.cafe-a-menu-description');
    const lineTop = r.top + parseFloat(style.top), lineHeight = parseFloat(style.height);
    return {id:host?.getAttribute('data-native-unit') || row.textContent.slice(0,35),expected:Boolean(nextRow),shown,color:style.color,descriptionColor:desc && row.dataset.cafeASoldOut !== 'true' ? getComputedStyle(desc).color : null,
      thickness:lineHeight,width:parseFloat(style.width),rowWidth:r.width,
      before:lineTop-r.bottom,after:nextRow ? nextRow.getBoundingClientRect().top-lineTop-lineHeight : null,
      gap:nextRow ? nextRow.getBoundingClientRect().top-r.bottom : null,rhythm:row.dataset.cafeAItemRhythm,
      rect:[r.x,r.y,r.width,r.height]};
  });
}
try {
  for (const c of cases) {
    const page = await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});
    page.on('pageerror',e => errors.push(e.message));
    await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()),route.abort()));
    const params = new URLSearchParams({view:'actual',device:c.device,lang:c.lang || 'ko',layoutMode:c.layout || 'orderedBalancedFit',secondaryNamesPreview:c.secondary || 'on',descriptionsPreview:c.descriptions || 'on'});
    if (c.images) params.set('imagesPreview',c.images);
    if (c.custom) params.set('designPreview',JSON.stringify({textColorGroupsVersion:2,textColors:colors}));
    await page.goto(`${base}/templates/cafe_van_gogh_a/preview?${params}`,{waitUntil:'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    if(c.device !== 'mobile') await page.locator('[data-native-ready="true"]').filter({visible:true}).first().waitFor();
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => [innerWidth,innerHeight]),[c.width,c.height]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth-innerWidth),0);
    if(c.images && c.device === 'mobile') assert.ok(await page.locator('.cafe-a-menu-item-image-slot').filter({visible:true}).count(),'mobile image rows exercised');
    if(c.images && c.device !== 'mobile') assert.equal(await page.locator('.cafe-a-menu-item-image-slot').filter({visible:true}).count(),0,'native PC/tablet image suppression stays unchanged');
    const rows = await page.evaluate(measure);
    assert.ok(rows.length > 5);
    assert.ok(rows.some(r => r.shown));
    for (const row of rows) {
      assert.equal(row.shown,row.expected,`terminal/boundary separator: ${JSON.stringify(row)}`);
      if(!row.shown) continue;
      assert.equal(row.thickness,1);
      assert.ok(Math.abs(row.width-row.rowWidth)<.1);
      assert.ok(row.before>0 && row.after>0);
      assert.ok(Math.abs(row.before-row.after)<.15,`centered gap: ${JSON.stringify(row)}`);
      if(row.descriptionColor) assert.equal(row.color,row.descriptionColor);
      if(c.custom) assert.equal(row.color,'rgb(128, 93, 58)');
      if(c.device === 'mobile') assert.ok(Math.abs(row.gap-20)<.1);
    }
    const prices = await page.evaluate(measureMenuPriceAlignment);
    await page.locator('[data-menu-item-separator]').evaluateAll(es=>es.forEach(e=>{e.dataset.qaSeparator='';e.removeAttribute('data-menu-item-separator');}));
    const withoutRules = await page.evaluate(measure);
    assert.deepEqual(withoutRules.map(r=>r.rect),rows.map(r=>r.rect),'separators add no layout height or change packing');
    assert.deepEqual(await page.evaluate(measureMenuPriceAlignment),prices,'separator styles preserve all price positions');
    await page.locator('[data-qa-separator]').evaluateAll(es=>es.forEach(e=>{e.dataset.menuItemSeparator='';e.removeAttribute('data-qa-separator');}));
    // Image-enabled native tablet pricing keeps its pre-existing layout. Compare
    // positions above; do not broaden this separator change into a price-layout fix.
    if(!c.images) assert.deepEqual(getMenuPriceAlignmentFailures(prices),[]);
    if(c.device === 'mobile') assert.deepEqual(getOnePageMobileRhythmFailures(await page.evaluate(measureOnePageMobileRhythm)),[]);
    if(!c.custom && !c.secondary && (!c.lang || c.lang === 'en') && [390,1440].includes(c.width)) {await page.waitForTimeout(400);await page.screenshot({path:`${out}/${c.device}-${c.width}-${c.lang || 'ko'}-${c.layout || 'grouped'}.png`,fullPage:c.device === 'mobile'});}
    results.push({...c,rows});console.log('PASS',c.device,c.width,c.lang || 'ko',c.layout || 'grouped',c.secondary || 'on',c.descriptions || 'on',c.custom ? 'custom-colors' : 'default');
    await page.close();
  }
  if(!smoke && process.env.VAN_GOGH_SEPARATOR_QA_IMAGES_ONLY !== '1') {
    const pcRhythms = new Set(results.filter(c=>c.device !== 'mobile').flatMap(c=>c.rows.filter(r=>r.shown).map(r=>r.rhythm)));
    assert.ok(pcRhythms.has('1.1') && pcRhythms.has('1.2'),'both sparse-copy multipliers exercised');
  }
  for(const key of ['cafe_sunday_line_a','cafe_mocha_forest_a','restaurant_onue_a','dining_aube_table_a']) {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    await page.goto(`${base}/templates/${key}/preview?view=actual&device=pc`,{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-menu-item-separator]').count(),0,`${key} stays unchanged`);
    await page.close();results.push({key,excluded:true});console.log('PASS excluded',key);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  await writeFile(`${out}/report.json`,JSON.stringify({base,results,errors,writes},null,2));
  console.log(JSON.stringify({base,checked:results.length,failed:0,out}));
} finally {await browser.close();}
