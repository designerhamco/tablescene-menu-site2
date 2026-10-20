import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/default-type-balance';
const capture=process.env.TYPE_BALANCE_CAPTURE==='1',previous=process.env.TYPE_BALANCE_BASELINE?JSON.parse(await fs.readFile(process.env.TYPE_BALANCE_BASELINE,'utf8')).results:[];
const designs=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','dining-full-page','dining-sidebar'];
const sizes=process.env.TYPE_BALANCE_SMOKE==='1'?[['tablet',1180,820],['mobile',320,740]]:[['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',320,740],['mobile',390,844]];
const cases=designs.flatMap(design=>sizes.map(size=>[design,design.startsWith('basic')?'cafe_design_a':design==='dining-sidebar'?'dining_aube_table_b':'dining_aube_table_a',...size]));
if(process.env.TYPE_BALANCE_SMOKE!=='1')for(const key of ['cafe_design_a','dining_aube_table_a','dining_aube_table_b'])for(const size of [sizes[0],sizes[1],sizes.at(-1)])cases.push(['',key,...size]);
await fs.mkdir(out,{recursive:true});const b=await chromium.launch(),results=[],errors=[],writes=[];
try{for(const [design,key,device,width,height] of cases){
 const id=`${design||key}-${device}-${width}`,p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 try{
 await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({design,device,view:'actual',callPreview:'on',orderPreview:'on'}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
 if(key.startsWith('dining')){
  const nav=p.locator('.aube-table-pagination-dots button, .aube-table-sidebar-list button, .aube-table-mobile-page-tabs button').filter({visible:true});await nav.last().click();await p.waitForTimeout(400);
 }else if(device!=='mobile')await p.locator('[data-paged-ready=true]').waitFor();else await p.locator('[data-mobile-brand-fit=ready]').waitFor();
 const value=await p.evaluate(()=>{
  const root=document.querySelector('[data-scroll-template], .aube-table-root, [data-cafe-a-mobile-style=true]'),dining=root.matches('.aube-table-root');
  const select=s=>[...root.querySelectorAll(s)].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[data-measure-id]'));
  const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
  const fonts=s=>select(s).map(e=>({text:e.textContent.replace(/\d{2}:\d{2}:\d{2}/g,'CLOCK'),size:parseFloat(getComputedStyle(e).fontSize)}));
  const items=select(dining?'.aube-table-item':'[data-cafe-a-menu-item]'),first=items[0]?.getBoundingClientRect().top||0;
  const image=root.querySelector('.cafe-a-cover-frame'),slot=root.querySelector('[data-portrait-cover-slot]');
  return {viewport:[innerWidth,innerHeight],outerWidth:document.documentElement.scrollWidth,
   names:fonts(dining?'.aube-table-item h3':'.cafe-a-menu-title'),prices:fonts(dining?'.aube-table-item-price':'.cafe-a-menu-price'),secondary:fonts(dining?'.aube-table-item-secondary':'.cafe-a-menu-meta'),descriptions:fonts(dining?'.aube-table-item-description':'[data-cafe-a-menu-description]'),
   headings:fonts(dining?'.aube-table-category h2, .aube-table-page-header h1':'.cafe-a-category-title'),
   mobileItems:items.map(e=>{const r=rect(e);r.y-=first;r.bottom-=first;return r;}),image:rect(image),slot:rect(slot),actions:rect(root.querySelector('[data-scroll-actions]')),
   alerts:select('[role=alert]').map(e=>e.textContent).filter(Boolean)};
 });
 assert.equal(value.outerWidth,width);assert.deepEqual(value.alerts,[]);
 if(!capture){
 const old=previous.find(r=>r.id===id)?.value;
 if(old){
  for(const role of ['names','prices','secondary','descriptions']){
   assert.deepEqual(value[role].map(x=>x.text),old[role].map(x=>x.text));
   for(const [i,font]of value[role].entries()){
    const expected=design&&device!=='mobile'?.94:1;
    assert.ok(Math.abs(font.size/old[role][i].size-expected)<.002,`${id} ${role}: ${font.size}/${old[role][i].size}`);
   }
  }
  assert.deepEqual(value.headings,old.headings,'category and page title sizes stay unchanged');
  if(device==='mobile')assert.deepEqual(value.mobileItems,old.mobileItems,'mobile item geometry stays unchanged');
 }
 if(value.slot&&device!=='mobile'){
  assert.ok(Math.abs(value.image.width/value.image.height-.8)<.01);
  assert.ok(Math.abs(value.image.bottom-value.slot.bottom)<1,'portrait image sits at the bottom of the available rail');
  if(design==='basic-center-column')assert.ok(value.actions.y-value.image.bottom>=20&&value.actions.y-value.image.bottom<=25,'actions follow the bottom-aligned image with the original gap');
 }
 }
 await p.screenshot({path:`${out}/${id}.png`});results.push({id,value});console.log('PASS',id);
 }finally{await p.close();}
}}finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors,writes},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
