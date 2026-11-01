import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/onue-grouped';
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch(), results = [], failures = [], errors = [], writes = [];
const modes = ['', 'orderedBalancedFit', 'orderedFit'];
async function create(width, height) {
  const page = await browser.newPage({viewport:{width,height}, reducedMotion:'reduce'});
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.request().method() === 'GET' ? route.continue() : (writes.push(route.request().url()), route.abort()));
  return page;
}
async function run(c) {
  const page = await create(c.width, c.height);
  try {
    const query = new URLSearchParams({device:c.device,view:'actual',embedded:'1',lang:c.lang || 'ko',callPreview:c.call ? 'on':'off', ...c.options});
    if (c.mode) query.set('layoutMode',c.mode);
    await page.goto(`${base}/templates/${c.key || 'restaurant_onue_a'}/preview?${query}`,{waitUntil:'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    await page.locator(c.device === 'mobile' ? '[data-mobile-brand-fit=ready]' : '[data-native-ready=true]').filter({visible:true}).first().waitFor();
    const metrics = await page.evaluate(() => {
      const visible = e => !e.closest('[inert],[aria-hidden=true]') && e.getBoundingClientRect().width > 0;
      const board = document.querySelector('[data-native-scroll]');
      const intro = [...document.querySelectorAll('.cafe-a-panel-intro')].find(visible);
      const identity = intro?.querySelector('.cafe-a-panel-identity');
      const controls = intro?.querySelector('.cafe-a-panel-controls');
      const featured = intro?.querySelector('.cafe-a-featured-copy');
      const rect = e => e?.getBoundingClientRect();
      const r = rect(intro), i = rect(identity), control = rect(controls), f = rect(featured);
      const expected = [...document.querySelectorAll('[data-native-measure]')].map(e => ({id:e.dataset.nativeMeasure,kind:e.dataset.kind,title:e.querySelector('.cafe-a-category-title')?.textContent}));
      const groupById = new Map(); let group;
      for (const block of expected) { if (block.kind === 'heading') group = block.id; else if (block.kind === 'widget') group = undefined; if (group) groupById.set(block.id, group); }
      const groups = new Map();
      const shown = [...document.querySelectorAll('[data-native-column]')].flatMap((col,index) => [...col.querySelectorAll('[data-native-unit]')].map(e => {
        const id = e.dataset.nativeUnit, group = groupById.get(id);
        if (group) {if (!groups.has(group)) groups.set(group,new Set()); groups.get(group).add(index);}
        return id;
      }));
      return {viewport:[innerWidth,innerHeight],mode:board?.dataset.layoutMode,expected:expected.map(b=>b.id),shown,groups:[...groups].map(([id,columns])=>({id,columns:[...columns]})),items:[...document.querySelectorAll('[data-cafe-a-menu-item]')].filter(visible).length,overflow:document.documentElement.scrollWidth > innerWidth + 1,centerDelta:r&&i ? (i.top+i.bottom-r.top-r.bottom)/2 : null,identityClear:!i||!control||i.top>=control.bottom-1,featuredClear:!i||!f||i.bottom<=f.top-1,photo:!!intro,logo:!!identity?.querySelector('img'),mains:expected.find(b=>b.title?.includes('PASTA'))?.id};
    });
    assert.deepEqual(metrics.viewport,[c.width,c.height]);assert.equal(metrics.overflow,false);
    if (!c.key) assert.equal(metrics.items,20);
    if (c.device !== 'mobile') {
      const mode = c.mode || 'orderedBalancedFit'; assert.equal(metrics.mode,mode);
      assert.deepEqual(metrics.shown,metrics.expected,'headings and products remain in registered order, exactly once');
      if (mode === 'orderedBalancedFit') for (const group of metrics.groups) assert.equal(group.columns.length,1,`category stays in one track: ${group.id}`);
      assert.equal(metrics.identityClear,true);assert.equal(metrics.featuredClear,true);
      if (metrics.photo && !c.options?.featuredPreview) assert.ok(Math.abs(metrics.centerDelta)<1,`identity center error ${metrics.centerDelta}px`);
      const menu=page.locator('[data-native-menu]');await menu.evaluate(e=>e.scrollTo({top:e.scrollHeight,behavior:'instant'}));
      assert.ok(await menu.evaluate(e=>e.scrollHeight-e.clientHeight-e.scrollTop<2),'all menu content remains reachable');
      if (!c.key && c.width===1180 && !c.mode && !c.options) {await menu.evaluate(e=>e.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`${output}/onue-tablet-grouped-${c.lang || 'ko'}.png`});}
    } else assert.equal(await page.locator('[data-native-scroll]').count(),0);
    results.push({...c,requestedMode:c.mode || 'absent',...metrics});
  } catch (error) {const failure={...c,error:error.message};failures.push(failure);console.log(JSON.stringify(failure));}
  finally {await page.close();}
}
try {
  const jobs=[];
  for (const [device,width,height] of [['pc',1280,720],['pc',1440,900],['pc',1920,1080],['tablet',1180,820],['tablet',820,1180],['tablet',768,1024]]) for (const mode of modes) jobs.push(()=>run({device,width,height,mode}));
  for (const lang of ['en','zh','ja']) jobs.push(()=>run({device:'tablet',width:1180,height:820,lang}));
  for (const options of [{coverPreview:'off'},{logoPreview:'on'},{featuredPreview:'on'}]) for (const [device,width,height] of [['pc',1440,900],['tablet',1180,820]]) jobs.push(()=>run({device,width,height,options}));
  for (const width of [320,390,430]) for (const call of [false,true]) jobs.push(()=>run({device:'mobile',width,height:844,call}));
  for (const key of ['cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a']) jobs.push(()=>run({key,device:'tablet',width:1180,height:820}));
  for (let i=0;i<jobs.length;i+=3) await Promise.all(jobs.slice(i,i+3).map(job=>job()));
  for (const key of ['dining_aube_table_a','dining_aube_table_b','display_menu_a']) {
    const page=await create(1440,900);
    try {
      await page.goto(`${base}/templates/${key}/preview?view=actual&device=pc${key==='display_menu_a'?'&page=3':''}`,{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('[data-native-scroll]').count(),0,'excluded engine stays independent');
      assert.ok(await page.locator(key==='display_menu_a'?'.cafe-a-category-heading':'.aube-table-cover').count());
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      results.push({kind:'excluded-engine',key});
    } catch(error){failures.push({kind:'excluded-engine',key,error:error.message});}finally{await page.close();}
  }
  for (const mode of modes) {
    const page=await create(1440,1000);
    try {
      await page.goto(`${base}/templates/restaurant_onue_a/preview?device=tablet${mode?'&layoutMode='+mode:''}`,{waitUntil:'networkidle'});
      const selected=page.locator('[data-preview-layout-mode][aria-current=true]');await selected.waitFor();
      const selectedMode=await selected.getAttribute('data-preview-layout-mode');
      const frame=page.frameLocator('iframe');await frame.locator('[data-native-ready=true]').waitFor();
      assert.equal(selectedMode,mode||'orderedBalancedFit');assert.equal(await frame.locator('[data-native-scroll]').getAttribute('data-layout-mode'),selectedMode,'toolbar and iframe use the same initial mode');
      results.push({kind:'toolbar',mode:mode||'absent',selectedMode});
    } catch(error){failures.push({kind:'toolbar',mode,error:error.message});}finally{await page.close();}
  }
} finally {await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
