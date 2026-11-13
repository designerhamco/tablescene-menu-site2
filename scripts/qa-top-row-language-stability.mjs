import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3021';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/top-row-language-qa';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const results=[],failures=[],errors=[],writes=[];
const designs=['basic-top-row','basic-top-row-left-logo'];
const sizes=process.env.TOP_ROW_QA_SMOKE==='1'?[['pc',1440,900]]:[['pc',1440,900],['tablet',1180,820],['tablet',820,1180]];
async function settled(page){
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('[data-paged-ready=true]').waitFor();
 await page.waitForFunction(() => [...document.querySelectorAll('[data-menu-logo-slot]')].filter(e=>e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden').every(e=>e.dataset.menuLogoReady==='true'&&e.dataset.menuLogoMeasured==='true'));
 await page.waitForTimeout(200);
}
async function geometry(page){return page.evaluate(()=>{
 const header=document.querySelector('[data-basic-top-row]'),board=document.querySelector('[data-scroll-brand-board]'),menu=document.querySelector('[data-scroll-menu]');
 const h=header.getBoundingClientRect(),m=menu.getBoundingClientRect();
 return {height:h.height,bottom:h.bottom,menuTop:m.top,menuHeight:m.height,titleSize:getComputedStyle(header.querySelector('.cafe-a-store-title:not([hidden]),.cafe-a-store-logo')).fontSize,minimum:board.style.getPropertyValue('--cafe-a-header-copy-height'),columns:board.dataset.scrollColumns};
});}
function unchanged(before,after,label){
 for(const key of ['height','bottom','menuTop','menuHeight'])assert.ok(Math.abs(before[key]-after[key])<.75,`${label}: ${key} changed ${before[key]} -> ${after[key]}`);
 for(const key of ['titleSize','minimum','columns'])assert.equal(after[key],before[key],`${label}: ${key}`);
}
async function popupFits(page){
 const menu=page.locator('[data-basic-top-row] [data-language-menu-surface]');await menu.waitFor();
 const bounds=await menu.boundingBox(),viewport=page.viewportSize();
 assert.ok(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,'popup remains in viewport');
 const reachable=await menu.locator('a').last().evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))});
 assert.equal(reachable,true,'popup choices remain clickable above menu artwork');
}
try{
 for(const design of process.env.TOP_ROW_QA_FOLLOWUP==='1'?[]:designs)for(const [device,width,height]of sizes)for(const logo of [false,true])for(const cover of [false,true]){
  const id=`${design}-${device}-${width}-${logo?'logo':'text'}-${cover?'cover':'plain'}`;
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push({id,error:e.message}));
  await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
  try{
   const q=new URLSearchParams({design,device,view:'actual',embedded:'1',logoPreview:logo?'on':'off',coverPreview:cover?'on':'off',layoutMode:cover?'orderedFit':'orderedBalancedFit'});
   assert.equal((await page.goto(`${base}/templates/cafe_real_matcha_a/preview?${q}`,{waitUntil:'domcontentloaded'})).status(),200);await settled(page);
   const before=await geometry(page),trigger=page.locator('[data-basic-top-row] [data-language-menu-trigger]');
   assert.deepEqual(await page.evaluate(()=>[innerWidth,innerHeight]),[width,height]);
   for(let cycle=0;cycle<3;cycle++){
    if(cycle===1){await trigger.focus();await page.keyboard.press('Enter');}else await trigger.click();
    await popupFits(page);
    for(let sample=0;sample<3;sample++){await page.waitForTimeout(75);unchanged(before,await geometry(page),`open ${cycle}/${sample}`);}
    if(cycle===2)await trigger.click();else if(cycle===1)await page.mouse.click(5,5);else await page.keyboard.press('Escape');
    await page.locator('[data-language-menu-surface]').waitFor({state:'hidden'});await page.waitForTimeout(100);unchanged(before,await geometry(page),`closed ${cycle}`);
   }
   if(device==='pc'&&!cover){
    const description=page.locator('[data-basic-top-row] .cafe-a-store-description');const original=await description.textContent();
    await description.evaluate((el,text)=>el.textContent=text.repeat(8),original);await page.waitForTimeout(250);
    const expanded=await geometry(page);
    const copy=await description.evaluate(el=>{const s=getComputedStyle(el);return {height:el.getBoundingClientRect().height,lineHeight:parseFloat(s.lineHeight),scrollHeight:el.scrollHeight,clamp:s.getPropertyValue('-webkit-line-clamp')};});
    assert.equal(copy.clamp,'3');assert.ok(copy.height<=copy.lineHeight*3+1,'long description stays within three visible lines');assert.ok(copy.scrollHeight>copy.height+1,'overflow text remains in the rendered copy');
    await trigger.click();await popupFits(page);await page.waitForTimeout(200);unchanged(expanded,await geometry(page),'long-copy popup');await page.keyboard.press('Escape');
    await description.evaluate((el,text)=>el.textContent=text,original);await page.waitForTimeout(250);unchanged(before,await geometry(page),'restored copy');
   }
   const labels=await page.locator('[data-paged-column] .cafe-a-price-column-header').evaluateAll(es=>es.map(e=>[...e.querySelectorAll('.cafe-a-price-column-heading-label')].map(label=>label.textContent).join('')));
   assert.equal(labels.length,3);assert.ok(labels.every(text=>text==='HOTICE'),'SIGNATURE, COFFEE and NON-COFFEE use HOT/ICE');
   const text=await page.locator('[data-scroll-columns]').filter({visible:true}).last().innerText();assert.equal((text.match(/ICE ONLY/g)||[]).length,4,'all four ADE rows show ICE ONLY');
   if(device==='pc'&&!logo&&!cover){
    await trigger.click();await page.locator('[data-language-menu-item][href*="lang=en"]').click();await page.waitForURL(u=>u.searchParams.get('lang')==='en');await settled(page);
    const english=await geometry(page);await page.locator('[data-basic-top-row] [data-language-menu-trigger]').click();await popupFits(page);await page.waitForTimeout(200);unchanged(english,await geometry(page),'localized popup');await page.keyboard.press('Escape');
   }
   await page.screenshot({path:`${output}/${id}.png`});results.push({id,viewport:[width,height],before,after:await geometry(page)});console.log('PASS',id);
  }catch(error){failures.push({id,error:error.message});console.log('FAIL',id,error.message);await page.screenshot({path:`${output}/${id}-failure.png`});}
  finally{await page.close();}
 }
 // Catalog controls still permit an explicit ON/OFF override of the OFF starter.
 for(const design of designs){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${base}/templates/cafe_real_matcha_a/preview?design=${design}&device=pc`,{waitUntil:'domcontentloaded'});
  await page.locator('main[data-options-open=true]').waitFor();
  const toggle=page.getByRole('checkbox',{name:'대표 영역 보기',exact:true});await toggle.waitFor();assert.equal(await toggle.isChecked(),false);
  await toggle.check();await page.waitForURL(u=>u.searchParams.get('coverPreview')==='on');assert.equal(await toggle.isChecked(),true);
  await toggle.uncheck();await page.waitForURL(u=>u.searchParams.get('coverPreview')==='off');assert.equal(await toggle.isChecked(),false);
  results.push({id:`${design}-view-options`,defaultOff:true,override:true});await page.close();
 }
 for(const design of designs){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await page.goto(`${base}/templates/cafe_real_matcha_a/preview?`+new URLSearchParams({design,device:'mobile',view:'actual',embedded:'1'}),{waitUntil:'domcontentloaded'});
  await page.locator('[data-mobile-brand-fit=ready]').filter({visible:true}).first().waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.cafe-a-cover-hero').filter({visible:true}).count(),0,'mobile starter representative area is OFF');
  assert.equal(await page.locator('.cafe-a-store-description').filter({visible:true}).first().evaluate(e=>getComputedStyle(e).fontSize),'14px');
  results.push({id:`${design}-mobile-default`,viewport:[390,844]});await page.close();
 }
 for(const key of ['cafe_sunday_line_a','cafe_van_gogh_a','cafe_mocha_forest_a']){
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.goto(`${base}/templates/${key}/preview?device=pc&view=actual&embedded=1`,{waitUntil:'domcontentloaded'});
  await page.locator('[data-native-ready=true]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.locator('[data-cafe-a-topline-info-header] img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));await page.waitForTimeout(250);
  const header=page.locator('[data-cafe-a-topline-info-header]'),before=await header.boundingBox();
  await page.locator('[data-language-menu-trigger]').filter({visible:true}).first().click();await page.locator('[data-language-menu-surface]').filter({visible:true}).waitFor();await page.waitForTimeout(250);
  assert.ok(Math.abs((await header.boundingBox()).height-before.height)<.75,'native header remains stable');
  results.push({id:`${key}-native-header`});await page.close();
 }
 if(process.env.TOP_ROW_CAPTURE==='1')for(const design of designs){
  const page=await browser.newPage({viewport:{width:1180,height:820},reducedMotion:'reduce'});
  await page.goto(`${base}/templates/cafe_real_matcha_a/preview?`+new URLSearchParams({design,device:'tablet',view:'actual',embedded:'1',callPreview:'on',orderPreview:'on'}),{waitUntil:'domcontentloaded'});await settled(page);await page.addStyleTag({content:'nextjs-portal { display:none !important; }'});
  await page.screenshot({path:`public/template-previews/default-${design}-${design==='basic-top-row'?'20261110':'20261110-v2'}.jpg`,type:'jpeg',quality:86});await page.close();
 }
}finally{await browser.close();await writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length,failures,errors,writes}));
