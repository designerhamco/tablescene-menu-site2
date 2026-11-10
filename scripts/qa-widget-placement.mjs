import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.WIDGET_QA_BASE || 'http://localhost:3026';
const output=process.env.WIDGET_QA_OUTPUT || '/private/tmp/widget-placement-qa';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch();
const results=[],failures=[],errors=[],writes=[];
const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'];
async function newPage(width,height){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  if(!['GET','HEAD','OPTIONS'].includes(route.request().method())) {writes.push(route.request().url());return route.abort();}
  return route.continue();
 });return page;
}
const measure=()=>{
 const visible=e=>!e.closest('[inert]')&&e.getBoundingClientRect().width>0;
 const rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};
 const cols=[...document.querySelectorAll('[data-native-column],[data-paged-column]')];
 const widgets=[...document.querySelectorAll('[data-cafe-a-widget-block]')].filter(visible);
 const bottom=widgets.filter(e=>e.closest('[data-widget-placement="bottom"]'));
 const dock=bottom.map(e=>e.closest('[data-native-unit],[data-paged-block],[data-album-category]'));
 const lastcol=dock.at(-1)?.closest('[data-native-column],[data-paged-column]');
 const stream=document.querySelector('[data-album-sections]');
 const notes=(lastcol||stream)?.querySelector('[data-native-notices],[data-paged-notices]');
 const content=lastcol||stream;
 const style=content&&getComputedStyle(content);
 const floor=content ? rect(content).bottom-parseFloat(style.paddingBottom) : null;
 const actualEnd=notes?.textContent.trim()?rect(notes).bottom:dock.length?rect(dock.at(-1)).bottom:null;
 const divider=[...document.querySelectorAll('[data-menu-column-divider]')].map(e=>{
  const right=e.closest('[data-native-column]'),left=right.previousElementSibling;
  return {left:rect(e).left-rect(left).right,right:rect(right).left-rect(e).right,width:rect(e).width,inset:parseFloat(getComputedStyle(document.querySelector('[data-native-scroll]')).paddingRight)};
 });
 const menu=document.querySelector('[data-native-menu],[data-scroll-menu]');
 const kinds=[...document.querySelectorAll('[data-native-unit],[data-paged-block],[data-album-category]')].filter(visible).map(e=>e.textContent.trim());
 return {viewport:[innerWidth,innerHeight],outer:document.documentElement.scrollWidth,widgets:widgets.length,bottom:bottom.length,dock:dock.map(rect),notes:notes?.textContent.trim()?rect(notes):null,floor,actualEnd,cols:cols.length,divider,kinds,menu:menu?{...rect(menu),scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight,scrollTop:menu.scrollTop}:null,
 mobileOrder:[...document.querySelectorAll('[data-cafe-a-widget-block],.cafe-a-menu-item')].filter(visible).map(e=>e.matches('[data-cafe-a-widget-block]')?'widget':'item'),
 dining:[...document.querySelectorAll('[data-aube-table-course],[data-dining-widget]')].filter(visible).map(e=>e.hasAttribute('data-dining-widget')?'widget':'category')};
};
async function run(c){
 const page=await newPage(c.width,c.height);
 try{
  const query=new URLSearchParams({template:c.key,device:c.device,variant:c.variant||'bottom',layout:c.layout||'orderedBalancedFit',...(c.design?{design:c.design}:{}),...(c.multi?{multi:'on'}:{}),...(c.call?{call:'on'}:{})});
  await page.goto(`${base}/__qa/widget-placement?${query}`,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  if(c.device!=='mobile'&&!c.key.startsWith('dining')&&!c.multi)await page.locator('[data-native-ready="true"],[data-paged-ready="true"]').waitFor();
  await page.waitForTimeout(200);
  const m=await page.evaluate(measure);
  assert.deepEqual(m.viewport,[c.width,c.height]); assert.ok(m.outer<=c.width+1,'no outer horizontal overflow');
  assert.equal(m.widgets,c.variant==='multiple'?2:1,'each widget renders exactly once');
  if(c.key.startsWith('dining'))assert.deepEqual(m.dining,['category','widget','category'],'Dining legacy bottom setting becomes freely ordered flow');
  else if(c.device==='mobile') {
   const order=m.mobileOrder;
   if(c.variant==='flow')assert.ok(order.indexOf('widget')>0&&order.lastIndexOf('item')>order.indexOf('widget'),'mobile flow keeps insertion point');
   else assert.equal(order.at(-1),'widget','mobile bottom follows the final menu item');
   const spacing=await page.locator('[data-cafe-a-widget-block]').filter({visible:true}).evaluate(e=>{
    const first=e.getBoundingClientRect();const prev=[...document.querySelectorAll('.cafe-a-menu-item')].filter(n=>n.getBoundingClientRect().width>0).at(-1)?.getBoundingClientRect();return prev?first.top-prev.bottom:null;
   });
   if(c.variant!=='flow')assert.ok(spacing!==null&&spacing<110,'mobile has natural reading spacing, no viewport bottom spacer');
  } else if(!c.multi) {
   if(c.variant==='flow'){
    const at=m.kinds.findIndex(t=>t.includes('검수 위젯 1'));assert.ok(at>0&&at<m.kinds.length-1,'PC/tablet flow retains exact insertion point');
   } else {
    assert.equal(m.bottom,m.widgets,'PC/tablet bottom metadata reaches visible renderer');
    assert.ok(Math.abs(m.actualEnd-m.floor)<1.2,`bottom edge aligns with last column inner floor: ${m.actualEnd} vs ${m.floor}`);
    if(m.notes)assert.ok(m.dock.at(-1).bottom<=m.notes.top+1,'widgets precede notices');
    if(m.dock.length>1)assert.ok(m.dock[0].bottom<=m.dock[1].top,'widget dock stack does not overlap');
   }
   for(const d of m.divider){assert.ok(Math.abs(d.left-d.inset)<1&&Math.abs(d.right-d.inset)<1,`divider whitespace equals page inset: ${JSON.stringify(d)}`);assert.equal(d.width,1);}
   await page.locator('[data-native-menu],[data-scroll-menu]').evaluate(e=>e.scrollTo({top:e.scrollHeight,behavior:'instant'}));
   const end=await page.evaluate(measure);
   if(end.menu)assert.ok(end.menu.scrollHeight-end.menu.clientHeight-end.menu.scrollTop<2,'scroll bottom is reachable');
   const bottom=end.notes?.bottom ?? end.dock.at(-1)?.bottom;
   if(bottom)assert.ok(bottom<=end.menu.bottom+1,'widget and notices reachable within viewport');
  }
  results.push({...c,columns:m.cols,dividers:m.divider});console.log('PASS',JSON.stringify(c));
  if(c.variant==='long'&&c.key==='cafe_mocha_forest_a')await page.screenshot({path:`${output}/mellow-dividers-${c.device}.png`});
 }catch(e){failures.push({...c,error:e.message});console.log('FAIL',JSON.stringify(failures.at(-1)));await page.screenshot({path:`${output}/fail-${c.key}-${c.device}-${c.variant||'bottom'}-${c.design||'native'}.png`});}
 finally{await page.close();}
}
const cases=[];
for(const key of keys)for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820],['mobile',390,844]])cases.push({key,device,width,height});
for(const key of keys)for(const variant of ['flow','no-notices','multiple','long'])cases.push({key,device:'pc',width:1440,height:900,variant,layout:'orderedFit'});
for(const design of ['basic-first-column','basic-top-row','basic-top-row-left-logo','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album'])for(const variant of ['bottom','flow'])cases.push({key:'cafe_design_a',device:'tablet',width:1180,height:820,design,variant});
for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820],['mobile',390,844]])cases.push({key,device,width,height});
for(const design of ['dining-full-page','dining-sidebar','dining-full-page-album','dining-sidebar-album'])cases.push({key:'dining_aube_table_a',device:'tablet',width:1180,height:820,design});
if(process.env.WIDGET_QA_CASES==='extra') {
 cases.length=0;
 for(const key of keys){
  for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820]])cases.push({key,device,width,height,call:true});
  for(const width of [320,430])cases.push({key,device:'mobile',width,height:844,call:true});
 }
 cases.push({key:'cafe_mocha_forest_a',device:'tablet',width:1180,height:820,variant:'long',layout:'orderedFit'});
 for(const design of ['basic-first-column-album','basic-top-row-album'])cases.push({key:'cafe_design_a',device:'tablet',width:1180,height:820,design,variant:'no-notices',layout:'orderedFit'});
}
const selected=cases.filter(c=>!process.env.WIDGET_QA_CASES || process.env.WIDGET_QA_CASES==='extra' || process.env.WIDGET_QA_CASES==='retry'&&(c.device==='mobile'||c.key.startsWith('dining')||c.design?.includes('album')) || process.env.WIDGET_QA_CASES==='failures'&&JSON.parse(process.env.WIDGET_QA_FAILURES||'[]').some(f=>JSON.stringify(f)===JSON.stringify(c)));
for(let i=0;i<selected.length;i+=2)await Promise.all(selected.slice(i,i+2).map(run));
await browser.close(); await fs.writeFile(`${output}/results.json`,JSON.stringify({results,failures,errors,writes},null,2));
console.log(JSON.stringify({passed:results.length,failed:failures.length,errors,writes}));
if(failures.length||errors.length||writes.length)process.exitCode=1;
