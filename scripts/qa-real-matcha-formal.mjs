import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {measureOnePageMobileRhythm, getOnePageMobileRhythmFailures} from './lib/one-page-mobile-rhythm.mjs';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/real-matcha-formal';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(), results=[], failures=[], errors=[], writes=[];
const cases=[];
for(const [device,width,height] of [['pc',1440,900],['pc',1920,1080],['tablet',1180,820],['tablet',820,1180],['tablet',768,1024],['mobile',320,844],['mobile',390,844],['mobile',430,932],['mobile',820,1180]])
 for(const layout of ['orderedBalancedFit','orderedFit'])cases.push({device,width,height,layout,lang:'ko',call:true,order:true});
for(const lang of ['en','zh','ja'])for(const [device,width,height] of [['tablet',820,1180],['mobile',390,844]])cases.push({device,width,height,layout:'orderedBalancedFit',lang,call:true,order:true});
for(const [call,order] of [[false,false],[true,false],[false,true]])cases.push({device:'tablet',width:1180,height:820,layout:'orderedFit',lang:'ko',call,order});
try {
 for(const c of cases){const p=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/public-menu/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 try{
  await p.goto(`${base}/templates/cafe_design_a/preview?`+new URLSearchParams({device:c.device,view:'actual',embedded:'1',layoutMode:c.layout,lang:c.lang,callPreview:c.call?'on':'off',orderPreview:c.order?'on':'off'}),{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForSelector(c.device==='mobile'?'[data-mobile-brand-fit=ready]':'[data-paged-ready=true]');
  await p.waitForTimeout(150);
  const m=await p.evaluate(()=>({viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1,items:[...document.querySelectorAll('article')].filter(e=>!e.closest('[aria-hidden=true]')&&e.getBoundingClientRect().height>0).length}));
  assert.deepEqual(m.viewport,[c.width,c.height]);assert.equal(m.overflow,false);assert.equal(m.items,18);
  if(c.device==='mobile'){
   assert.equal(await p.locator('[data-scroll-menu]').count(),0);
   assert.deepEqual(getOnePageMobileRhythmFailures(await p.evaluate(measureOnePageMobileRhythm)),[]);
  }else{
   assert.equal(await p.locator('[data-paged-layout]').getAttribute('data-paged-layout'),c.layout);
   assert.equal(await p.locator('[data-scroll-call]').count(),+c.call);assert.equal(await p.locator('[data-scroll-order]').count(),+c.order);
   const brand=await p.locator('[data-paged-brand]').boundingBox();const action=await p.locator('[data-scroll-actions]').count()?await p.locator('[data-scroll-actions]').boundingBox():null;
   const expected=await p.locator('[data-measure-id]').evaluateAll(es=>es.map(e=>e.dataset.measureId));
   const shown=await p.locator('[data-paged-column] [data-paged-block]').evaluateAll(es=>es.map(e=>e.dataset.pagedBlock));assert.deepEqual(shown,expected,'headings and products appear once in registered order');
   await p.locator('[data-scroll-menu]').evaluate(e=>e.scrollTo({top:e.scrollHeight,behavior:'instant'}));
   assert.deepEqual(await p.locator('[data-paged-brand]').boundingBox(),brand,'representative column stays fixed');
   if(action)assert.deepEqual(await p.locator('[data-scroll-actions]').boundingBox(),action,'dock stays fixed');
   const end=await p.locator('[data-scroll-menu]').evaluate(e=>({remaining:e.scrollHeight-e.clientHeight-e.scrollTop,bottom:e.getBoundingClientRect().bottom,last:e.querySelector('[data-paged-notices]').getBoundingClientRect().bottom}));
   assert.ok(end.remaining<2);assert.ok(end.last<=end.bottom+1,'final notices remain reachable above dock');
   await p.waitForFunction(()=>document.querySelector('[data-scroll-template]')?.dataset.scrollMore==='false');
   assert.equal(await p.getByRole('navigation',{name:'메뉴 페이지 이동'}).count(),0);
  }
  if(c.lang==='ko'&&c.layout==='orderedBalancedFit')await p.screenshot({path:`${output}/${c.device}-${c.width}.png`});
  results.push({...c,...m});
 }catch(e){failures.push({...c,error:e.message});}finally{await p.close();}}
 const toolbar=await browser.newPage({viewport:{width:1440,height:1000}});
 await toolbar.goto(base+'/templates/cafe_design_a/preview?device=tablet');
 const guide=toolbar.locator('[data-preview-guide-variant]');
 if(await guide.count())await guide.getByRole('button',{name:'닫기',exact:true}).click();
 assert.equal(await toolbar.locator('[data-preview-layout-mode]').count(),2,'formal template exposes both layout previews');
 await toolbar.locator('[data-preview-layout-mode="orderedFit"]').click();
 await toolbar.waitForFunction(()=>new URL(document.querySelector('iframe').src).searchParams.get('layoutMode')==='orderedFit');
 await toolbar.goto(base+'/templates/cafe_design_a/preview?device=mobile');
 assert.equal(await toolbar.locator('[data-preview-layout-mode]').count(),0,'mobile keeps natural reading');
 await toolbar.close();results.push({kind:'formal-layout-toolbar'});
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));
