import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3000',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/template-feature-completeness';
await fs.mkdir(out,{recursive:true});
const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a','dining_aube_table_a','dining_aube_table_b'];
const sizes=process.env.FEATURE_QA_NARROW==='1'?[['mobile',320,844],['mobile',430,932]]:process.env.FEATURE_QA_SMOKE==='1'?[['pc',1440,900]]:[['pc',1440,900],['tablet',1180,820],['mobile',390,844]];
const flags=Object.fromEntries(['logoPreview','widgetsPreview','coverPreview','featuredPreview','imagesPreview','categoryDescriptionsPreview','secondaryNamesPreview','descriptionsPreview','priceOptionsPreview','priceNotesPreview','timeSalesPreview','soldOutPreview'].map(k=>[k,'on']));
const b=await chromium.launch(),results=[],errors=[],failures=[],writes=[];
const visible=(p,selector)=>p.locator(selector).filter({visible:true});
const luminance=color=>{const c=color.replace('#','');const nums=c.match(/.{2}/g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return nums[0]*.2126+nums[1]*.7152+nums[2]*.0722;};
async function check(key,device,width,height){const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push({key,device,error:e.message}));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));try{
 const dining=key.startsWith('dining');
 await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({device,view:'actual',callPreview:'on',orderPreview:'on',...flags}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
 if(dining){await p.locator('[data-aube-table]').waitFor();const nav=visible(p,'.aube-table-pagination-dot,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button');await nav.nth(1).click();await p.locator('.aube-table-page').waitFor();}
 else await visible(p,'[data-native-ready=true],[data-paged-ready=true],[data-mobile-brand-fit=ready],[data-cafe-a-store-logo]').first().waitFor();
 await p.waitForTimeout(400);
 assert.deepEqual(await p.evaluate(()=>[innerWidth,innerHeight]),[width,height]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal clipping');
 if(!dining){const items=visible(p,'[data-cafe-a-menu-item]');const count=await items.count();assert.ok(count>0);assert.equal(await items.locator('.cafe-a-menu-item-image-slot').count(),count,'each eligible product has an image or placeholder');assert.equal(await items.locator('.cafe-a-menu-meta').filter({visible:true}).count(),count,'every item has secondary copy');assert.equal(await items.locator('.cafe-a-menu-description').filter({visible:true}).count(),count,'every item has description');assert.equal(await visible(p,'[data-cafe-a-category-description]').count(),await visible(p,'.cafe-a-category-title').count(),'all category descriptions are present');
 const notes=await visible(p,'.cafe-a-price-pair-with-note').evaluateAll(es=>es.map(e=>{const children=[...e.children].filter(c=>c.getBoundingClientRect().width>0),a=children[0]?.getBoundingClientRect(),b=children[1]?.getBoundingClientRect();return a&&b?(b.left>=a.right?b.left-a.right:b.top-a.bottom):null;}));assert.ok(notes.length>0,'price explanation sample is visible');assert.ok(notes.every(n=>n===null||n>=3.5),'notes have real whitespace before their prices');
 }else{assert.equal(await p.locator('.aube-table-course[data-course-priced=true] .aube-table-item-image').count(),0);assert.equal(await p.locator('.aube-table-course-description').count(),await p.locator('.aube-table-course').count());}
 const iconTones = await visible(p, '[data-menu-order-add]').evaluateAll(buttons => buttons.map(button => {
   const item = button.closest('[data-cafe-a-menu-item],.aube-table-item');
   const label = item?.querySelector('[data-cafe-a-menu-name],.aube-table-item-heading h3');
   if (!label) return null;
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');
   const light=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const c=ctx.getImageData(0,0,1,1).data;return (c[0]*.2126+c[1]*.7152+c[2]*.0722)/255;};
   return {text:light(getComputedStyle(label).color),icon:light(getComputedStyle(button).color)};
 }));
 assert.ok(iconTones.every(tone=>!tone||tone.text>.995||tone.icon>tone.text+.005),'item-add icons are slightly lighter than item text');
 const widgets=visible(p,'[data-cafe-a-widget-block]');assert.ok(await widgets.count()>0,'full widget is visible');for(const widget of await widgets.all()){assert.ok(await widget.locator('[data-cafe-a-widget-media]').count());assert.ok(await widget.locator('[data-cafe-a-widget-title]').textContent());assert.ok(await widget.locator('[data-cafe-a-widget-body]').textContent());}
 const palette=await p.locator('[data-menu-interaction-shell]').evaluate(e=>{const s=getComputedStyle(e);return Object.fromEntries(['--menu-order-bg','--menu-order-ink','--menu-call-bg','--menu-call-border'].map(k=>[k,s.getPropertyValue(k).trim()]));});assert.ok(luminance(palette['--menu-order-bg'])<luminance(palette['--menu-call-bg']),'Order uses the darker menu swatch');assert.ok(luminance(palette['--menu-order-ink'])>luminance(palette['--menu-order-bg']));
 if(key==='restaurant_onue_a'){assert.equal(await visible(p,'[data-native-unit] .cafe-a-time-sale-badge,[data-cafe-a-mobile-style=true] .cafe-a-time-sale-badge:not(.cafe-a-featured-badge)').count(),2,'both ONUE sale examples remain visible with sold-out ON');const logo=visible(p,'.cafe-a-store-logo');const geometry=await logo.evaluate(e=>{const r=e.getBoundingClientRect(),parent=e.closest('.cafe-a-panel-identity').getBoundingClientRect();return{center:r.x+r.width/2,parentCenter:parent.x+parent.width/2};});assert.ok(Math.abs(geometry.center-geometry.parentCenter)<1,'ONUE logo is centered');const ratio=await p.locator('.cafe-a-panel-intro').filter({visible:true}).first().evaluate(e=>e.getBoundingClientRect().width/e.getBoundingClientRect().height);assert.ok(Math.abs(ratio-(device==='mobile'?1:4/3))<.03,'ONUE representative retains its device ratio');
 const content=await p.locator('.cafe-a-panel-intro').filter({visible:true}).first().evaluate(e=>({bottom:e.getBoundingClientRect().bottom,children:[...e.querySelectorAll('.cafe-a-panel-identity,.cafe-a-featured-copy')].map(n=>n.getBoundingClientRect().bottom)}));assert.ok(content.children.every(bottom=>bottom<=content.bottom+1),'all representative content stays inside the photo');}
 await p.screenshot({path:`${out}/${key}-${device}.png`});results.push({key,device,viewport:[width,height],widgets:await widgets.count(),palette});console.log('PASS',key,device);
 }catch(e){failures.push({key,device,error:e.message});console.log('FAIL',key,device,e.message);}finally{await p.close();}}
