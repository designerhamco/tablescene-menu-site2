import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { translateMenuText } from '../lib/menu-ui-copy.ts';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017', output=process.env.ORDER_QA_OUTPUT||'/private/tmp/default-design-completion';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(), results=[], errors=[], writes=[], failures=[];
const designs=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','dining-full-page','dining-sidebar'];
const sizes=[['pc',1440,900],['tablet',1180,820],['mobile',390,844]];
const cases=process.env.DESIGN_QA_SMOKE==='1'?designs.flatMap(design=>[['tablet',1180,820,'ko'],['mobile',320,740,'en']].map(x=>[design,...x])):designs.flatMap(design=>sizes.flatMap(size=>['ko','en','ja','zh'].map(locale=>[design,...size,locale])));
const koText=()=>document.body.innerText.split('\n').filter(s=>/[가-힣]/.test(s)&&s.trim()!=='한국어');
for(const [design,device,width,height,locale] of cases.filter(row=>!process.env.DESIGN_QA_FILTER||row[0]===process.env.DESIGN_QA_FILTER)){
 const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),id=`${design}-${device}-${width}-${locale}`;
 p.on('pageerror',e=>errors.push({id,message:e.message}));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 try{
  const key=design.startsWith('basic')?'cafe_design_a':design==='dining-sidebar'?'dining_aube_table_b':'dining_aube_table_a';
  const params=new URLSearchParams({design,device,lang:locale,view:'actual',callPreview:'on',orderPreview:'on'});
  await p.goto(`${base}/templates/${key}/preview?${params}`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  const remaining=[];
  if(design.startsWith('basic')&&device!=='mobile'){
   await p.locator('[data-paged-ready=true]').waitFor();
   const names=p.locator('[data-paged-column] [data-cafe-a-menu-name]'); const size=await names.first().evaluate(el=>getComputedStyle(el).fontSize);
   params.set('layoutMode','orderedFit');await p.goto(`${base}/templates/${key}/preview?${params}`,{waitUntil:'networkidle'});await p.locator('[data-paged-ready=true]').waitFor();
   assert.equal(await p.locator('[data-paged-column] [data-cafe-a-menu-name]').first().evaluate(el=>getComputedStyle(el).fontSize),size,'grouped/fill use identical reading size');
   assert.ok(await p.locator('[data-paged-column]').count()<=3);
  }
  if(design==='basic-upper-left'){
   const ratio=await p.locator('.cafe-a-cover-frame').filter({visible:true}).first().evaluate(el=>{const b=el.getBoundingClientRect();return b.width/b.height});
   assert.ok(Math.abs(ratio-4/3)<.01,`upper-left image is 4:3, actual ${ratio}`);
  }
  if(locale!=='ko')remaining.push(...await p.evaluate(koText));
  if(design.startsWith('dining')){
   assert.equal(await p.locator('.aube-table-root').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','neutral Dining stays white');
   const nav=p.locator('.aube-table-pagination-dots button, .aube-table-sidebar-list button, .aube-table-mobile-page-tabs button').filter({visible:true});
   for(let n=1;n<await nav.count();n++){
    await nav.nth(n).click();await p.waitForTimeout(120);
    if(locale!=='ko')remaining.push(...await p.evaluate(koText));
   }
   if(device==='mobile'){
    const options=p.locator('.aube-table-item-copy[data-price-options=true]').first();
    const ys=await options.evaluate(el=>['h3','.aube-table-item-purchase','.aube-table-item-secondary','.aube-table-item-description'].map(s=>el.querySelector(s)?.getBoundingClientRect().top??0));
    assert.ok(ys[0]<ys[1]&&ys[1]<ys[2]&&ys[2]<ys[3],'mobile order: name, price options, secondary, description');
   }
  }
  await p.getByRole('button',{name:translateMenuText('직원 호출하기',locale),exact:true}).filter({visible:true}).first().click();
  const call=p.locator('[data-smart-call-dialog]');const choices=call.locator('[role=group] button');assert.equal(await choices.count(),5);
  await choices.last().click();assert.equal(await choices.filter({has:p.locator('svg')}).count(),1,'only one selected request');
  if(locale!=='ko')remaining.push(...await call.innerText().then(s=>s.split('\n').filter(s=>/[가-힣]/.test(s))));
  await call.locator('[data-smart-call-submit]').click();if(locale!=='ko')remaining.push(...await call.innerText().then(s=>s.split('\n').filter(s=>/[가-힣]/.test(s))));
  await p.keyboard.press('Escape');await call.waitFor({state:'hidden'});
  
  // Stable localized labels distinguish the cart action from Call.
  await p.locator('[data-scroll-order], [data-one-page-call-button=desktop-cart], [data-one-page-call-button=mobile-cart], [data-one-page-call-button=mobile-order-bottom], [data-table-menu-actions] button[aria-label]').filter({visible:true}).first().click();
  let cart=p.locator('[data-menu-cart] [role=dialog]');await cart.waitFor();
  if(locale!=='ko')remaining.push(...await cart.innerText().then(s=>s.split('\n').filter(s=>/[가-힣]/.test(s))));
  await cart.getByRole('button',{name:translateMenuText('주문내역 보기',locale),exact:true}).click();
  await cart.getByRole('button',{name:translateMenuText('예시 주문 보기',locale),exact:true}).click();
  if(locale!=='ko')remaining.push(...await cart.innerText().then(s=>s.split('\n').filter(s=>/[가-힣]/.test(s))));
  await cart.locator('[data-cart-back]').click();
  await p.locator('[data-menu-order-add]').filter({visible:true}).first().click();
  const sheet=p.getByRole('dialog');for(const group of await sheet.locator('fieldset').all())await group.getByRole('button').first().click();
  if(locale!=='ko')remaining.push(...await sheet.innerText().then(s=>s.split('\n').filter(s=>/[가-힣]/.test(s))));
  await sheet.getByRole('button',{name:new RegExp(translateMenuText('장바구니 담기',locale))}).click();
  for(const badge of await p.locator('.cafe-a-cart-count, [data-table-menu-actions] [class*="badge"]').filter({visible:true}).all()) {
   const geometry=await badge.evaluate(el=>{const b=el.getBoundingClientRect(),icon=el.closest('button').querySelector('svg').getBoundingClientRect();return {width:b.width,height:b.height,cx:b.x+b.width/2,cy:b.y+b.height/2,right:icon.right,top:icon.top};});
   assert.ok(Math.abs(geometry.width-geometry.height)<1,'cart badge is circular');
   assert.ok(Math.abs(geometry.cx-geometry.right)<10 && Math.abs(geometry.cy-geometry.top)<10,'cart badge stays at the icon corner');
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);
  if(remaining.length)failures.push({id,remaining:[...new Set(remaining)]});
  await p.screenshot({path:`${output}/${id}.png`});
  if(locale==='ko'&&device==='mobile'){
   await p.evaluate(()=>scrollTo(0,0));
   for(const lang of ['en','ja','zh','ko']){
    await p.locator('button[aria-haspopup=menu]').filter({visible:true}).first().click();
    const link=p.locator(`[data-language-menu-item][href*="lang=${lang}"]`).filter({visible:true});
    const box=await link.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width,'language choices remain onscreen');
    await link.click();await p.waitForURL(url=>url.searchParams.get('lang')===lang);await p.evaluate(()=>document.fonts.ready);
    assert.equal(await p.locator('[data-default-design]').getAttribute('data-default-design'),design);
   }
  }
  results.push({id,viewport:await p.evaluate(()=>[innerWidth,innerHeight])});console.log('CHECK',id,remaining.length?'TEXT REMAINS':'PASS');
 }catch(e){failures.push({id,error:e.message});console.log('FAIL',id,e.message.split('\n')[0]);await p.screenshot({path:`${output}/${id}-failure.png`});}
 finally{await p.close();}
}
await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
