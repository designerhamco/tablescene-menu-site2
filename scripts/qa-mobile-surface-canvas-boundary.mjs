import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

// Local-only retained canvas regression; the fixture never becomes a product route.
const base=process.env.SURFACE_QA_BASE||'http://localhost:3000';
assert.match(base,/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/);
const route='app/qa-mobile-surface-legacy';
const fixture=await fs.readFile('scripts/fixtures/menu-surfaces-page.tsx','utf8');
const renderer='<MenuPageRenderer {...data} mode="public" />';
assert.ok(fixture.includes(renderer));
await fs.mkdir(route,{recursive:true});
await fs.writeFile(`${route}/page.tsx`,fixture.replace(renderer,'<MenuPageRenderer {...data} pagePresentation="multi" mode="public" />'));
const browser=await chromium.launch(),results=[],errors=[],writes=[];
try{
 for(const template of ['cafe_sunday_line_a','cafe_van_gogh_a','cafe_mocha_forest_a'])for(const[device,width,height]of [['pc',1440,900],['tablet',820,1180]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
  try{
   await page.goto(`${base}/qa-mobile-surface-legacy?${new URLSearchParams({template,device,choice:'custom'})}`,{waitUntil:'domcontentloaded'});
   await page.locator('.cafe-a-typography').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   const state=await page.evaluate(()=>({viewport:[innerWidth,innerHeight],native:!!document.querySelector('[data-native-scroll]'),
    surfaces:[...document.querySelectorAll('[data-menu-mobile-representative]')].map(e=>e.getBoundingClientRect().height),
    mobileHeaders:[...document.querySelectorAll('header:has(.cafe-a-mobile-header-copy)')].map(e=>e.getBoundingClientRect().height),
    copyBackground:getComputedStyle(document.querySelector('.cafe-a-mobile-header-copy')).backgroundColor}));
   assert.deepEqual(state.viewport,[width,height]);assert.equal(state.native,false,'explicitly exercise retained canvas');
   assert.ok(state.surfaces.every(h=>h===0),'mobile boundary cannot appear in canvas');
   if(template!=='cafe_mocha_forest_a')assert.ok(state.mobileHeaders.every(h=>h===0),'centered canvas header visibility is preserved');
   assert.equal(state.copyBackground,'rgb(233, 212, 186)','canvas keeps its original auxiliary copy fill');
   results.push({template,device,...state});console.log('PASS',template,device);
  }finally{await page.close();}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{await browser.close();await fs.rm(route,{recursive:true,force:true});}
console.log(JSON.stringify({checked:results.length,errors,writes}));
