import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/customer-order-history';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(), results=[], errors=[], writes=[];
const orderSelector='[data-scroll-order], [data-one-page-call-button="desktop-cart"], [data-one-page-call-button="mobile-order-bottom"], [data-table-mobile-dock] button[aria-label^="주문하기"], [data-table-menu-actions] button[aria-label^="장바구니"]';
try {
 for(const [key,design] of [['cafe_design_a','basic-first-column'],['dining_aube_table_a','dining-full-page']]) {
  for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820],['mobile',390,844],['mobile',320,740]]) {
   const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}), id=`${design}-${device}-${width}`;
   p.on('pageerror',e=>errors.push(e.message));
   await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
   const url=`${base}/templates/${key}/preview?`+new URLSearchParams({design,device,view:'actual',callPreview:'on',orderPreview:'on'});
   await p.goto(url,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
   const openOrder=()=>p.locator(orderSelector).filter({visible:true}).first().click();
   await openOrder();
   const cart=p.locator('[data-menu-cart] [role="dialog"]');
   assert.equal(await cart.locator('header').count(),0);
   await cart.getByRole('button',{name:'주문내역 보기',exact:true}).click();
   await cart.getByText('아직 주문 내역이 없어요',{exact:true}).waitFor();
   assert.equal(await cart.getByRole('tab').count(),2);
   assert.deepEqual(await cart.boundingBox(),{x:0,y:0,width,height});
   await cart.getByRole('button',{name:'예시 주문 보기',exact:true}).click();
   await cart.locator('[data-history-order]').nth(2).waitFor();
   assert.equal(await cart.getByRole('button',{name:'주문 취소',exact:true}).count(),1);
   assert.equal(await cart.getByText('결제 완료',{exact:true}).count(),1);
   assert.equal(await cart.locator('time').count(),3);
   assert.equal(await cart.locator('[aria-current="step"]').count(),3);
   await p.screenshot({path:`${output}/${id}.png`});
   await cart.getByRole('button',{name:'주문 취소',exact:true}).click();
   await cart.getByRole('button',{name:'돌아가기',exact:true}).click();
   assert.equal(await cart.getByRole('button',{name:'주문 취소',exact:true}).count(),1);
   await cart.getByRole('button',{name:'주문 취소',exact:true}).click();
   await cart.getByRole('button',{name:'취소할게요',exact:true}).click();
   await cart.getByText('미리보기 주문이 취소되었습니다.',{exact:true}).waitFor();
   assert.equal(await cart.getByRole('button',{name:'주문 취소',exact:true}).count(),0);
   const historyTab=cart.getByRole('tab',{name:'주문내역',exact:true});
   await historyTab.focus();await p.keyboard.press('ArrowLeft');
   await cart.getByRole('tab',{name:'장바구니',exact:true,selected:true}).waitFor();
   await cart.getByText('장바구니가 비어 있어요',{exact:true}).waitFor();
   await cart.locator('[data-cart-back]').click();
   if(key.startsWith('dining')) {
    await p.locator('.aube-table-pagination-dots button').nth(1).click();
    await p.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity));
   }
   await p.locator('[data-menu-order-add]').filter({visible:true}).first().click();
   const sheet=p.getByRole('dialog');
   for(const group of await sheet.locator('fieldset').all()) await group.getByRole('button').first().click();
   await sheet.getByRole('button',{name:/장바구니 담기/}).click();
   await openOrder();await cart.getByRole('tab',{name:/장바구니/,selected:true}).waitFor();
   await cart.getByRole('button',{name:'후불로 주문하기',exact:true}).click();
   await cart.getByRole('tab',{name:'주문내역',selected:true}).waitFor();
   await p.waitForFunction(()=>document.querySelector('[data-menu-cart] [role=tabpanel]').scrollTop===0);
   assert.equal(await cart.locator('[data-history-order]').count(),4);
   assert.equal(await cart.getByRole('button',{name:'주문 취소',exact:true}).count(),1);
   await p.reload({waitUntil:'networkidle'});await openOrder();
   await cart.getByRole('button',{name:'주문내역 보기',exact:true}).click();
   assert.equal(await cart.locator('[data-history-order]').count(),4,'preview history survives refresh');
   assert.equal(await cart.getByRole('button',{name:'주문 취소',exact:true}).count(),1);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
   results.push({id,viewport:await p.evaluate(()=>[innerWidth,innerHeight])});console.log('PASS',id);await p.close();
  }
 }
} finally {await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,errors,writes},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
