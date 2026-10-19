import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/matcha-preview-price-spacing';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[],writes=[],baselineWarnings=[];
const before=process.env.ORDER_QA_BASELINE?JSON.parse(await fs.readFile(process.env.ORDER_QA_BASELINE,'utf8')):[];
const cases=[['pc',1440,900],['pc',1920,1080],['tablet',1180,820],['tablet',820,1180],['tablet',768,1024],['tablet',1024,768],['mobile',320,844],['mobile',390,844],['mobile',430,844],['mobile',820,1180]];
async function pageAt(viewport){const p=await browser.newPage({viewport,reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/public-menu/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));return p}
try{
 for(const [device,w,h]of cases)for(const layoutMode of device==='mobile'?['orderedBalancedFit']:['orderedBalancedFit','orderedFit']){
  const pair={};
  for(const key of ['cafe_design_a','cafe_real_matcha_paged_test']){
   const p=await pageAt({width:w,height:h});
   try{
    await p.goto(base+`/templates/${key}/preview?`+new URLSearchParams({device,view:'actual',embedded:'1',callPreview:'on',orderPreview:'on',layoutMode}),{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);
    await p.waitForFunction(({device})=>device==='mobile'?document.querySelector('[data-mobile-brand-fit]')?.dataset.mobileBrandFit==='ready':document.querySelector('[data-paged-ready]')?.dataset.pagedReady==='true',{device});
    await p.waitForTimeout(250);
    const m=await p.locator('.cafe-a-price-pair-with-note').filter({visible:true}).evaluateAll(els=>els.filter(e=>!e.closest('[aria-hidden="true"]')).map(e=>{const label=e.querySelector('.cafe-a-price-label'),price=e.querySelector('.cafe-a-menu-price'),s=getComputedStyle(e),l=label.getBoundingClientRect(),v=price.getBoundingClientRect();return {label:label.textContent,price:price.textContent,gap:s.columnGap,actual:v.left-l.right,scale:Number(s.getPropertyValue('--fit-menu-gap-scale').trim()||1),rem:parseFloat(getComputedStyle(document.documentElement).fontSize),font:getComputedStyle(label).fontFamily,color:getComputedStyle(label).color,weight:getComputedStyle(label).fontWeight,size:getComputedStyle(label).fontSize,priceSize:getComputedStyle(price).fontSize}}));
    assert.ok(m.length>=5,'real labeled prices are present');
    for(const row of m){
     if(device!=='mobile'){const expected=Math.max(.22*row.rem,Math.min(.38*row.rem*row.scale,.48*row.rem));assert.ok(Math.abs(parseFloat(row.gap)-expected)<.02,JSON.stringify(row));assert.ok(Math.abs(row.actual-expected)<.1,JSON.stringify(row))}
     else assert.equal(row.actual,6,'explicit mobile reading gap remains 6px, including wide foldables');
    }
    const prior=before.find(c=>c.device===device&&c.w===w&&c.h===h&&c.key===key);
    if(prior&&(device==='mobile'||key==='cafe_design_a'&&w>=1024&&layoutMode==='orderedBalancedFit')){
     for(const [i,row]of m.slice(0,5).entries()){const old=prior.rows[i];assert.equal(row.font,old.labelFont);if(device==='mobile'){assert.equal(row.size,old.labelSize);assert.equal(row.priceSize,old.priceSize)}assert.ok(Math.abs(row.actual-old.actual)<.15,'existing desktop/mobile gaps stay intact')}
    }
    assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
    pair[key]=m.slice(0,5);
    if(w===820||w===390)await p.screenshot({path:`${output}/${key}-${device}-${w}-${layoutMode}.png`});
    results.push({key,device,viewport:[w,h],layoutMode,rows:m.slice(0,2)});
   }catch(e){failures.push({key,device,w,h,layoutMode,error:e.message});console.log('FAIL',key,device,w,layoutMode,e.message.split('\n')[0])}finally{await p.close()}
  }
  if(pair.cafe_design_a&&pair.cafe_real_matcha_paged_test){
   assert.deepEqual(pair.cafe_design_a.map(({label,price,font,color,weight})=>({label,price,font,color,weight})),pair.cafe_real_matcha_paged_test.map(({label,price,font,color,weight})=>({label,price,font,color,weight})));
   if(device==='mobile')assert.deepEqual(pair.cafe_design_a,pair.cafe_real_matcha_paged_test,'mobile original and copy remain identical');
  }
 }
 // Only customer/mobile ordering can preview the disabled prepay choice.
 const p=await pageAt({width:1440,height:1000});
 try{
  await p.goto(base+'/qa/table-order',{waitUntil:'domcontentloaded'});
  const select=p.getByRole('combobox',{name:'테스트 기기'}),toggle=p.getByRole('checkbox',{name:'선결제 표시 · 준비 중',exact:true});
  const checkQuery=async(device,prepay)=>{await p.waitForFunction(({device,prepay})=>{const frame=document.querySelector('iframe[title="리얼맛차 스크롤 주문 테스트"]');if(!frame)return false;const u=new URL(frame.src);return u.searchParams.get('device')===device&&u.searchParams.get('prepayPreview')===prepay},{device,prepay})};
  assert.equal(await toggle.count(),0);await checkQuery('pc','off');
  await select.selectOption('tablet');assert.equal(await toggle.count(),0);await checkQuery('tablet','off');
  await select.selectOption('mobile');await toggle.waitFor();assert.ok(await toggle.isChecked());await checkQuery('mobile','on');
  await toggle.uncheck();await checkQuery('mobile','off');
  await select.selectOption('pc');assert.equal(await toggle.count(),0);await checkQuery('pc','off');
  await select.selectOption('mobile');assert.ok(!await toggle.isChecked());await toggle.check();await checkQuery('mobile','on');
  await p.getByRole('checkbox',{name:'주문 기능',exact:true}).uncheck();assert.equal(await toggle.count(),0);await checkQuery('mobile','off');
  await p.getByRole('checkbox',{name:'주문 기능',exact:true}).check();assert.ok(await toggle.isChecked());await checkQuery('mobile','on');
  await select.selectOption('tablet');assert.equal(await toggle.count(),0);await checkQuery('tablet','off');
  results.push({kind:'mobile-only-prepay',deviceTransitions:true,orderToggle:true,preservedPreference:true});
 }catch(e){failures.push({kind:'mobile-only-prepay',error:e.message})}finally{await p.close()}
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{await browser.close();await fs.writeFile(output+'/report.json',JSON.stringify({results,failures,errors,writes,baselineWarnings},null,2))}
console.log(JSON.stringify({checked:results.length,failures,errors,writes,baselineWarnings}));
