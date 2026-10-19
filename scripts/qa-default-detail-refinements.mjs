import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',output=process.env.ORDER_QA_OUTPUT||'/private/tmp/default-detail-refinements';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[],errors=[],writes=[];
const p=await browser.newPage({reducedMotion:'reduce'});
p.on('pageerror',e=>errors.push(e.message));
await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
const ready=async()=>{await p.evaluate(()=>document.fonts.ready);await p.evaluate(async()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));};
try{
 for(const [device,width,height]of[['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',320,932],['mobile',390,844]]){
  await p.setViewportSize({width,height});
  await p.goto(`${base}/templates/dining_aube_table_a/preview?design=dining-full-page&view=actual&device=${device}&callPreview=on&orderPreview=on`,{waitUntil:'networkidle'});
  let count=0;
  for(const page of ['Signature Course','A La Carte Menu','Drink Menu']){
   await p.getByRole('button',{name:`${page} 페이지로 이동`,exact:true}).click();await ready();
   const names=await p.locator('.aube-table-item').evaluateAll(es=>es.map(e=>({name:e.querySelector('h3').textContent,secondary:e.querySelector('.aube-table-item-secondary')?.textContent})));
   for(const item of names){assert.ok(/[가-힣]/.test(item.name)&&!/[a-z]/i.test(item.name),JSON.stringify(item));assert.ok(item.secondary&&/[a-z]/i.test(item.secondary)&&!/[가-힣]/.test(item.secondary),JSON.stringify(item));}count+=names.length;
   if(page==='Drink Menu'){
    const rows=await p.locator('[data-price-options="true"]').evaluateAll(es=>es.map(e=>{const purchase=e.querySelector('.aube-table-item-purchase');const leader=getComputedStyle(innerWidth<768?purchase:e,innerWidth<768?'::before':'::after');const name=e.querySelector('h3');const price=e.querySelector('.aube-table-item-price');return{nameHeight:name.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(name).lineHeight),leader:leader.backgroundImage,leaderWidth:parseFloat(leader.width),prices:[...e.querySelectorAll('.aube-table-option-price')].map(p=>p.getBoundingClientRect().toJSON()),align:getComputedStyle(price).alignItems};}));
    for(const row of rows){assert.ok(row.nameHeight<=row.lineHeight+1,'short Korean names remain on one line');assert.ok(row.leader.includes('radial-gradient'));assert.ok(row.leaderWidth>=24);assert.equal(row.align,'flex-end');for(const price of row.prices)assert.ok(Math.abs(price.right-row.prices[0].right)<1);}
   }
  }
  assert.equal(count,20);
  const trigger=p.locator('.aube-table-image-trigger').first();await trigger.scrollIntoViewIfNeeded();assert.equal(await trigger.locator('svg').count(),0);
  await trigger.click();const dialog=p.locator('.cafe-a-image-lightbox');await dialog.waitFor();
  assert.equal(await dialog.locator('img').evaluate(e=>getComputedStyle(e).borderRadius),'0px');
  const box=await dialog.boundingBox();assert.deepEqual([box.x,box.y,box.width,box.height],[0,0,width,height]);
  await p.screenshot({path:`${output}/dining-${device}-${width}-image.png`});
  const close=dialog.getByRole('button',{name:'이미지 크게 보기 닫기',exact:true});
  assert.ok(await close.evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'close is above language and action bars');
  await close.click();await dialog.waitFor({state:'detached'});assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);
  await trigger.click();await dialog.waitFor();await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  results.push({device,width,kind:'dining-bilingual-prices-lightbox'});
 }
 for(const design of ['basic-first-column','basic-top-row','basic-center-column','basic-upper-left']){
  await p.setViewportSize({width:1180,height:820});
  for(const off of [false,true]){
   await p.goto(`${base}/templates/cafe_design_a/preview?`+new URLSearchParams({design,device:'tablet',view:'actual',callPreview:off?'off':'on',orderPreview:off?'off':'on',coverPreview:off?'off':'on',featuredPreview:off?'off':'on',imagesPreview:off?'off':'on',widgetsPreview:off?'off':'on'}),{waitUntil:'networkidle'});await ready();await p.locator('[data-paged-ready="true"]').waitFor();
   const rows=await p.locator('[data-paged-column] [data-cafe-a-menu-item]').evaluateAll(es=>es.map(e=>({name:e.querySelector('[data-cafe-a-menu-name]')?.textContent,secondary:e.querySelector('.cafe-a-menu-meta')?.textContent,image:!!e.querySelector('.cafe-a-menu-item-image')})));
   assert.equal(rows.length,18);for(const item of rows){assert.ok(/[가-힣]/.test(item.name));assert.ok(item.secondary&&/[a-z]/i.test(item.secondary));if(['클래식 버터 스콘','레몬 마들렌','초콜릿 휘낭시에','버터 크루아상','맛차 테린'].includes(item.name))assert.equal(item.image,false);}
   assert.equal(await p.locator('[data-scroll-actions]').count(),off?0:1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   results.push({design,off,kind:'basic-visibility-and-bilingual'});
  }
 }
}finally{await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,errors,writes},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
