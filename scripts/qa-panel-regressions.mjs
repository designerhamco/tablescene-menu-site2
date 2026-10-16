import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const requestedKey=process.argv.find(arg=>arg.startsWith('--key='))?.slice(6);
const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a'].filter(key=>!requestedKey||key===requestedKey);
const browser=await chromium.launch();let checked=0;
const mode=process.argv.includes("--ordered")?"&layoutMode=orderedFit":"";
try {for(let i=0;i<keys.length;i+=3)await Promise.all(keys.slice(i,i+3).map(async key=>{
 const page=await browser.newPage({viewport:{width:1516,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://localhost:3000/templates/${key}/preview?device=pc&view=actual&embedded=1&callPreview=on${mode}`,{waitUntil:'domcontentloaded',timeout:60000});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>document.querySelector('.cafe-a-desktop-fit-board')?.dataset.fitPresentationState==='ready',null,{timeout:45000});
 const m=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,scroll:getComputedStyle(document.querySelector('[data-cafe-a-fit-menu]')).overflowY}));
 assert.ok(m.overflow<2,`${key} horizontal overflow`);assert.ok(!['auto','scroll'].includes(m.scroll));assert.deepEqual(errors,[]);
 for(const width of [320,430]) {
  await page.setViewportSize({width,height:844});
  await page.goto(`http://localhost:3000/templates/${key}/preview?device=mobile&view=actual&embedded=1&callPreview=on${mode}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  const m=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,gaps:[...document.querySelectorAll('[data-cafe-a-item-stack]')].filter(e=>e.getBoundingClientRect().width).slice(0,2).map(e=>getComputedStyle(e).marginBottom)}));
  assert.ok(m.overflow<2,`${key} mobile overflow`);checked++;
 }
 checked++;console.log(key,'PASS');await page.close();
})); console.log('PASS',checked,'existing-template views');}finally{await browser.close();}
