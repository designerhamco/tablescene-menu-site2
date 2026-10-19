import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/menu-interaction-theme';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[],writes=[];
const rgb=value=>value.startsWith('#')?`rgb(${[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)).join(', ')})`:value;
async function uiCheck(dialog) {
 const values=await dialog.locator('h2,h3,p,button,span').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>{const s=getComputedStyle(e);return {font:s.fontFamily,weight:+s.fontWeight,size:parseFloat(s.fontSize),radius:s.borderRadius,button:e.tagName==='BUTTON',quantity:e.matches('button[aria-label*="수량"]')}}));
 for(const s of values){assert.ok(s.font.includes('Pretendard'),JSON.stringify(s));assert.ok(s.weight<=600,JSON.stringify(s));assert.ok(s.size<=22,JSON.stringify(s));if(s.button){assert.equal(s.weight,500);assert.equal(s.radius,s.quantity?'50%':'8px')}}
 const handles=await dialog.locator('[aria-hidden="true"]').evaluateAll(els=>els.filter(e=>e.tagName!=='svg').map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height}}));
 assert.ok(handles.some(h=>h.w===64&&h.h===2),'thin 64 × 2px handle');
}
try {
 for(const key of ['cafe_real_matcha_paged_test','cafe_mocha_forest_a','dining_aube_table_a','dining_aube_table_b'])for(const [device,w,h]of[['pc',1440,900],['tablet',820,1180],['mobile',390,844]]) {
  const p=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/api/public-menu/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
  try {
   await p.goto(base+`/templates/${key}/preview?`+new URLSearchParams({device,view:'actual',embedded:'1',callPreview:'on',orderPreview:'on',pageTest:'options'}),{waitUntil:'networkidle'});
   await p.evaluate(()=>document.fonts.ready);
   if(device==='mobile'&&key.startsWith('cafe_'))await p.waitForSelector('[data-mobile-brand-fit="ready"]');
   else if(key==='cafe_real_matcha_paged_test')await p.waitForSelector('[data-paged-ready="true"]');
   else if(key.startsWith('cafe_'))await p.waitForSelector('[data-fit-presentation-state="ready"]');
   const shell=p.locator('[data-menu-interaction-shell]');
   await p.waitForFunction(()=>!!document.querySelector('[data-menu-interaction-shell]')?.style.getPropertyValue('--menu-order-bg'));
   const call=p.locator('[data-scroll-call],[data-one-page-call-button="desktop"],[data-one-page-call-button="mobile-bottom"],[data-table-mobile-dock] button[aria-label="직원 호출하기"],:not([data-table-menu-header]) > [data-table-menu-actions] button[aria-label="직원 호출"]').filter({visible:true}).first();
   const order=p.locator(device==='mobile'&&key.startsWith('dining_')?'[data-table-mobile-dock] button[aria-label^="주문하기"]':'[data-scroll-order],[data-one-page-call-button="desktop-cart"],[data-one-page-call-button="mobile-order-bottom"],[data-table-mobile-dock] button[aria-label^="주문하기"],[data-table-menu-actions] button[aria-label^="장바구니"]').filter({visible:true}).first();
   const theme=await shell.evaluate(e=>Object.fromEntries(['--menu-order-bg','--menu-order-ink','--menu-call-bg','--menu-call-ink'].map(k=>[k,getComputedStyle(e).getPropertyValue(k).trim()])));
   for(const [button,bg,ink]of[[call,'--menu-call-bg','--menu-call-ink'],[order,'--menu-order-bg','--menu-order-ink']]){
    const s=await button.evaluate(e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,ink:s.color,radius:s.borderRadius,shadow:s.boxShadow,weight:s.fontWeight}});
    const toolbar = key.startsWith('dining_') && device !== 'mobile';
    assert.equal(s.bg, toolbar ? 'rgba(0, 0, 0, 0)' : rgb(theme[bg]));assert.equal(s.ink,rgb(theme[toolbar ? '--menu-call-ink' : ink]));assert.equal(s.radius,'8px');assert.equal(s.shadow,'none');assert.equal(s.weight,'500');
   }
   await call.click();let dialog=p.getByRole('dialog');await dialog.waitFor();await uiCheck(dialog);
   const rows=await dialog.getByRole('group',{name:'직원 호출 항목'}).locator('button').evaluateAll(els=>els.map(e=>{const s=getComputedStyle(e);return {widths:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],styles:[s.borderTopStyle,s.borderRightStyle,s.borderBottomStyle,s.borderLeftStyle],color:s.borderColor,selected:e.getAttribute('aria-pressed')}}));
   for(const row of rows){assert.deepEqual(row.widths,['1px','1px','1px','1px']);assert.deepEqual(row.styles,['solid','solid','solid','solid']);assert.equal(row.color,row.selected==='true'?'rgb(25, 28, 27)':'rgb(212, 212, 216)')}
   const close=dialog.locator('button').filter({has: p.locator('.lucide-x')});
   assert.equal(await close.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
   await p.screenshot({path:`${output}/${key}-${device}-choices.png`});
   await dialog.locator('[data-smart-call-submit]').click();
   const status=dialog.locator('[data-call-status]');await status.waitFor();
   const statusStyle=await status.evaluate(e=>{const s=getComputedStyle(e);return {border:s.borderWidth,radius:s.borderRadius,bg:s.backgroundColor}});
   assert.equal(statusStyle.border,'0px');assert.equal(statusStyle.radius,'12px');assert.equal(statusStyle.bg,'rgb(244, 244, 245)');
   const cancel=dialog.getByRole('button',{name:'호출 취소',exact:true});assert.equal(await cancel.evaluate(e=>getComputedStyle(e).borderColor),'rgb(25, 28, 27)');
   await p.screenshot({path:`${output}/${key}-${device}-call.png`});await cancel.click();await dialog.locator('[data-smart-call-submit]').waitFor();await close.click();
   if(key.startsWith('dining_')) {
    if(key.endsWith('_a')&&!await p.getByRole('button',{name:'다음 메뉴 페이지',exact:true}).count())await p.locator('.aube-table-pagination-dots button').nth(1).click();
    else if(key.endsWith('_a'))await p.getByRole('button',{name:'다음 메뉴 페이지',exact:true}).click();
    else await p.locator('.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({visible:true}).nth(1).click();
   }
   await p.locator('[data-menu-order-add]').filter({visible:true}).first().click();dialog=p.getByRole('dialog');await dialog.waitFor();await uiCheck(dialog);
   assert.equal(await dialog.getByRole('button',{name:/장바구니 담기/}).evaluate(e=>getComputedStyle(e).backgroundColor),rgb(theme['--menu-order-bg']));
   for(const field of await dialog.locator('fieldset').all())await field.getByRole('button').first().click();
   const quantity=await dialog.getByRole('button',{name:'수량 늘리기',exact:true}).evaluate(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,radius:getComputedStyle(e).borderRadius}});assert.equal(quantity.w,quantity.h);assert.equal(quantity.radius,'50%');
   await p.screenshot({path:`${output}/${key}-${device}-options.png`});
   await dialog.getByRole('button',{name:/장바구니 담기/}).click();await order.click();dialog=p.getByRole('dialog',{name:'장바구니',exact:true});await dialog.waitFor();
   const actions=await dialog.locator('button').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>({weight:getComputedStyle(e).fontWeight,radius:getComputedStyle(e).borderRadius,quantity:e.getAttribute('aria-label')?.includes('수량')})));for(const action of actions){assert.equal(action.weight,'500');assert.equal(action.radius,action.quantity?'50%':'8px')}
   const rect=await dialog.boundingBox();assert.deepEqual([rect.x,rect.y,rect.width,rect.height],[0,0,w,h]);
   assert.equal(await dialog.getByRole('button',{name:'후불로 주문하기',exact:true}).evaluate(e=>getComputedStyle(e).backgroundColor),rgb(theme['--menu-order-bg']));
   await dialog.getByRole('button',{name:'메뉴판으로 돌아가기',exact:true}).click();
   // Saved palette edits update already-mounted controls and newly-opened portal UI.
   if(key==='cafe_real_matcha_paged_test'&&device==='tablet')for(const color of ['#165f3c','#70528e','#ffe500','#ffffff']) {
    await p.locator('[data-cafe-a-store-title]').filter({visible:true}).first().evaluate((e,c)=>e.style.setProperty('color',c,'important'),color);
    await p.waitForFunction(c=>document.querySelector('[data-menu-interaction-shell]').style.getPropertyValue('--menu-order-bg')===c,color);
    assert.equal(await order.evaluate(e=>getComputedStyle(e).backgroundColor),rgb(color));
    await order.click();const cart=p.getByRole('dialog',{name:'장바구니',exact:true});assert.equal(await cart.getByRole('button',{name:'후불로 주문하기',exact:true}).evaluate(e=>getComputedStyle(e).backgroundColor),rgb(color));await cart.getByRole('button',{name:'메뉴판으로 돌아가기',exact:true}).click();
   }
   results.push({key,device,viewport:[w,h],theme});console.log('PASS',key,device);
  }catch(e){failures.push({key,device,error:e.message});console.log('FAIL',key,device,e.message.split('\n')[0]);await p.screenshot({path:`${output}/${key}-${device}-failure.png`})}finally{await p.close()}
 }
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{await browser.close();await fs.writeFile(output+'/report.json',JSON.stringify({results,failures,errors,writes},null,2))}
console.log(JSON.stringify({checked:results.length,failures,errors,writes}));
