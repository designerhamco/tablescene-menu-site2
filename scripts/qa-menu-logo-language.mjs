import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3000',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/menu-logo-language';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[],errors=[];
const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a','dining_aube_table_a','dining_aube_table_b'];
try{
 for(const key of keys.filter(key=>!process.env.QA_KEYS||process.env.QA_KEYS.split(',').includes(key)))for(const [device,width,height]of[['pc',1440,900],['tablet',1180,820],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  try{
   const colors=[],themes=[];
   for(const logo of ['off','on']){
    await page.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({view:'actual',device,logoPreview:logo,callPreview:'on',orderPreview:'on'}),{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    if(!key.startsWith('dining'))await page.locator('[data-native-ready=true],[data-paged-ready=true],[data-mobile-brand-fit=ready],[data-cafe-a-store-logo]').filter({visible:true}).first().waitFor();
    await page.locator('[data-template-language-control] button,[data-aube-table-language-control] button,[data-public-menu-header-language] button,[data-table-menu-header] button').filter({visible:true}).first().waitFor();
    const color=await page.locator('[data-template-language-control] button,[data-aube-table-language-control] button,[data-public-menu-header-language] button,[data-table-menu-header] button').filter({visible:true}).first().evaluate(e=>getComputedStyle(e).color);
    colors.push(color);
    themes.push(await page.locator('[data-menu-interaction-shell]').first().evaluate(e=>{
      const s=getComputedStyle(e);return ['--menu-order-bg','--menu-order-ink','--menu-call-bg','--menu-call-ink'].map(k=>s.getPropertyValue(k).trim());
    }));
   }
   results.push({key,device,viewport:[width,height],before:colors[0],logo:colors[1],same:colors[0]===colors[1],themeSame:JSON.stringify(themes[0])===JSON.stringify(themes[1]),themes});
   console.log(key,device,colors.join(' -> '));
  }finally{await page.close();}
 }
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors},null,2));}
if(process.env.LOGO_AUDIT_ONLY!=='1')assert.ok(results.every(r=>r.same&&r.themeSame),'language trigger keeps the native rendered brand color when using a logo');
assert.deepEqual(errors,[]);console.log(JSON.stringify({checked:results.length,changed:results.filter(r=>!r.same||!r.themeSame).length}));
