import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/layout-refinement';
await fs.mkdir(out,{recursive:true});const b=await chromium.launch(),results=[],errors=[],writes=[];
const layouts=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left'];
const sizes=process.env.REFINEMENT_SMOKE==='1'?[['tablet',1180,820],['mobile',320,740]]:[['pc',1440,900],['pc',1920,1080],['tablet',1180,820],['tablet',820,1180],['mobile',320,740],['mobile',390,844]];
try{
 for(const design of layouts)for(const [device,width,height] of sizes){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
  try{
   await p.goto(`${base}/templates/cafe_design_a/preview?`+new URLSearchParams({design,device,view:'actual',callPreview:'on',orderPreview:'on'}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
   if(device!=='mobile')await p.locator('[data-paged-ready=true]').waitFor();
   const image=p.locator('.cafe-a-cover-frame').filter({visible:true}).first();const box=await image.boundingBox();
   if(design==='basic-first-column'||design==='basic-center-column')assert.ok(Math.abs(box.width/box.height-(design==='basic-first-column'&&device==='tablet'?2/3:.8))<.01,'first-column tablet is 4:6; other portrait images are 4:5');
   if(design==='basic-first-column'&&device!=='mobile'){const brand=await p.locator('[data-paged-brand]').boundingBox();assert.ok(Math.abs(box.y+box.height-brand.y-brand.height)<1,'representative image stays at the bottom');}
   if(design==='basic-upper-left')assert.ok(Math.abs(box.width/box.height-4/3)<.01);
   if(design==='basic-center-column'&&device!=='mobile'){
    assert.equal(await p.locator('[data-paged-brand] [data-scroll-actions]').count(),1);
    assert.equal(await p.locator('[data-paged-menu-panel] [data-scroll-actions]').count(),0);
    const footer=await p.locator('[data-scroll-actions]').boundingBox();assert.ok(footer.y>=box.y+box.height-1);
    const buttons=p.locator('[data-scroll-actions] button');const first=await buttons.first().boundingBox(),last=await buttons.last().boundingBox();assert.ok(last.y>=first.y+first.height,'buttons stack in the representative rail');
    assert.ok(footer.y+footer.height<=height);
    await p.locator('[data-scroll-menu]').evaluate(e=>e.scrollTop=e.scrollHeight);assert.deepEqual(await p.locator('[data-scroll-actions]').boundingBox(),footer,'actions remain fixed');
   }
   if(design==='basic-top-row'&&device!=='mobile'){
    const copy=await p.locator('[data-scroll-header-copy] .cafe-a-store-description').evaluate(el=>({lines:Math.round(el.getBoundingClientRect().height/parseFloat(getComputedStyle(el).lineHeight)),text:el.textContent}));
    assert.ok(copy.lines>=2&&copy.lines<=3,`longer top-row description has 2–3 lines, actual ${copy.lines}`);
   }
   assert.equal(await p.locator('[role=alert]:not(#__next-route-announcer__)').count(),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
   await p.screenshot({path:`${out}/${design}-${device}-${width}.png`});results.push({design,device,width,height,ratio:box.width/box.height});console.log('PASS',design,device,width);
  }finally{await p.close();}
 }
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await p.goto(`${base}/templates/cafe_design_a/preview?design=basic-upper-left&device=tablet&callPreview=on&orderPreview=on`,{waitUntil:'networkidle'});
 const guide=p.locator('[data-preview-guide-variant]');if(await guide.count())await guide.getByRole('button',{name:'닫기',exact:true}).click();
 const toggle=p.getByRole('checkbox',{name:'대표 상품 보기',exact:true});assert.equal(await toggle.isChecked(),false,'upper-left featured product defaults off');
 await toggle.check();await p.waitForURL(u=>u.searchParams.get('featuredPreview')==='on');assert.equal(await toggle.isChecked(),true);
 await toggle.uncheck();await p.waitForURL(u=>u.searchParams.get('featuredPreview')==='off');assert.equal(await toggle.isChecked(),false);await p.close();
 for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820]]){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await p.goto(`${base}/templates/dining_aube_table_b/preview?design=dining-sidebar&view=actual&device=${device}&callPreview=on&orderPreview=on`,{waitUntil:'networkidle'});
  assert.equal(await p.locator('.aube-table-sidebar-navigation').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(244, 245, 243)');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
  await p.screenshot({path:`${out}/dining-sidebar-${device}.png`});await p.close();
 }
}finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors,writes},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