try{const cases=keys.filter(k=>!process.env.QA_KEYS||process.env.QA_KEYS.split(',').includes(k)).flatMap(key=>sizes.map(size=>[key,...size]));for(let i=0;i<cases.length;i+=3)await Promise.all(cases.slice(i,i+3).map(args=>check(...args)));
 // Device toolbar really hides Basic rotation and retains Dining rotation.
 for(const key of ['cafe_design_a','cafe_mocha_forest_a','restaurant_onue_a','dining_aube_table_a','dining_aube_table_b']){const p=await b.newPage({viewport:{width:1440,height:1100}});try{await p.goto(`${base}/templates/${key}/preview?device=tablet&orientation=portrait`,{waitUntil:'networkidle'});assert.equal(await p.locator('[data-preview-tablet-orientation-toggle]').count(),key.startsWith('dining')?1:0);results.push({key,behavior:'tablet-rotation'});}catch(e){failures.push({key,error:e.message});}finally{await p.close();}}
 // Source starters also remain complete without forced visibility overrides.
 for(const key of ['fast_food_loop_bagel_a','restaurant_onue_a']){
  const p=await b.newPage({viewport:{width:1180,height:820},reducedMotion:'reduce'});
  try{
   await p.goto(`${base}/templates/${key}/preview?device=tablet&view=actual&callPreview=on&orderPreview=on`,{waitUntil:'networkidle'});
   await p.locator('[data-native-ready=true]').waitFor();
   if(key==='fast_food_loop_bagel_a'){
    for(const file of ['sesame-bagel.webp','strawberry-cream-cheese.webp']){
     const img=p.locator(`[data-native-unit] img[src$="${file}"]`);await img.waitFor();
     assert.ok(await img.evaluate(e=>e.complete&&e.naturalWidth>0),`${file} loads from the starter`);
    }
    assert.ok(await p.locator('[data-native-unit] .cafe-a-price-pair-with-note').count());
   }else{
    const rows=p.locator('[data-native-unit] [data-cafe-a-menu-item]');
    assert.equal(await rows.locator('.cafe-a-menu-item-image-slot').count(),await rows.count());
    const sales=p.locator('[data-native-unit] .cafe-a-time-sale-badge');
    assert.equal(await sales.count(),2);
    assert.ok((await sales.evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor))).every(c=>c==='rgb(113, 63, 54)'));
    assert.ok(await p.locator('[data-native-unit] .cafe-a-time-sale-time-text').filter({hasText:'계절 디저트 특별가'}).count());
   }
   results.push({key,behavior:'starter-defaults'});
  }catch(e){failures.push({key,behavior:'starter-defaults',error:e.message});}finally{await p.close();}
 }
}finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
