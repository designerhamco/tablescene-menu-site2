import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const out=process.env.ORDER_QA_OUTPUT||'/private/tmp/basic-supporting-copy';await fs.mkdir(out,{recursive:true});
const native=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'].map(key=>({key}));
const neutral=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album'].map(design=>({key:'cafe_design_a',design}));
const cases=[...native,...neutral].flatMap(c=>[['pc',1440,900],['tablet',1180,820],['mobile',390,844]].map(([device,width,height])=>({...c,device,width,height})));
for(const key of native.map(c=>c.key))for(const width of [320,430])cases.push({key,device:'mobile',width,height:844});
const browser=await chromium.launch(),rows=[],failures=[],errors=[];
async function measure(p){return p.evaluate(()=>{
 const visible=e=>!e.closest('[inert],[aria-hidden=true]')&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
 const selectors={store:'[data-cafe-a-store-description],.cafe-a-topline-description',product:'[data-cafe-a-menu-description]',notices:'[data-native-notices],[data-paged-notices],.cafe-a-topline-notice-text,.cafe-a-mobile-notice-list p,.cafe-a-round-focus-mobile-notices .cafe-a-menu-description,.cafe-a-round-focus-notices .cafe-a-menu-description',featured:'.cafe-a-featured-description',category:'[data-cafe-a-category-description]',widget:'[data-cafe-a-widget-body]',sale:'.cafe-a-time-sale-time-text'};
 const roles=Object.fromEntries(Object.entries(selectors).map(([role,selector])=>[role,[...document.querySelectorAll(selector)].filter(e=>visible(e)&&(role!=='store'||!e.closest('.cafe-a-footer-info'))).map(e=>({size:parseFloat(getComputedStyle(e).fontSize),text:e.textContent.slice(0,35)}))]));
 return {viewport:[innerWidth,innerHeight],roles,notes:[...document.querySelectorAll('.cafe-a-price-note,.cafe-a-price-label')].filter(visible).map(e=>e.textContent),overflow:document.documentElement.scrollWidth-innerWidth};
});}
function sameCopy(row){const sizes=Object.values(row.roles).flat().map(r=>r.size);assert.ok(row.roles.product.length,'actual product descriptions exist');assert.ok(row.roles.notices.length,'actual notice rows exist');assert.ok(sizes.every(size=>Math.abs(size-sizes[0])<.02),JSON.stringify(Object.fromEntries(Object.entries(row.roles).map(([r,es])=>[r,[...new Set(es.map(e=>e.size))]]))));assert.ok(row.overflow<=1,'no page horizontal overflow');}
async function run(c){const p=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));try{
 const params=new URLSearchParams({device:c.device,view:'actual',callPreview:'on',orderPreview:'on',secondaryNamesPreview:'on',descriptionsPreview:'on',categoryDescriptionsPreview:'on',widgetsPreview:'on',priceOptionsPreview:'on',priceNotesPreview:'on',...(c.design?{design:c.design}:{})});
 await p.goto(`${base}/templates/${c.key}/preview?${params}`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);const three=await measure(p);assert.deepEqual(three.viewport,[c.width,c.height]);sameCopy(three);assert.ok(three.notes.length>=2,'price note demonstration covers multiple products');
 params.set('secondaryNamesPreview','off');await p.goto(`${base}/templates/${c.key}/preview?${params}`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);const two=await measure(p);sameCopy(two);assert.equal(two.roles.product[0].size,three.roles.product[0].size,'hiding secondary name does not enlarge descriptions');
 if(c.device!=='mobile'){
  await p.locator('.cafe-a-typography').first().evaluate(root=>{root.style.setProperty('--menu-role-supporting-size-scale','1.1');root.style.setProperty('--menu-role-item-name-size-scale','1.15');});await p.waitForTimeout(200);sameCopy(await measure(p));
 }
 rows.push({...c,three,two});console.log('PASS',c.design||c.key,c.device,c.width);
}catch(e){failures.push({...c,error:e.message});console.log('FAIL',c.design||c.key,c.device,c.width,e.message);}finally{await p.close();}}
try{for(let i=0;i<cases.length;i+=3)await Promise.all(cases.slice(i,i+3).map(run));}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({rows,failures,errors},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:rows.length}));
