import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.NATIVE_STRESS_BASE||'http://localhost:3018';
const out=process.env.ORDER_QA_OUTPUT||'/private/tmp/native-template-rollout/stress';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[];
const keys=['cafe_mocha_forest_a','fast_food_loop_bagel_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','restaurant_onue_a'];
try{
 for(const key of keys)for(const scenario of ['adaptive-dense','brand-logo','features','copy']){
  const page=await browser.newPage({viewport:{width:820,height:1180},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  try{
   const query={device:'tablet',view:'actual',orderPreview:'on',callPreview:'on',layoutMode:'orderedFit',...(scenario==='features'?{featureQa:'on'}:{rhythmQa:scenario})};
   await page.goto(`${base}/templates/${key}/preview?`+new URLSearchParams(query),{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>document.fonts.ready);await page.locator('[data-native-ready=true]').waitFor();await page.waitForTimeout(350);
   const measurements=await page.locator('[data-native-scroll]').evaluate(root=>{
    const menu=root.querySelector('[data-native-menu]'),bounds=menu.getBoundingClientRect();
    const expected=[...root.querySelectorAll('[data-native-measure]')].map(e=>e.dataset.nativeMeasure),shown=[...root.querySelectorAll('[data-native-unit]')].map(e=>e.dataset.nativeUnit);
    const names=[...root.querySelectorAll('[data-native-unit] [data-cafe-a-menu-name]')].map(e=>{const r=e.getBoundingClientRect(),row=e.closest('article').getBoundingClientRect();return{width:r.width,left:r.left,right:r.right,rowLeft:row.left,rowRight:row.right};});
    const logo=root.querySelector('.cafe-a-store-logo'),l=logo?.getBoundingClientRect();
    return {expected,shown,names,width:menu.clientWidth,scrollWidth:menu.scrollWidth,overflow:menu.scrollHeight-menu.clientHeight,columns:root.querySelectorAll('[data-native-column]').length,viewport:[innerWidth,innerHeight],logo:l?{width:l.width,height:l.height,natural:logo.naturalWidth/logo.naturalHeight,ratio:l.width/l.height,bottom:l.bottom}:null,bottom:bounds.bottom};
   });
   assert.deepEqual(measurements.shown,measurements.expected);assert.ok(measurements.columns<=3);
   assert.ok(measurements.scrollWidth<=measurements.width+1);
   assert.ok(measurements.names.every(n=>n.width>0&&n.left>=n.rowLeft-1&&n.right<=n.rowRight+1),'name slots remain inside native rows');
   if(scenario==='adaptive-dense')assert.ok(measurements.overflow>0,'dense menus scroll instead of shrinking');
   if(scenario==='brand-logo'){assert.ok(measurements.logo?.width>0);assert.ok(Math.abs(measurements.logo.ratio-measurements.logo.natural)<.02,'logo preserves intrinsic ratio');assert.ok(measurements.logo.bottom<1181);}
   await page.locator('[data-native-menu]').evaluate(e=>e.scrollTo({top:e.scrollHeight,behavior:'instant'}));await page.waitForTimeout(150);
   assert.equal(await page.locator('[data-native-scroll]').getAttribute('data-native-more'),'false');
   await page.screenshot({path:`${out}/${key}-${scenario}.png`});results.push({key,scenario,...measurements});
  }catch(error){failures.push({key,scenario,error:error.message});}finally{await page.close();}
 }
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors}));
