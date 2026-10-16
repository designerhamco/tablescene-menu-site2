import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
const errors = [];
const cases = [
 ['pc',1516,844,'ko',''],['tablet',1024,768,'ko',''],['tablet',768,1024,'ko',''],
 ['mobile',320,844,'ko',''],['mobile',430,900,'ja',''],['pc',1516,844,'en',''],
 ['pc',1516,844,'zh',''],['mobile',390,844,'ko','no-cover'],
 ['pc',1516,844,'ko','no-cover'],['mobile',390,844,'ko','brand-logo'],
 ['pc',1516,844,'ko','brand-logo'],['mobile',320,844,'ko','call-off'],['mobile',430,900,'en','call-off'],['pc',1516,844,'ko','call-off'],['pc',1516,844,'ko','panel-single'],['tablet',1024,768,'ko','panel-two'],
];
const selectedCases=process.argv.includes("--mobile") ? cases.filter(([device])=>device==='mobile') : process.argv.includes("--quick") ? cases.slice(0,2) : process.argv.includes("--geometry") ? cases.filter(([device,,,lang,fixture])=>device==='mobile'&&lang==='ko'&&(fixture===''||fixture==='call-off')) : cases;
const results=[];
try {
 for (let index=0;index<selectedCases.length;index+=1) await Promise.all(selectedCases.slice(index,index+1).map(async ([device,width,height,lang,fixture])=>{
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:3000/templates/restaurant_onue_a/preview?device=${device}&view=actual&embedded=1&callPreview=${fixture==='call-off'?'off':'on'}&lang=${lang}&rhythmQa=${fixture}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  if(device!=='mobile') await page.waitForFunction(()=>document.querySelector('.cafe-a-desktop-fit-board')?.dataset.fitPresentationState==='ready',null,{timeout:45000});
  else await page.waitForFunction(()=>[...document.querySelectorAll('[data-mobile-brand-fit]')].filter(e=>e.getBoundingClientRect().width).every(e=>e.dataset.mobileBrandFit==='ready'),null,{timeout:15000});
  await page.waitForTimeout(1000);
  if(device!=='mobile') await page.waitForFunction(()=>document.querySelector('.cafe-a-desktop-fit-board')?.dataset.fitPresentationState==='ready',null,{timeout:45000});
  const metrics=await page.evaluate(()=>{
   const visible=e=>e.getBoundingClientRect().width>0;
   const board=document.querySelector('.cafe-a-desktop-fit-board');
   const intro=[...document.querySelectorAll('.cafe-a-panel-intro')].find(visible);
   const plain=[...document.querySelectorAll('.cafe-a-panel-plain-intro')].find(visible);
   const identity=(intro||plain)?.querySelector('.cafe-a-panel-identity')?.getBoundingClientRect();
   const featured=intro?.querySelector('.cafe-a-featured-copy')?.getBoundingClientRect();
   const controls=(intro||plain)?.querySelector('.cafe-a-panel-controls')?.getBoundingClientRect();
   const frame=(intro||plain)?.getBoundingClientRect();
   const footer=[...document.querySelectorAll('[data-cafe-a-footer-info]')].find(visible);
   const lastItem=[...document.querySelectorAll('[data-cafe-a-menu-item]')].filter(visible).at(-1)?.getBoundingClientRect();
   const brand=(intro||plain)?.querySelector('[data-cafe-a-store-title]');
   const column=footer?.closest('[data-cafe-a-balanced-column]');
   return {viewport:[innerWidth,innerHeight],state:board?.dataset.fitPresentationState,layout:board?.dataset.layoutMode,inset:parseFloat(getComputedStyle(board.querySelector("[data-cafe-a-fit-menu]")).paddingLeft),overflow:board?.dataset.fitOverflow,columns:Number(board?.dataset.fitColumns),basis:board?.dataset.fitCopyBasis,
    footerAlignment:footer?getComputedStyle(footer).textAlign:null,
    footerGap:footer&&lastItem?footer.getBoundingClientRect().top-lastItem.bottom:null,
    noticeListCount:[...document.querySelectorAll('.cafe-a-mobile-notice-list')].filter(visible).length,
    noticesInIdentity:Boolean((intro||plain)?.querySelector('.cafe-a-mobile-notice-list')),
    footerText:footer?.innerText??'',
    controlWithinFrame:Boolean(controls&&frame&&controls.top>=frame.top-1&&controls.right<=frame.right+1),
    callInsideIntro:Boolean((intro||plain)?.querySelector('[data-one-page-call-bar]')),
    controlRightInset:controls&&frame?frame.right-controls.right:null,
    equalGapDifference:controls&&identity&&featured?Math.abs(identity.top-controls.bottom-(featured.top-identity.bottom)):null,
    brandTarget:brand?.dataset.canvasBrandTarget,
    identityCenterDelta:identity&&frame?Math.abs((identity.left+identity.right-frame.left-frame.right)/2):null,
    documentOverflow:document.documentElement.scrollWidth-innerWidth,
    overlap:identity&&featured?identity.bottom+12>featured.top+1:false,
    footerClearance:footer&&column?column.getBoundingClientRect().bottom-parseFloat(getComputedStyle(column).paddingBottom)-footer.getBoundingClientRect().bottom:null,
    featuredClearance:featured&&frame?frame.bottom-featured.bottom:null,
    featuredWithinFrame:!featured||!frame||featured.bottom<=frame.bottom+1,
    imageRatio:intro?intro.offsetWidth/intro.offsetHeight:null,plain:Boolean(plain),
    logo:Boolean((intro||plain)?.querySelector('.cafe-a-store-logo')),
    panels:[...board.querySelectorAll('[data-cafe-a-balanced-column]')].filter(visible).map(e=>({width:e.offsetWidth,text:e.innerText.slice(0,25)})),
   };
  });
  assert.equal(metrics.documentOverflow,0,JSON.stringify({device,fixture,metrics}));
  assert.equal(metrics.featuredWithinFrame,true,JSON.stringify(metrics));
  assert.equal(metrics.overlap,false,JSON.stringify({device,fixture,metrics}));
  if(device!=='mobile') {assert.equal(metrics.layout,'orderedFit');assert.ok(metrics.inset>=36);assert.equal(metrics.noticesInIdentity,false);assert.ok(metrics.footerText.includes('런치')||lang!=='ko'||fixture==='panel-single');assert.equal(metrics.brandTarget,fixture==='brand-logo'?undefined:'0.75');if(metrics.equalGapDifference!==null)assert.ok(metrics.equalGapDifference<2,JSON.stringify(metrics));assert.equal(metrics.overflow,'false',JSON.stringify({device,fixture,metrics}));assert.ok(metrics.footerClearance===null||metrics.footerClearance>=-2,JSON.stringify(metrics));}
  assert.equal(metrics.controlWithinFrame,true,JSON.stringify(metrics));
  assert.ok(metrics.identityCenterDelta<2,JSON.stringify(metrics));
  if(device==='mobile') {assert.equal(metrics.callInsideIntro,fixture!=='call-off');assert.equal(metrics.noticesInIdentity,false);assert.equal(metrics.noticeListCount,1);assert.equal(metrics.footerAlignment,'right');assert.ok(Math.abs(metrics.footerGap-48)<2,JSON.stringify(metrics));}
  if(fixture==='no-cover'||fixture==='panel-single')assert.equal(metrics.plain,true);
  if(fixture==='panel-single')assert.equal(metrics.columns,1);
  if(fixture==='brand-logo')assert.equal(metrics.logo,true);
  if(introCase(fixture))assert.ok(Math.abs(metrics.imageRatio-1)<.01);
  await page.screenshot({path:`/tmp/onue-${device}-${width}-${lang}-${fixture||'default'}.png`,fullPage:true});
  results.push({device,fixture,lang,...metrics});console.log(JSON.stringify(results.at(-1)));
  await page.close();
 }));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(`PASS ${results.length} panel cases`);
} finally {await browser.close();}
function introCase(fixture){return fixture!=='no-cover'&&fixture!=='panel-single';}
