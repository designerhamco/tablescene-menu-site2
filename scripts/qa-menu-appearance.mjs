import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/menu-appearance';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch(),results=[],failures=[],errors=[];
const natives=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'].map(key=>({key}));
const basics=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left'].map(design=>({key:'cafe_design_a',design}));
const albums=['basic-first-column-album','basic-top-row-album','dining-full-page-album','dining-sidebar-album'].map(design=>({key:design.startsWith('basic')?'cafe_design_a':design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a',design}));
const devices=[['pc',1440,900],['tablet',1180,820],['mobile',390,844]];
async function page(width,height){const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());return p;}
async function open(p,c,device,extra={}){await p.goto(`${base}/templates/${c.key}/preview?`+new URLSearchParams({device,view:'actual',callPreview:'on',orderPreview:'on',coverPreview:'on',imagesPreview:'on',...(c.design?{design:c.design}:{}),...extra}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);}
async function run(name,fn){try{await fn();results.push(name);console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message);}}
async function shape(c,[device,width,height],mode){const p=await page(width,height);try{
 await open(p,c,device,{appearanceQa:mode,widgetsPreview:'on',logoPreview:'on',popupPreview:'on'});assert.deepEqual(await p.evaluate(()=>[innerWidth,innerHeight]),[width,height]);
 const popup=p.locator('[data-menu-advertisement-popup]');await popup.waitFor();assert.equal(await popup.evaluate(e=>getComputedStyle(e).borderTopLeftRadius),mode==='zero'?'0px':'16px');await p.getByRole('button',{name:'닫기',exact:true}).click();
 const selectors={cover:'.cafe-a-cover-frame',item:'.cafe-a-menu-item-image-slot',widget:'[data-cafe-a-widget-media]',logo:'.cafe-a-store-logo',chip:'.cafe-a-menu-badge'};
 const expected={cover:20,item:12,widget:8,logo:4,chip:4};
 for(const [key,selector] of Object.entries(selectors)){const es=p.locator(selector).filter({visible:true});assert.ok(await es.count(),`${key} example exists`);const radii=await es.evaluateAll(es=>es.map(e=>getComputedStyle(e).borderTopLeftRadius));assert.ok(radii.every(r=>r===`${mode==='zero'?0:expected[key]}px`),`${key}: ${radii}`);}
 const roots=p.locator('.cafe-a-typography');await roots.evaluateAll(es=>es.forEach(e=>{e.style.setProperty('--menu-font-ko','Georgia');e.style.setProperty('--menu-font-en','Arial');}));
 const intro=p.locator('[data-cafe-a-store-description],.cafe-a-topline-description,.cafe-a-store-description').filter({visible:true}).first();await intro.evaluate(e=>{const span=document.createElement('span');span.className='cafe-a-script-en';span.textContent=' Store introduction';e.append(span);});
 assert.ok((await intro.locator('.cafe-a-script-en').last().evaluate(e=>getComputedStyle(e).fontFamily)).startsWith('Georgia'),'English introduction uses saved Korean font');
 if(mode==='custom'&&c.key==='fast_food_loop_bagel_a'&&device==='mobile'){const image=p.locator('.cafe-a-menu-item-image-slot').filter({visible:true}).first();await image.click();assert.equal(await p.locator('.cafe-a-image-lightbox img').evaluate(e=>getComputedStyle(e).borderTopLeftRadius),'12px');await p.getByRole('button',{name:'이미지 크게 보기 닫기',exact:true}).click();await p.screenshot({path:`${out}/loop-mobile-shapes.png`});}
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }finally{await p.close();}}
async function album(c,[device,width,height],ratio){const p=await page(width,height);try{
 await open(p,c,device,{albumImageRatio:ratio});if(c.key.startsWith('dining')){const nav=p.locator('.aube-table-pagination-dot,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({visible:true});await nav.last().click();await p.waitForTimeout(400);}
 const boxes=p.locator('.cafe-a-menu-item-image-slot,.aube-table-image-trigger').filter({visible:true});assert.ok(await boxes.count());const target=ratio.split(':').map(Number).reduce((a,b)=>a/b);const measured=await boxes.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return r.width/r.height}));assert.ok(measured.every(r=>Math.abs(r-target)<.005),JSON.stringify({ratio,measured}));
 if(c.key.startsWith('dining')){await p.locator('.aube-table-pagination-dot,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({visible:true}).nth(1).click();await p.waitForTimeout(350);const courses=p.locator('.aube-table-course[data-course-priced=true]').filter({visible:true});assert.ok(await courses.count());assert.equal(await courses.locator('.aube-table-image-trigger').count(),0);assert.ok((await courses.locator('.aube-table-course-items').evaluateAll(es=>es.map(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length))).every(n=>n===1));}
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 }finally{await p.close();}}
async function toolbar(c){const p=await page(1516,1400);try{
 await p.goto(`${base}/templates/${c.key}/preview?`+new URLSearchParams({device:'tablet',...(c.design?{design:c.design}:{})}),{waitUntil:'networkidle'});const rotate=p.locator('[data-preview-tablet-orientation-toggle]');const album=c.design?.endsWith('album');assert.equal(await rotate.count()>0,!!album||c.key.startsWith('dining'));if(album){const iframe=p.frameLocator('iframe');assert.deepEqual(await iframe.locator('body').evaluate(()=>[innerWidth,innerHeight]),[1180,820]);await rotate.click();await p.waitForTimeout(700);assert.deepEqual(await iframe.locator('body').evaluate(()=>[innerWidth,innerHeight]),[820,1180]);await p.getByRole('combobox',{name:'앨범형 상품 이미지 비율'}).selectOption('4:5');await p.waitForURL(url=>url.searchParams.get('albumImageRatio')==='4:5');assert.equal(new URL(p.url()).searchParams.get('albumImageRatio'),'4:5');assert.ok(p.url().includes('orientation=portrait'));}else assert.equal(await p.getByRole('combobox',{name:'앨범형 상품 이미지 비율'}).count(),0);
 }finally{await p.close();}}
try{
 const jobs=[...natives,...basics].flatMap(c=>devices.flatMap(d=>['custom','zero'].map(mode=>()=>run(`shape ${c.design||c.key} ${d[0]} ${mode}`,()=>shape(c,d,mode)))));
 for(let i=0;i<jobs.length;i+=3)await Promise.all(jobs.slice(i,i+3).map(fn=>fn()));
 const cards=albums.flatMap(c=>devices.flatMap(d=>['1:1','4:5','5:4'].map(ratio=>()=>run(`album ${c.design} ${d[0]} ${ratio}`,()=>album(c,d,ratio)))));
 for(let i=0;i<cards.length;i+=3)await Promise.all(cards.slice(i,i+3).map(fn=>fn()));
 for(const c of [...albums,{key:'cafe_design_a',design:'basic-first-column'},{key:'cafe_mocha_forest_a'},{key:'dining_aube_table_a',design:'dining-full-page'}])await run(`toolbar ${c.design||c.key}`,()=>toolbar(c));
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length}));
}finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors},null,2));}
