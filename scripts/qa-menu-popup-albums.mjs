import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/popup-album-qa';
await fs.mkdir(out,{recursive:true});const b=await chromium.launch();const results=[],errors=[],writes=[];
const sizes=process.env.ALBUM_QA_SMOKE==='1'?[['tablet',1180,820],['mobile',390,844]]:[['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',320,740],['mobile',390,844],['mobile',430,932]];
try{
 for(const design of process.env.ALBUM_QA_TOOLBAR_ONLY==='1'?[]:['basic-first-column-album','basic-top-row-album','dining-full-page-album','dining-sidebar-album'])for(const [device,width,height]of sizes){
  const basic=design.startsWith('basic'),key=basic?'cafe_design_a':design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a';
  const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
  try{
   await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({design,device,view:'actual',callPreview:'on',orderPreview:'on',coverPreview:basic?'on':'off'}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
   assert.equal(await p.locator('[data-menu-advertisement-popup]').count(),0,'popup defaults off');
   if(basic&&device!=='mobile')await p.locator('[data-paged-ready=true]').waitFor();
   const images=p.locator(basic?'.cafe-a-menu-item-image':'.aube-table-item-image').filter({visible:true});assert.ok(await images.count()>0,'album includes item photographs');
   const dimensions=await images.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return[r.width,r.height];}));assert.ok(dimensions.every(([w,h])=>Math.abs(w-h)<1),'every thumbnail is square');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width,'no horizontal viewport overflow');
   if(basic){assert.equal(await p.locator('.cafe-a-price-column-heading-label').filter({visible:true}).count(),0,'Basic album has no category option rails');}
   const card=images.first().locator('xpath=ancestor::article[1]');const image=await images.first().boundingBox(),name=await card.locator(basic?'[data-cafe-a-menu-name]':'h3').boundingBox();assert.ok(name.y>=image.y+image.height-1,'title follows square photograph');
   await images.first().scrollIntoViewIfNeeded();await images.first().click();await p.locator('[role=dialog]').filter({visible:true}).first().waitFor();await p.keyboard.press('Escape');
   if(!basic){
    await p.locator('.aube-table-mobile-page-tabs button,.aube-table-pagination-dots button,.aube-table-sidebar-list button').filter({visible:true}).last().click();await p.locator('.aube-table-item').first().waitFor();
    const wine=p.locator('.aube-table-item').filter({has:p.locator('.aube-table-item-copy[data-price-options=true]')}).first();const options=await wine.locator('.aube-table-option-price').all();assert.ok(options.length>=2);await wine.locator('.aube-table-item-price').scrollIntoViewIfNeeded();const [r1,r2]=await wine.locator('.aube-table-option-price').evaluateAll(es=>es.slice(0,2).map(e=>{const r=e.getBoundingClientRect();return {y:r.y,height:r.height};}));assert.ok(r2.y>=r1.y+r1.height-1,'Dining options stay on separate lines');
    const add=wine.locator('[data-menu-order-add]');if(await add.count()){const price=await wine.locator('.aube-table-item-price').boundingBox(),button=await add.boundingBox();assert.ok(button.x>=price.x+price.width+3,'add icon does not overlap option prices');await add.click();}await p.locator('[role=dialog]').filter({visible:true}).first().waitFor();await p.keyboard.press('Escape');
   }else{
    const add=p.locator('[data-menu-order-add]').filter({visible:true}).first();await add.scrollIntoViewIfNeeded();await add.click();await p.locator('[role=dialog]').filter({visible:true}).first().waitFor();await p.keyboard.press('Escape');
   }
   await p.screenshot({path:`${out}/${design}-${device}-${width}.png`});results.push({design,device,width,height});console.log('PASS',design,device,width);
  }finally{await p.close();}
 }
 // Actual toolbar navigation must carry the new popup option into the iframe.
 for(const [key,design]of[['cafe_design_a','basic-first-column'],['dining_aube_table_a','dining-full-page']]){
  const p=await b.newPage({viewport:{width:1440,height:1000}});await p.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));try{await p.goto(`${base}/templates/${key}/preview?design=${design}&device=tablet`,{waitUntil:'networkidle'});const options=p.getByRole('button',{name:/보기 옵션/});if(await options.getAttribute('aria-expanded')==='false')await options.click();await p.getByRole('checkbox',{name:'팝업 보기',exact:true}).check();await p.waitForURL(u=>u.searchParams.get('popupPreview')==='on');const frame=p.frameLocator('iframe');await frame.locator('[data-menu-advertisement-popup]').waitFor();assert.equal(await frame.locator('[data-popup-dots] button').count(),3);await frame.getByRole('button',{name:'이미지 3',exact:true}).click();await frame.getByRole('button',{name:'닫기',exact:true}).last().click();await p.getByRole('checkbox',{name:'팝업 보기',exact:true}).uncheck();await frame.locator('[data-menu-advertisement-popup]').waitFor({state:'hidden'});results.push({design,toolbar:true});console.log('PASS toolbar popup',design);}finally{await p.close();}
 }
}finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors,writes},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
