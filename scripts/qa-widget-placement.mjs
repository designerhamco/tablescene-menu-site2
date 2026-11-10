import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.WIDGET_QA_BASE||'http://localhost:3027';
const output=process.env.WIDGET_QA_OUTPUT||'/private/tmp/widget-flow-qa';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[],writes=[];
const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'];
const devices=[['pc',1440,900],['tablet',1180,820],['mobile',390,844]];
const measure=()=>{
 const visible=e=>!e.closest('[inert]')&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
 const query=selector=>[...document.querySelectorAll(selector)].filter(visible);
 const widgets=query('[data-cafe-a-widget-block]');
 const stream=query('[data-native-unit],[data-paged-block],[data-album-category]').filter(e=>e.querySelector('[data-cafe-a-widget-block]')||e.matches('[data-kind="item"]')||e.querySelector('.cafe-a-menu-item'));
 const order=(stream.length?stream:query('.cafe-a-menu-item,[data-cafe-a-widget-block]')).map(e=>e.matches('[data-cafe-a-widget-block]')||e.querySelector('[data-cafe-a-widget-block]')?'widget':'item');
 const notes=query('[data-native-notices],[data-paged-notices]:not([data-scroll-header-copy]),[data-cafe-a-footer-info]')[0];
 const last=query('[data-native-unit],[data-paged-block],[data-album-category],.cafe-a-menu-item,[data-cafe-a-widget-block]').at(-1);
 const divider=query('[data-menu-column-divider]').map(e=>{const right=e.closest('[data-native-column]'),left=right.previousElementSibling;return {left:rect(e).left-rect(left).right,right:rect(right).left-rect(e).right,width:rect(e).width,inset:parseFloat(getComputedStyle(document.querySelector('[data-native-scroll]')).paddingRight)};});
 const menu=document.querySelector('[data-native-menu],[data-scroll-menu]');
 const dining=query('[data-aube-table-course],[data-dining-widget]');
 const cover=document.querySelector('[data-aube-table-cover]'),coverNotes=cover?.querySelector('[data-dining-cover-notices]');
 const nav=cover?.closest('.aube-table-root')?.querySelector('.aube-table-pagination');
 const children=coverNotes?[...coverNotes.children]:[];
 return {viewport:[innerWidth,innerHeight],outer:document.documentElement.scrollWidth,order,widgets:widgets.length,notes:rect(notes),last:rect(last),divider,
 topNotes:query('[data-cafe-a-topline-mobile-notices],.cafe-a-topline-notice-text,[data-basic-top-row] [data-scroll-header-copy]').length,
 menu:menu?{...rect(menu),scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight,scrollTop:menu.scrollTop}:null,
 dining:dining.map(e=>e.hasAttribute('data-dining-widget')?'widget':'category'),courseItems:dining.filter(e=>e.hasAttribute('data-aube-table-course')).map(e=>e.querySelectorAll('.aube-table-item').length),innerWidgets:query('[data-aube-table-course] [data-dining-widget]').length,
 cover:rect(cover),coverNotes:rect(coverNotes),coverBottomInset:parseFloat(cover?.querySelector('.aube-table-cover-bottom')?getComputedStyle(cover.querySelector('.aube-table-cover-bottom')).bottom:'0'),mobileDock:rect(document.querySelector('[data-table-mobile-dock]')),floatingCall:rect(document.querySelector('[data-dining-floating-call]')),coverColumns:children.map(rect),coverInk:coverNotes?getComputedStyle(coverNotes).color:null,coverAlignment:coverNotes?getComputedStyle(coverNotes).textAlign:null,
 coverCopy:rect(cover?.querySelector('.aube-table-cover-copy h1')),coverDescription:rect(cover?.querySelector('.aube-table-cover-description')),nav:rect(nav),navPosition:nav?getComputedStyle(nav).position:null,navBottom:nav?parseFloat(getComputedStyle(nav).bottom):null,coverOverflow:children.some(e=>e.scrollWidth>e.clientWidth+1)};
};
async function run(c){
 const page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(writes.push(route.request().url()),route.abort()));
 try{
  const query=new URLSearchParams({template:c.key,device:c.device,variant:c.variant||'bottom',layout:c.layout||'orderedBalancedFit',...(c.design?{design:c.design}:{}),...(c.multi?{multi:'on'}:{}),...(c.call?{call:'on'}:{}),...(c.cover?{cover:'on',notices:String(c.notices??3)}:{}),...(c.longNotice?{longNotice:'on'}:{}),...(c.coverImage?{coverImage:c.coverImage}:{})});
  await page.goto(`${base}/__qa/widget-placement?${query}`,{waitUntil:'domcontentloaded'});
  if(c.key.startsWith('dining'))await page.waitForFunction(cover=>{const e=document.querySelector(cover?'.aube-table-cover':'.aube-table-page');return e&&(cover?getComputedStyle(e).display==='grid':parseFloat(getComputedStyle(e).paddingTop)>10);},c.cover??false);
  await page.evaluate(()=>document.fonts.ready);
  if(c.device!=='mobile'&&!c.key.startsWith('dining')&&!c.multi)await page.locator('[data-native-ready="true"],[data-paged-ready="true"]').waitFor();
  await page.waitForTimeout(250);
  let m=await page.evaluate(measure);
  assert.deepEqual(m.viewport,[c.width,c.height]);assert.ok(m.outer<=c.width+1,'no horizontal page overflow');
  if(c.cover){
   assert.ok(m.cover,'cover visible');
   assert.equal(m.coverColumns.length,c.notices??3);
   if(m.nav){assert.equal(m.navPosition,'fixed','pagination keeps its viewport anchor');assert.ok(Math.abs(c.height-m.nav.bottom-m.navBottom)<2,'pagination keeps its CSS bottom offset independent of notices');}
   if(m.coverNotes){
    assert.ok(Math.abs(m.cover.bottom-m.coverNotes.bottom-m.coverBottomInset)<2,'notices stay at cover inner bottom');
    const widths=m.coverColumns.map(r=>r.width);assert.ok(Math.max(...widths)-Math.min(...widths)<1,'equal notice columns');
    if(c.device==='mobile'){
     assert.equal(m.coverAlignment,'center','mobile notice copy remains centered');
     assert.ok(m.coverColumns.every(r=>Math.abs(r.left-m.coverNotes.left)<1&&Math.abs(r.right-m.coverNotes.right)<1),'mobile notices fill one centered column');
     assert.ok(m.coverColumns.every((r,i)=>i===0||r.top>=m.coverColumns[i-1].bottom-1),'mobile notices stack in registered order');
    }else assert.ok(m.coverColumns.every(r=>Math.abs(r.bottom-m.coverNotes.bottom)<1),'PC/tablet notices remain one horizontal row');
    assert.ok(!m.coverOverflow,'long notices wrap without horizontal clipping');
    const copy=m.coverDescription||m.coverCopy;
    assert.ok(copy.bottom<m.coverNotes.top-4,'cover identity does not overlap notices');
    if(m.nav)assert.ok(m.coverNotes.bottom<m.nav.top,'pagination below notices');
    if(m.mobileDock)assert.ok(m.coverNotes.bottom<=m.mobileDock.top-4,'mobile call dock leaves notices readable');
    if(m.floatingCall)assert.ok(m.floatingCall.bottom<=m.coverNotes.top-4,'floating call stays above cover notices');
   }
   if(m.nav){await page.locator('.aube-table-pagination-dot').nth(1).click();await page.locator('[data-aube-table-course]').first().waitFor();await page.locator('.aube-table-pagination-dot').nth(0).click();await page.locator('[data-aube-table-cover]').waitFor();await page.waitForTimeout(100);const restored=await page.evaluate(measure);if(restored.coverNotes)assert.ok(Math.abs(restored.cover.bottom-restored.coverNotes.bottom-restored.coverBottomInset)<2,'cover notices remeasure after returning to cover');}
  }else{
   const expected=c.variant==='none'||c.variant==='hidden'?0:c.variant==='multiple'?2:1;
   assert.equal(m.widgets,expected,'each visible widget renders exactly once');
   const order=c.key.startsWith('dining')?m.dining:m.order;
   if(expected){
    if(c.variant==='first')assert.equal(order[0],'widget');
    else if(c.variant==='last')assert.equal(order.at(-1),'widget');
    else {const at=order.indexOf('widget');assert.ok(at>0&&order.lastIndexOf(c.key.startsWith('dining')?'category':'item')>at,'legacy bottom preserves the registered middle insertion point');}
   }
   if(c.key.startsWith('dining')){assert.equal(m.innerWidgets,0);assert.ok(m.courseItems.every(n=>n===2),'widget stays outside the complete category');}
   else {
    const top=c.design?c.design==='basic-top-row'||c.design==='basic-top-row-album':c.key==='cafe_sunday_line_a'||c.key==='cafe_van_gogh_a';
    if(c.variant!=='no-notices'){
     if(top)assert.ok(m.topNotes>0&&!m.notes,'ordinary top-row notices retain their upper anchor');
     else {assert.ok(m.notes&&m.last,'notices follow content');const gap=m.notes.top-m.last.bottom;assert.ok(gap>=-1&&gap<115,`natural notice gap, no viewport spacer (${gap})`);}
    }else assert.equal(m.notes,null);
    for(const d of m.divider){assert.ok(Math.abs(d.left-d.inset)<1&&Math.abs(d.right-d.inset)<1,`divider inset ${JSON.stringify(d)}`);assert.equal(d.width,1);}
    if(m.menu){await page.locator('[data-native-menu],[data-scroll-menu]').evaluate(e=>e.scrollTo({top:e.scrollHeight,behavior:'instant'}));m=await page.evaluate(measure);assert.ok(m.menu.scrollHeight-m.menu.clientHeight-m.menu.scrollTop<2,'scroll end reachable');if(m.notes)assert.ok(m.notes.bottom<=m.menu.bottom+1,'last notices remain reachable');}
   }
  }
  results.push({...c,metrics:m});console.log('PASS',JSON.stringify(c));
 }catch(e){failures.push({...c,error:e.message});console.log('FAIL',JSON.stringify(failures.at(-1)));await page.screenshot({path:`${output}/fail-${failures.length}-${c.key}.png`});}
 finally{await page.close();}
}
const cases=[];
for(const key of keys)for(const [device,width,height] of devices)cases.push({key,device,width,height});
for(const key of keys)for(const variant of ['first','last','no-notices','multiple','hidden','none','long'])cases.push({key,device:'pc',width:1440,height:900,variant,layout:'orderedFit'});
for(const design of ['basic-first-column','basic-top-row','basic-top-row-left-logo','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album'])for(const [device,width,height] of [devices[1],devices[2]])cases.push({key:'cafe_design_a',design,device,width,height});
for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const [device,width,height] of devices)for(const variant of ['bottom','course'])cases.push({key,device,width,height,variant});
for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const [device,width,height] of devices)for(const notices of [0,1,2,3])cases.push({key,device,width,height,cover:true,notices,call:true});
for(const design of ['dining-full-page','dining-sidebar','dining-full-page-album','dining-sidebar-album'])for(const [device,width,height] of [devices[1],devices[2]]){
 cases.push({key:design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a',design,device,width,height,variant:'course'});
 cases.push({key:design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a',design,device,width,height,cover:true,notices:3,coverImage:'off',longNotice:true});
}
if(process.env.WIDGET_QA_CASES==='extra'){cases.length=0;for(const key of keys){for(const [device,width,height] of [devices[0],devices[1]])cases.push({key,device,width,height,call:true});for(const width of [320,430])cases.push({key,device:'mobile',width,height:844,call:true});}for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const [device,width,height] of devices)cases.push({key,device,width,height,cover:true,notices:3,call:true,coverImage:'off',longNotice:true});}
const selected=process.env.WIDGET_QA_CASES==='cover-edge'?[...cases.filter(c=>c.cover&&c.design).map(c=>({...c,call:true})),...['dining_aube_table_a','dining_aube_table_b'].flatMap(key=>devices.map(([device,width,height])=>({key,device,width,height,cover:true,notices:3,call:true,coverImage:'off',longNotice:true}))),...['dining_aube_table_a','dining_aube_table_b'].flatMap(key=>[320,430].map(width=>({key,device:'mobile',width,height:844,cover:true,notices:3,call:true,longNotice:true})))]:process.env.WIDGET_QA_CASES==='covers'?cases.filter(c=>c.cover&&!c.design):process.env.WIDGET_QA_CASES==='designs'?cases.filter(c=>c.design):process.env.WIDGET_QA_CASES==='smoke'?[cases[1],cases[4],cases[13],cases.find(c=>c.cover&&c.device==='mobile'&&c.notices===3)]:process.env.WIDGET_QA_CASES==='retry'?JSON.parse(await fs.readFile(`${output}/results.json`,'utf8')).failures.map(({error,...c})=>{void error;return c;}):cases;
for(let i=0;i<selected.length;i+=2)await Promise.all(selected.slice(i,i+2).map(run));
await browser.close();await fs.writeFile(`${output}/results.json`,JSON.stringify({results,failures,errors,writes},null,2));
console.log(JSON.stringify({passed:results.length,failed:failures.length,errors,writes}));
if(failures.length||errors.length||writes.length)process.exitCode=1;
