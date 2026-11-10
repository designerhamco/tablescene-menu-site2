import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const base=process.env.MELLOW_QA_BASE||'http://localhost:3027';
const browser=await chromium.launch(),errors=[],writes=[],results=[];
const cases=[
 ['pc',1512,900,false,false],['pc',1920,1080,true,false],
 ['tablet',1180,820,true,false],['tablet',1024,768,false,true],
 ['mobile',320,740,true,false],['mobile',430,932,false,false],
];
try {
 for(const [device,width,height,on,text] of cases){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/**',route=>route.request().method()==='GET'?route.continue():(writes.push(route.request().url()),route.abort()));
  try {
   const params=new URLSearchParams({device,view:'actual',embedded:'1',callPreview:'on',coverPreview:on?'on':'off',secondaryNamesPreview:on?'on':'off',...(text?{logoPreview:'off'}:{})});
   const response=await page.goto(`${base}/templates/cafe_mocha_forest_a/preview?${params}`,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   await page.evaluate(()=>document.fonts.ready);
   if(device!=='mobile')await page.locator('[data-native-ready=true]').waitFor();
   else await page.locator('.cafe-a-store-logo,[data-mobile-brand-fit=ready]').filter({visible:true}).first().waitFor();
   await page.waitForTimeout(250);
   const state=await page.evaluate(()=>{
    const live=selector=>[...document.querySelectorAll(selector)].filter(el=>!el.closest('[inert]')&&el.getClientRects().length);
    const headers=live('[data-native-header]'),cover=live('.cafe-a-cover-hero'),secondary=live('.cafe-a-menu-meta:not([data-cafe-a-reference-copy])');
    const chip=selector=>live(selector).map(el=>getComputedStyle(el).color);
    return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth+1,headers:headers.length,header:headers[0]?.getBoundingClientRect().toJSON(),cover:cover.length,images:live('[data-cafe-a-cover-image]').length,secondary:secondary.length,secondaryText:secondary[0]?.textContent,ordinary:chip('.cafe-a-menu-badge:not(.cafe-a-time-sale-badge)'),sale:chip('.cafe-a-time-sale-badge'),logo:live('.cafe-a-store-logo').length};
   });
   assert.deepEqual(state.viewport,[width,height]);assert.equal(state.overflow,false);
   assert.equal(state.cover>0,on);assert.equal(state.images,0);assert.equal(state.secondary>0,on);
   if(on)assert.ok(state.secondaryText.trim());
   assert.ok(state.ordinary.length&&state.sale.length);
   assert.ok([...state.ordinary,...state.sale].every(color=>color==='rgb(121, 40, 57)'));
   assert.equal(state.logo>0,!text);
   const trigger=page.locator('[data-template-language-control] button[aria-haspopup=menu]').filter({visible:true}).first();
   await trigger.click();await page.locator('[data-language-menu-surface]').filter({visible:true}).first().waitFor();
   if(state.header){const after=await page.locator('[data-native-header]').evaluate(el=>el.getBoundingClientRect().toJSON());assert.ok(Math.abs(after.height-state.header.height)<1,'popup never resizes header');}
   await page.keyboard.press('Escape');
   results.push({device,width,on,text,...state});console.log(`PASS MELLOW requested states ${device} ${width}, cover/secondary ${on?'ON':'OFF'}, ${text?'text':'logo'}`);
  } finally {await page.close();}
 }
 const page=await browser.newPage();const removed=await page.request.get(`${base}/menu-templates/cafe_mocha_forest_a/featured.png`);assert.equal(removed.status(),404);await page.close();
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({base,cases:results.length,removedImage:404,errors,writes}));
} finally {await browser.close();}
