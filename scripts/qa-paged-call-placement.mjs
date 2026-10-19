import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT || '/private/tmp/matcha-scroll-controls';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch();const results=[],errors=[],writes=[];
const visibleStyles = async page => page.evaluate(() => [...document.querySelectorAll('[data-cafe-a-store-title], .cafe-a-category-title, [data-cafe-a-menu-name], .cafe-a-menu-description, [data-one-page-call-bar] button')]
 .filter(e=>e.getBoundingClientRect().width>0&&!e.closest('[aria-hidden=true]'))
 .map(e=>{const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,color:s.color,weight:s.fontWeight,gap:s.gap,padding:s.padding}}));
try {
 for(const [device,width,height]of[['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['tablet',768,1024],['tablet',1024,768]]) {
  for(const [call,order]of[[true,false],[true,true],[false,true],[false,false]]) {
   const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/api/public-menu/**',route=>{if(route.request().method()!=='GET'){writes.push(route.request().url());return route.abort()}return route.continue()});
   await page.goto(base+'/templates/cafe_real_matcha_paged_test/preview?'+new URLSearchParams({device,view:'actual',embedded:'1',pageTest:'dense',...(call?{callPreview:'on'}:{}),...(order?{orderPreview:'on'}:{})}));
   await page.evaluate(()=>document.fonts.ready);await page.waitForSelector('[data-paged-ready="true"]');
   assert.equal(await page.locator('[data-scroll-call]').count(),Number(call));
   assert.equal(await page.locator('[data-scroll-order]').count(),Number(order));
   assert.equal(await page.locator('[data-scroll-actions]').count(),Number(call||order));
   assert.equal(await page.locator('[data-paged-controls] [data-one-page-table-actions]').count(),0);
   assert.equal(await page.locator('[data-paged-controls] [data-one-page-table-label]').count(),0);
   const metrics=await page.locator('[data-scroll-actions] button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect(),s=getComputedStyle(button);return {x:r.x,y:r.y,width:r.width,height:r.height,radius:s.borderRadius,background:s.backgroundColor,shadow:s.boxShadow}}));
   for(const m of metrics){assert.ok(m.width>m.height*2);assert.equal(m.radius,'8px');assert.equal(m.shadow,'none');assert.ok(m.height>=44)}
   if(call)assert.equal(metrics[0].background,'rgb(255, 255, 255)');
   if(order)assert.equal(metrics.at(-1).background,'rgb(25, 28, 27)');
   await page.locator('[data-scroll-menu]').focus();await page.keyboard.press('End');
   await page.waitForFunction(()=>document.querySelector('[data-scroll-more]').dataset.scrollMore==='false');
   if(call){await page.locator('[data-scroll-call]').click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').press('Escape')}
   if(order){await page.locator('[data-scroll-order]').click();await page.getByRole('dialog').waitFor();assert.ok(await page.getByText('장바구니',{exact:true}).isVisible());await page.getByRole('dialog').press('Escape')}
   if(device==='tablet'&&width===1180&&call&&order) {
    const count=await page.locator('[data-paged-column] [data-kind="item"]').count();
    for(const [w,h]of[[820,1180],[1180,820]]) {
     await page.setViewportSize({width:w,height:h});
     await page.waitForFunction(()=>{const e=document.querySelector('[data-scroll-menu]');return e.clientWidth>0&&e.scrollWidth<=e.clientWidth+1});
     await page.waitForTimeout(200);
     assert.equal(await page.locator('[data-paged-column] [data-kind="item"]').count(),count);
     const panel=await page.locator('[data-paged-menu-panel]').boundingBox(),footer=await page.locator('[data-scroll-actions]').boundingBox();
     assert.ok(Math.abs(panel.y+panel.height-footer.y-footer.height)<1);
    }
   }
   results.push({device,viewport:[width,height],call,order});await page.close();
  }
 }
 // Mobile reading/UI style parity; starter translations are separate fixtures. Include forced mobile at foldable width.
 for(const [width,lang]of[[320,'ko'],[390,'ko'],[430,'ko'],[820,'ko'],[390,'en'],[390,'zh'],[390,'ja']]) {
  const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  const styles=[];
  for(const key of ['cafe_design_a','cafe_real_matcha_paged_test']) {
   await page.goto(base+'/templates/'+key+'/preview?'+new URLSearchParams({device:'mobile',view:'actual',embedded:'1',callPreview:'on',orderPreview:'on',lang}));
   await page.evaluate(()=>document.fonts.ready);await page.waitForSelector('[data-mobile-brand-fit="ready"]');
   assert.equal(await page.locator('[data-scroll-menu]').count(),0);assert.equal(await page.locator('[data-scroll-actions]').count(),0);
   styles.push(await visibleStyles(page));
  }
  assert.deepEqual(styles[0],styles[1],`mobile ${width}/${lang} matches the original`);
  results.push({device:'mobile',viewport:[width,844],lang,originalParity:true});await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
} finally {await browser.close();await fs.writeFile(output+'/report.json',JSON.stringify({results,errors,writes},null,2))}
console.log(JSON.stringify({checked:results.length,errors,writes}));
