import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures } from './lib/one-page-mobile-rhythm.mjs';
const base=process.env.ORDER_QA_BASE || 'http://localhost:3017';
const out=process.env.ORDER_QA_OUTPUT || '/private/tmp/native-template-rollout/after';
await fs.mkdir(out,{recursive:true});
const baselinePath=process.env.NATIVE_QA_BASELINE;
const baseline=baselinePath ? JSON.parse(await fs.readFile(baselinePath,'utf8')) : [];
const keys=['cafe_mocha_forest_a','fast_food_loop_bagel_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','restaurant_onue_a'].filter(key => !process.env.QA_KEYS || process.env.QA_KEYS.split(',').includes(key));
const browser=await chromium.launch(), results=[], failures=[], errors=[], writes=[];
const smoke=process.env.NATIVE_QA_SMOKE==='1';
const cases=[];
for(const key of keys){
 for(const [device,width,height] of smoke ? [['tablet',1180,820],['mobile',390,844]] : [['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['tablet',768,1024],['mobile',320,844],['mobile',390,844],['mobile',430,932]]){
  cases.push({key,device,width,height,layout:'orderedBalancedFit',lang:'ko'});
 }
 if(!smoke) for(const lang of ['en','zh','ja']) cases.push({key,device:'tablet',width:1180,height:820,layout:'orderedFit',lang});
}
async function newPage(width,height){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
 await page.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',route=>route.request().method()==='GET' ? route.continue() : (writes.push(route.request().url()),route.abort()));
 return page;
}
async function settled(page,mobile){
 await page.evaluate(()=>document.fonts.ready);
 await page.locator(mobile ? '[data-mobile-brand-fit="ready"]' : '[data-native-ready="true"]').first().waitFor();
 await page.waitForTimeout(300);
}
const roles=()=>Object.fromEntries(['.cafe-a-store-title','.cafe-a-category-title','.cafe-a-menu-title','.cafe-a-menu-meta','.cafe-a-menu-description','.cafe-a-menu-price'].map(selector=>{
 const el=[...document.querySelectorAll(selector)].find(el=>!el.closest('[inert]')&&el.getBoundingClientRect().width>0);
 const style=el&&getComputedStyle(el);return[selector,el?{font:style.fontFamily,weight:style.fontWeight,color:style.color,size:style.fontSize}:null];
}));
async function run(c){
 const page=await newPage(c.width,c.height);
 try{
  await page.goto(`${base}/templates/${c.key}/preview?`+new URLSearchParams({device:c.device,view:'actual',embedded:'1',layoutMode:c.layout,lang:c.lang,callPreview:'on',orderPreview:'on'}),{waitUntil:'domcontentloaded'});
  await settled(page,c.device==='mobile');
  const current=await page.evaluate(roles);
  const before=baseline.find(row=>row.key===c.key&&row.device===c.device&&row.width===c.width&&c.lang==='ko');
  if(before) for(const [selector,role] of Object.entries(current)) if(role&&before.roles[selector]) for(const property of c.device==='mobile'?['font','weight','color','size']:['font','weight','color'])assert.equal(role[property],before.roles[selector][property],`${selector} ${property} preserves original ${c.key}`);
  assert.deepEqual(await page.evaluate(()=>[innerWidth,innerHeight]),[c.width,c.height]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no outer horizontal overflow');
  if(c.device==='mobile'){
   assert.equal(await page.locator('[data-native-scroll]').count(),0,'mobile keeps the existing renderer');
   assert.deepEqual(getOnePageMobileRhythmFailures(await page.evaluate(measureOnePageMobileRhythm)),[]);
  }else{
   const expected=await page.locator('[data-native-measure]').evaluateAll(es=>es.map(el=>el.dataset.nativeMeasure));
   const shown=await page.locator('[data-native-unit]').evaluateAll(es=>es.map(el=>el.dataset.nativeUnit));
   assert.deepEqual(shown,expected,'all native blocks render once, in registered order');
   assert.equal(Number(await page.locator('[data-native-scroll]').getAttribute('data-native-name-measurements')),await page.locator('[data-native-measure][data-kind="item"]').count(),'every real product name participates in readable track selection');
   const count=await page.locator('[data-native-column]').count();assert.ok(count>=1&&count<=3,'no automatic fourth track');
   const menu=page.locator('[data-native-menu]');
   const actions=page.locator('[data-native-actions]');
   await actions.waitFor({state:'visible'});
   const dockBefore=await actions.boundingBox();
   const brand=page.locator('[data-native-brand]');const brandBefore=await brand.count()?await brand.boundingBox():null;
   const bounds=await menu.boundingBox();assert.ok(bounds.height>100,'menu has real reading height');
   const geometry=await menu.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight,bottom:el.getBoundingClientRect().bottom}));
   assert.ok(geometry.scrollWidth<=geometry.width+1,'all tracks fit inside menu width');
   if(c.key!=='cafe_round_focus_a')assert.ok(dockBefore.y>=geometry.bottom-1,'service dock is outside the scrolling menu');
   assert.ok(dockBefore.y+dockBefore.height<=c.height+1,'dock stays inside viewport');
   const names=await page.locator('[data-native-unit] [data-cafe-a-menu-name]').evaluateAll(es=>es.map(el=>{const row=el.closest('article'),price=row.querySelector('.cafe-a-price-area'),r=el.getBoundingClientRect(),p=price?.getBoundingClientRect();return{text:el.textContent,clear:!p||r.right<=p.left+1||r.bottom<=p.top+1};}));
   assert.ok(names.every(name=>name.clear),'name and price rails do not overlap');
   await menu.evaluate(el=>el.scrollTo({top:el.scrollHeight,behavior:'instant'}));await page.waitForTimeout(150);
   assert.deepEqual(await actions.boundingBox(),dockBefore,'dock stays fixed');
   if(brandBefore)assert.deepEqual(await brand.boundingBox(),brandBefore,'native representative rail stays fixed');
   assert.equal(await page.locator('[data-native-scroll]').getAttribute('data-native-more'),'false','fade turns off at end');
   assert.ok(await menu.evaluate(el=>el.scrollHeight-el.scrollTop-el.clientHeight<2),'last content is reachable');
   if(await page.locator('[data-native-notices]:visible').count()){
    const last=await page.locator('[data-native-notices]:visible').boundingBox();assert.ok(last.y+last.height<=geometry.bottom+1,'notices are reachable above dock');
   }
  }
  if(c.lang==='ko'&&['pc','tablet'].includes(c.device)&&c.width>=1180)await page.screenshot({path:`${out}/${c.key}-${c.device}.png`});
  results.push(c);
 }catch(error){failures.push({...c,error:error.message});}finally{await page.close();}
}
try{
 for(let i=0;i<cases.length;i+=3)await Promise.all(cases.slice(i,i+3).map(run));
 // Exercise real preview controls and common simulated dialogs on existing skins.
 for(const key of smoke?['cafe_mocha_forest_a']:keys){
  const page=await newPage(1440,1000);
  try{
   await page.goto(`${base}/templates/${key}/preview?device=tablet&orderPreview=on&callPreview=on`);
   assert.equal(await page.locator('[data-preview-layout-mode]').count(),2);
   await page.getByRole('checkbox',{name:'광고 보기',exact:true}).check();
   const frame=page.frameLocator('iframe');await frame.locator('[data-menu-advertisement-popup]').waitFor();
   await frame.getByRole('button',{name:'닫기',exact:true}).click();
   await page.getByRole('button',{name:'기기 선택 도구 닫기',exact:true}).click();
   await page.waitForTimeout(400);await frame.locator('[data-native-ready=true]').waitFor();
   await frame.locator('[data-native-actions] button').last().click();
   await frame.getByRole('dialog').waitFor();
   assert.equal(await frame.locator('[data-cart-back],[data-cart-table]').count(),0,'empty cart has no full-page header');
   await frame.getByRole('button',{name:'메뉴 보러 가기',exact:true}).click();
   await frame.locator('[data-menu-order-add]').filter({visible:true}).first().click();
   for (const group of await frame.getByRole('dialog').locator('fieldset').all()) await group.getByRole('button').first().click();
   await frame.getByRole('button',{name:/장바구니 담기/}).click();
   await frame.locator('[data-native-actions] button').last().click();
   const cart=frame.getByRole('dialog',{name:'장바구니',exact:true});await cart.waitFor();
   const full=await cart.boundingBox();const viewport=await cart.evaluate(()=>({width:innerWidth,height:innerHeight}));
   assert.ok(Math.abs(full.width-viewport.width)<1&&Math.abs(full.height-viewport.height)<1,'populated cart fills the menu viewport');
   assert.equal(await cart.locator('[data-cart-table]').innerText(),'Table 1');
   await cart.getByRole('button',{name:'메뉴판으로 돌아가기',exact:true}).click();
   await frame.locator('[data-native-actions] button').first().click();
   const dialog=frame.getByRole('dialog');await dialog.waitFor();
   const choices=dialog.getByRole('group',{name:'직원 호출 항목'}).getByRole('button');
   await choices.first().click();await choices.last().click();
   assert.equal(await dialog.getByRole('button',{pressed:true}).count(),1,'staff calls remain single-select');
   await dialog.locator('[data-smart-call-submit]').click();
   await dialog.locator('[data-call-status]').waitFor();
   results.push({key,kind:'preview-advertisement-common-ui'});
  }catch(error){failures.push({key,kind:'preview-controls',error:error.message});}finally{await page.close();}
 }
 // A public-sized view follows viewport changes without a saved device hint.
 if(!smoke)for(const key of keys){
  const page=await newPage(1440,900);
  try{
   await page.goto(`${base}/templates/${key}/preview?view=actual&orderPreview=on&callPreview=on`);
   for(const [width,height,mobile] of [[1440,900,false],[820,1180,false],[390,844,true],[1440,900,false]]){
    await page.setViewportSize({width,height});await settled(page,mobile);
    assert.equal(await page.locator('[data-native-scroll]').count(),mobile?0:1);
    if(!mobile)assert.equal(Number(await page.locator('[data-native-scroll]').getAttribute('data-native-name-measurements')),await page.locator('[data-native-measure][data-kind="item"]').count());
   }
   results.push({key,kind:'inferred-device-resize'});
  }catch(error){failures.push({key,kind:'inferred-device-resize',error:error.message});}finally{await page.close();}
 }
 for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const [device,width,height] of [['pc',1440,900],['tablet',820,1180],['mobile',390,844]]){
  const page=await newPage(width,height);
  try{
   await page.goto(`${base}/templates/${key}/preview?device=${device}&view=actual&orderPreview=on&callPreview=on`);await page.evaluate(()=>document.fonts.ready);
   const navigation=page.locator('.aube-table-mobile-page-tabs button,.aube-table-pagination-dots button,.aube-table-sidebar-list button').filter({visible:true});
   await navigation.last().click();await page.locator('.aube-table-page').last().waitFor();await page.waitForTimeout(450);
   const direct=page.locator('.aube-table-page .aube-table-direct-items[data-separated="true"]').last();await direct.waitFor();
   assert.equal(await direct.locator('.aube-table-item').count(),2,'standalone pairings retain their independent items');
   const divider=await direct.evaluate(el=>({width:getComputedStyle(el).borderTopWidth,color:getComputedStyle(el).borderTopColor,padding:getComputedStyle(el).paddingTop}));
   assert.equal(divider.width,'1px');assert.notEqual(divider.color,'rgba(0, 0, 0, 0)');assert.ok(parseFloat(divider.padding)>0);
   await page.screenshot({path:`${out}/${key}-${device}-standalone.png`});results.push({key,device,kind:'dining-standalone-divider'});
  }catch(error){failures.push({key,device,kind:'dining-standalone-divider',error:error.message});}finally{await page.close();}
 }
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));
