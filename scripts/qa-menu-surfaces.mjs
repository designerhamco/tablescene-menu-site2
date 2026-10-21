import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const base=process.env.SURFACE_QA_BASE||'http://127.0.0.1:3000',out=process.env.SURFACE_QA_OUTPUT||'/private/tmp/menu-surfaces';await fs.mkdir(out,{recursive:true});
const route='app/qa-menu-surfaces';await fs.mkdir(route,{recursive:true});await fs.copyFile('scripts/fixtures/menu-surfaces-page.tsx',route+'/page.tsx');
const browser=await chromium.launch(),results=[],failures=[],errors=[];
const native=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'].map(template=>({template}));
const basics=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album'].map(design=>({template:'cafe_design_a',design}));
const dining=[{template:'dining_aube_table_a'},{template:'dining_aube_table_b'},...['dining-full-page','dining-sidebar','dining-full-page-album','dining-sidebar-album'].map(design=>({template:design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a',design}))];
async function check(c,[device,width,height],logo='off',align='right') {
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.on('pageerror',error=>errors.push(error.message));
 const open=async choice=>{const response=await page.goto(base+'/qa-menu-surfaces?'+new URLSearchParams({...c,device,choice,align,logo}),{waitUntil:'networkidle',timeout:90000});assert.equal(response.status(),200);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);};
 try{
  await open('native');const menu=page.locator('.cafe-a-typography,.aube-table-root').first();await menu.waitFor();
  const before=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],count:document.querySelectorAll('.cafe-a-menu-title,.aube-table-item-heading h3').length,notices:[...document.querySelectorAll('[data-paged-notices],[data-native-notices],[data-cafe-a-footer-info]')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({align:getComputedStyle(e).textAlign,top:e.getBoundingClientRect().top})),name:document.querySelector('.cafe-a-menu-title,.aube-table-item-heading h3')?.textContent}));assert.deepEqual(before.viewport,[width,height]);
  await open('custom');const isDining=c.template.startsWith('dining_');await expect(menu).toHaveCSS(isDining?'--aube-surface':'background-color',isDining?'#FAF7F2':'rgb(250, 247, 242)');
  if(isDining){await expect(page.locator('.aube-table-cover')).toHaveCSS('background-color','rgb(34, 51, 68)');await expect(page.locator('.aube-table-cover-description')).toHaveCSS('color','rgb(224, 209, 187)');if(c.template.endsWith('_b')){const nav=page.locator(device==='mobile'?'.aube-table-mobile-page-tabs':'.aube-table-sidebar-navigation');await expect(nav).toHaveCSS('background-color','rgb(230, 220, 209)');}}
  else {
   const title=page.locator('.cafe-a-store-title').filter({visible:true}).first();if(await title.count())await expect(title).toHaveCSS('text-align',align);
   const descriptions=page.locator('[data-representative-copy] [data-cafe-a-store-description],[data-representative-copy] .cafe-a-store-description,[data-representative-copy].cafe-a-store-description,.cafe-a-topline-description').filter({visible:true});assert.ok(await descriptions.count());for(const a of await descriptions.evaluateAll(es=>es.map(e=>getComputedStyle(e).textAlign)))assert.equal(a,align);
   const after=await page.evaluate(()=>({count:document.querySelectorAll('.cafe-a-menu-title').length,name:document.querySelector('.cafe-a-menu-title')?.textContent}));assert.equal(after.name,before.name);
   if(logo==='on') {const image=page.locator('[data-cafe-a-store-logo] img').filter({visible:true}).first();await expect(image).toHaveCSS('object-position',align==='right'?'100% 50%':align==='left'?'0% 50%':'50% 50%');}
   const brand=page.locator('[data-paged-brand],[data-native-brand]').filter({visible:true}).first();if(device!=='mobile'&&await brand.count()){const state=await brand.evaluate(e=>{const s=getComputedStyle(e);return{padding:parseFloat(s.paddingLeft),background:s.backgroundColor,shell:e.closest('[data-native-shell]')?.getAttribute('data-native-shell')}});assert.equal(state.background,'rgb(233, 212, 186)');if(state.shell!=='brand_top_band'&&!c.template.includes('mocha')&&!c.design?.includes('top-row'))assert.ok(state.padding>0);}
  }
  if(!isDining&&device!=='mobile'&&(!c.design||['basic-first-column','basic-center-column'].includes(c.design))&&c.template!=='restaurant_onue_a'){
   const gutters=await page.evaluate(()=>{const brand=document.querySelector('[data-paged-brand],[data-native-brand]');if(!brand)return [];const r=brand.getBoundingClientRect();return [...document.querySelectorAll('[data-paged-column],[data-native-column]')].map(e=>e.getBoundingClientRect()).filter(c=>c.width>0).flatMap(c=>c.left>=r.right-1?[c.left-r.right]:c.right<=r.left+1?[r.left-c.right]:[]);});
   assert.ok(gutters.every(gap=>gap>=12),JSON.stringify({gutters,c}));
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(c.design==='basic-center-column'&&device==='pc')await page.screenshot({path:out+'/saved-colored-center.png'});
  if(c.template==='dining_aube_table_b'&&device==='mobile')await page.screenshot({path:out+'/saved-dining-mobile.png'});
  await open('reset');assert.equal(await page.locator('[data-representative-align],[data-design-aux-background],[data-design-sidebar-background],[data-cover-description-ink]').count(),0);
  if(!isDining){const restored=await page.evaluate(()=>({name:document.querySelector('.cafe-a-menu-title')?.textContent,notices:[...document.querySelectorAll('[data-paged-notices],[data-native-notices],[data-cafe-a-footer-info]')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({align:getComputedStyle(e).textAlign,top:e.getBoundingClientRect().top}))}));assert.equal(restored.name,before.name);assert.deepEqual(restored.notices.map(n=>n.align),before.notices.map(n=>n.align));}
  const result={template:c.template,design:c.design,device,width,height,logo,align};results.push(result);console.log('PASS',JSON.stringify(result));
 }catch(error){failures.push({c,device,width,logo,align,error:error.message});console.log('FAIL',JSON.stringify(failures.at(-1)));}finally{await page.close();}
}
try{
 const jobs=[...native,...basics].flatMap(c=>[['pc',1440,900],['mobile',320,844],['mobile',430,900]].map(d=>()=>check(c,d)));
 jobs.push(...dining.flatMap(c=>[['pc',1440,900],['tablet',1180,820],['mobile',390,844]].map(d=>()=>check(c,d))));
 jobs.push(...[basics[0],basics[2]].map(c=>()=>check(c,['tablet',820,1180])));
 jobs.push(...['left','center','right'].map(align=>()=>check(basics[0],['mobile',390,844],'on',align)));
 const selected=process.env.SURFACE_QA_DINING_ONLY==='1'?dining.flatMap(c=>[['pc',1440,900],['tablet',1180,820],['mobile',390,844]].map(d=>()=>check(c,d))):process.env.SURFACE_QA_SMOKE==='1'?[()=>check(basics[0],['pc',1440,900]),()=>check(basics[2],['mobile',320,844]),()=>check(native[6],['mobile',430,900]),()=>check(dining[1],['mobile',390,844]),()=>check(basics[0],['mobile',390,844],'on','center')]:jobs;
 for(let i=0;i<selected.length;i+=3)await Promise.all(selected.slice(i,i+3).map(run=>run()));
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length}));
}finally{await browser.close();await fs.writeFile(out+'/results.json',JSON.stringify({results,failures,errors},null,2));await fs.rm(route,{recursive:true,force:true});}
