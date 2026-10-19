import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/menu-cart-ui';await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[],writes=[];
const makePage=async(w,h)=>{const p=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/public-menu/**',r=>{if(r.request().method()!=='GET'){writes.push(r.request().url());return r.abort()}return r.continue()});return p};
const goto=async(p,key,device,call,order)=>{await p.goto(base+'/templates/'+key+'/preview?'+new URLSearchParams({device,view:'actual',embedded:'1',...(call?{callPreview:'on'}:{}),...(order?{orderPreview:'on'}:{})}),{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready)};
const styleCheck=async dialog=>{const styles=await dialog.locator('h2,h3,p,button,span').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width>0).map(e=>{const s=getComputedStyle(e);return {font:s.fontFamily,weight:s.fontWeight}}));assert.ok(styles.length>0);for(const s of styles){assert.ok(s.font.includes('Pretendard'),JSON.stringify(s));assert.ok(Number(s.weight)<=600,JSON.stringify(s))}};
try {
 for(const [device,w,h]of[['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',320,844],['mobile',390,844],['mobile',430,844],['mobile',820,1180]]) {
  for(const [call,order]of[[true,false],[false,true],[true,true]]) {
   const p=await makePage(w,h);
   try {
    await goto(p,'cafe_real_matcha_paged_test',device,call,order);
    if(device==='mobile') {
     await p.waitForSelector('[data-mobile-brand-fit="ready"]');
     const header=p.locator('[data-one-page-call-bar]');
     assert.equal(await header.locator('[data-one-page-call-button="mobile"]').count(),Number(call&&!order));
     assert.equal(await header.locator('[data-one-page-call-button="mobile-cart"]').count(),Number(order));
     assert.equal(await header.locator('[data-one-page-table-label]').innerText(),'Table 1');
     const dock=p.locator('[data-one-page-call-dock]');assert.equal(await dock.locator('button').count(),Number(call)+Number(order));
     if(call&&order)assert.deepEqual(await dock.locator('button').evaluateAll(els=>els.map(e=>e.dataset.onePageCallButton)),['mobile-order-bottom','mobile-bottom']);
     const dockBounds=await dock.boundingBox();await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"}));
     assert.deepEqual(await dock.boundingBox(),dockBounds);
     const notice=p.locator('.cafe-a-mobile-notice-list').filter({visible:true});
     if(await notice.count())assert.ok((await notice.boundingBox()).y+(await notice.boundingBox()).height<=dockBounds.y+1,'final notices remain above the dock');
     await p.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
    } else {
     await p.waitForSelector('[data-scroll-template][data-paged-ready="true"]');
     assert.equal(await p.locator('[data-paged-controls] [data-one-page-table-label]').count(),0);
    }
    if(call) {
     await p.locator(device==='mobile'?'[data-one-page-call-button="mobile-bottom"]':'[data-scroll-call]').click();
     const dialog=p.getByRole('dialog');await dialog.waitFor();assert.ok(await dialog.getByText('Table 1',{exact:true}).isVisible());await dialog.press('Escape');
    }
    if(order) {
     const openCart=()=>p.locator(device==='mobile'?'[data-one-page-call-button="mobile-order-bottom"]':'[data-scroll-order]').click();
     await openCart();let dialog=p.getByRole('dialog',{name:'장바구니',exact:true});await dialog.waitFor();
     assert.equal(await dialog.locator('[data-cart-table]').innerText(),'Table 1');await styleCheck(dialog);
     assert.equal(await dialog.locator('[data-cart-back] .lucide-arrow-left').count(),1);
     if(device!=='mobile') {const box=await dialog.boundingBox();assert.ok(box.width<=400&&box.height<h*.65,JSON.stringify(box));assert.equal(await dialog.evaluate(e=>getComputedStyle(e).borderRadius),'16px')}
     await dialog.getByRole('button',{name:'메뉴판으로 돌아가기',exact:true}).click();
     await p.locator('[data-menu-order-add]').filter({visible:true}).first().click();
     dialog=p.getByRole('dialog');await dialog.getByRole('button',{name:'수량 늘리기',exact:true}).click();await styleCheck(dialog);
     await dialog.getByRole('button',{name:/장바구니 담기/}).click();await openCart();
     dialog=p.getByRole('dialog',{name:'장바구니',exact:true});await dialog.waitFor();await styleCheck(dialog);
     assert.equal(await dialog.locator('[data-cart-table]').innerText(),'Table 1');assert.ok(await dialog.getByText('최종 주문 금액',{exact:true}).isVisible());
     await p.screenshot({path:`${output}/${device}-${w}-${call?'both':'order'}.png`});
     await dialog.getByRole('button',{name:'메뉴판으로 돌아가기',exact:true}).click();
    }
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    results.push({device,viewport:[w,h],call,order});
   } catch(e) {failures.push({device,w,h,call,order,error:e.message})} finally {await p.close()}
  }
 }
 // Dining shares the same mobile header/dock and cart while retaining its own content engine.
 for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const w of [390,820])for(const [call,order]of[[true,false],[false,true],[true,true]]) {
  const p=await makePage(w,1180);
  try {
   await goto(p,key,'mobile',call,order);
   const header=p.locator('[data-table-menu-header]'),dock=p.locator('[data-table-mobile-dock]');await dock.waitFor();
   assert.equal(await header.getByRole('button',{name:'직원 호출',exact:true}).count(),Number(call&&!order));
   assert.equal(await header.getByRole('button',{name:/장바구니/}).count(),Number(order));
   assert.equal(await dock.locator('button').count(),Number(call)+Number(order));
   const box=await dock.boundingBox();assert.ok(box.y+box.height<=1181);
   const nav=p.locator('.aube-table-pagination');if(await nav.count()) {const n=await nav.boundingBox();assert.ok(n.y+n.height<box.y,'Dining page navigation stays above the actions')}
   if(order){await dock.getByRole('button',{name:/주문하기/}).click();const d=p.getByRole('dialog',{name:'장바구니',exact:true});await d.waitFor();assert.equal(await d.locator('[data-cart-table]').innerText(),'Table 1');await styleCheck(d)}
   results.push({key,device:'mobile',viewport:[w,1180],call,order});
  } catch(e) {failures.push({key,w,call,order,error:e.message})} finally {await p.close()}
 }
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
} finally {await browser.close();await fs.writeFile(output+'/report.json',JSON.stringify({results,failures,errors,writes},null,2))}
console.log(JSON.stringify({checked:results.length,failures,errors,writes}));
