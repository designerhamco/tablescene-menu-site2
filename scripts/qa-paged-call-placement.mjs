import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT || '/private/tmp/paged-call-placement';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch();const results=[],errors=[],writes=[];
async function check(device,width,height,call,order,layout='orderedBalancedFit',scenario='') {
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/public-menu/**',route=>{if(route.request().method()!=='GET'){writes.push(route.request().url());return route.abort()}return route.continue()});
 try {
  await page.goto(base+'/templates/cafe_real_matcha_paged_test/preview?'+new URLSearchParams({device,view:'actual',embedded:'1',layoutMode:layout,pageTest:scenario,...(call?{callPreview:'on'}:{}),...(order?{orderPreview:'on'}:{})}));
  await page.evaluate(()=>document.fonts.ready);
  if(device==='mobile') {
   await page.waitForSelector('[data-mobile-brand-fit="ready"]');
   assert.equal(await page.locator('[data-paged-call-footer]').count(),0);
   assert.equal(await page.locator('[data-one-page-call-button="desktop"]').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width>0).length),0);
   assert.equal(await page.locator('[data-one-page-call-button="mobile-bottom"]').count(),1);
   await page.getByRole('button',{name:'직원 호출하기',exact:true}).click();
   await page.getByRole('dialog').waitFor();
   await page.getByRole('dialog').press('Escape');
  } else {
   await page.waitForSelector('[data-paged-ready="true"]');
   const callOnly=call&&!order;
   assert.equal(await page.locator('[data-paged-controls] [data-one-page-call-button="mobile"]').count(),call&&order?1:0);
   assert.equal(await page.locator('[data-paged-controls] [data-one-page-call-button="mobile-cart"]').count(),order?1:0);
   assert.equal(await page.locator('[data-paged-call-footer]').count(),callOnly?1:0);
   if(callOnly) {
    const total=Number(await page.locator('[data-paged-total]').getAttribute('data-paged-total'));
    let baseline;
    for(let index=1;index<=total;index++) {
     if(index>1)await page.getByRole('button',{name:`${index}페이지 보기`,exact:true}).click();
     const metrics=await page.evaluate(()=>{
      const button=document.querySelector('[data-paged-call-footer] button');
      const b=button.getBoundingClientRect(), nav=document.querySelector('nav[aria-label="메뉴 페이지 이동"]').getBoundingClientRect();
      const menu=document.querySelector('[aria-label="메뉴 페이지"]').getBoundingClientRect();
      const notices=document.querySelector('[data-paged-notices]').getBoundingClientRect();
      const style=getComputedStyle(button);
      const overlap=(a,c)=>Math.min(a.right,c.right)>Math.max(a.left,c.left)+1&&Math.min(a.bottom,c.bottom)>Math.max(a.top,c.top)+1;
      return {viewport:[innerWidth,innerHeight],button:b.toJSON(),nav:nav.toJSON(),menu:menu.toJSON(),notices:notices.toJSON(),radius:style.borderRadius,shadow:style.boxShadow,bg:style.backgroundColor,clipped:[...document.querySelectorAll('[data-paged-column] [data-paged-block]')].filter(e=>e.getBoundingClientRect().bottom>menu.bottom+1).map(e=>e.dataset.pagedBlock),overlaps:[...document.querySelectorAll('nav[aria-label="메뉴 페이지 이동"] button')].some(e=>overlap(b,e.getBoundingClientRect())||overlap(notices,e.getBoundingClientRect())),scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};
     });
     assert.deepEqual(metrics.viewport,[width,height]);assert.deepEqual(metrics.clipped,[]);
     assert.ok(metrics.scroll[0]<=width+1&&metrics.scroll[1]<=height+1);
     assert.ok(Math.abs(metrics.button.width-metrics.button.height)<1);
     assert.equal(metrics.radius,'50%');assert.ok(metrics.button.width>=56);
     assert.equal(metrics.bg,'rgb(25, 28, 27)');
     assert.ok(metrics.button.bottom<=metrics.notices.top+1);
     assert.ok(Math.abs(metrics.button.right-metrics.menu.right)<1);
     assert.ok(Math.abs(metrics.nav.x-metrics.menu.x)<1);assert.ok(Math.abs(metrics.nav.width-metrics.menu.width)<1);
     assert.equal(metrics.overlaps,false);
     if(baseline)assert.deepEqual(metrics.button,baseline);else baseline=metrics.button;
    }
    await page.getByRole('button',{name:'직원 호출',exact:true}).click();
    await page.getByRole('dialog').waitFor();
   await page.getByRole('dialog').press('Escape');
   }
  }
  if(call&&!order&&!scenario&&layout==='orderedBalancedFit')await page.screenshot({path:`${output}/${device}-${width}.png`});
  results.push({device,viewport:[width,height],call,order,layout,scenario});
 } finally {await page.close()}
}
try {
 for(const [device,w,h]of[['pc',1440,900],['tablet',1180,820],['tablet',820,1180]]) {
  for(const layout of ['orderedBalancedFit','orderedFit'])for(const scenario of ['', 'widgets'])await check(device,w,h,true,false,layout,scenario);
  for(const [call,order]of[[true,true],[false,true],[false,false]])await check(device,w,h,call,order);
 }
 for(const w of [320,390,430])await check('mobile',w,844,true,false);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
} finally {await browser.close();await fs.writeFile(output+'/report.json',JSON.stringify({results,errors,writes},null,2))}
console.log(JSON.stringify({checked:results.length,errors,writes}));
