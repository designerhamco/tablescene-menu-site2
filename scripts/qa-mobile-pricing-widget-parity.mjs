import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/mobile-pricing-widget-parity';
await fs.mkdir(out,{recursive:true});
const b=await chromium.launch(),rows=[],errors=[];
const native=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'];
const basics=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left'];
async function page(width=390,height=844){const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());return p;}
async function open(p,key,device,extra={}){await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({view:'actual',device,callPreview:'on',orderPreview:'on',imagesPreview:'on',priceOptionsPreview:'on',...extra}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);}
async function priceGeometry(p){return p.locator('[data-cafe-a-category-block]').filter({visible:true}).evaluateAll(es=>es.filter(e=>e.querySelector('[data-cafe-a-price-columns]')).map(category=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
 return {layout:category.dataset.mobilePriceLayout,headerVisible:[...category.querySelectorAll('.cafe-a-category-price-column-slot')].some(e=>e.getBoundingClientRect().width>0),rows:[...category.querySelectorAll('.cafe-a-menu-item-has-price-columns')].map(e=>{const area=e.querySelector('.cafe-a-price-area'),copy=e.querySelector('.cafe-a-menu-copy'),img=e.querySelector('.cafe-a-menu-item-image-slot');return {item:rect(e),copy:rect(copy),img:img&&rect(img),price:rect(area),labels:[...e.querySelectorAll('.cafe-a-mobile-option-label')].map(e=>{const range=document.createRange();range.selectNodeContents(e);return rect({getBoundingClientRect:()=>range.getBoundingClientRect()});}),numbers:[...e.querySelectorAll('.cafe-a-price-column-cell > .cafe-a-menu-price')].map(rect)};})};}));}
async function mobile(c,width){const p=await page(width);try{
 await open(p,c.key,'mobile',c.design?{design:c.design}:{});assert.deepEqual(await p.evaluate(()=>[innerWidth,innerHeight]),[width,844]);
 let data=await priceGeometry(p);assert.ok(data.length,'price-option categories present');
 for(const cat of data){assert.equal(cat.headerVisible,false);assert.ok(['horizontal','vertical'].includes(cat.layout));for(const row of cat.rows){assert.ok(Math.abs(row.price.width-row.item.width)<1,'price area uses whole product row');assert.ok(row.price.top>=Math.max(row.copy.bottom,row.img?.bottom||0)-1,'prices follow both copy and image');if(row.img)assert.ok(row.copy.width>=row.item.width-row.img.width-20,'copy no longer reserves price width');for(let i=1;i<row.labels.length;i++){if(cat.layout==='horizontal')assert.ok(row.labels[i].left-row.labels[i-1].right>=8,'labels keep readable separation');}}}
 // Long labels change the whole category; editing text and resizing must remeasure.
 const cat=p.locator('[data-cafe-a-category-block]').filter({visible:true}).filter({has:p.locator('[data-cafe-a-price-columns]')}).last();
 await cat.locator('.cafe-a-mobile-option-label').evaluateAll(es=>es.forEach(e=>{e.textContent='EXTRA LARGE SHARING PORTION FAMILY SIZE EXTRA LARGE';}));await p.waitForTimeout(250);assert.equal(await cat.getAttribute('data-mobile-price-layout'),'vertical');
 await cat.locator('.cafe-a-mobile-option-label').evaluateAll(es=>es.forEach((e,i)=>{e.textContent=['S','M','L'][i%3];}));await p.setViewportSize({width:430,height:844});await p.waitForTimeout(250);assert.equal(await cat.getAttribute('data-mobile-price-layout'),'horizontal');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));rows.push({kind:'mobile-prices',...c,width});console.log('PASS mobile',c.design||c.key,width);
 if(c.key==='restaurant_onue_a'&&width===390){await cat.scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/mobile-price-options.png`});}
 }finally{await p.close();}}
async function badgeAndRadius(c){const device=c.device||'mobile',p=await page(device==='pc'?1440:390,device==='pc'?900:844);try{
 await open(p,c.key,device,{...(c.design?{design:c.design}:{}),coverImagesPreview:'on'});
 if(c.key.startsWith('dining')){await p.locator('.aube-table-mobile-page-tabs button,.aube-table-pagination-dot,.aube-table-sidebar-list button').filter({visible:true}).last().click();await p.waitForTimeout(450);}
 const image=p.locator('.cafe-a-menu-item-image-slot,.aube-table-image-trigger').filter({visible:true}).first();
 for(const radius of ['0px','8px']){await image.evaluate((e,r)=>{e.style.borderRadius=r;const img=e.querySelector('img');if(img)img.style.borderRadius=r;},radius);await image.click();const preview=p.locator('.cafe-a-image-lightbox img');await preview.waitFor();assert.equal(await preview.evaluate(e=>getComputedStyle(e).borderTopLeftRadius),radius,'lightbox carries source corners');await p.getByRole('button',{name:'이미지 크게 보기 닫기',exact:true}).click();}
 const add=p.locator('[data-menu-order-add]').filter({visible:true}).first();await add.click();const dialog=p.getByRole('dialog');for(const field of await dialog.locator('fieldset').all())await field.getByRole('button').first().click();await dialog.getByRole('button',{name:/장바구니 담기/}).click();await dialog.waitFor({state:'hidden'});
 const badge=p.locator('[data-menu-cart-count]').filter({visible:true}).first();await badge.waitFor();
 for(const ink of ['rgb(255, 249, 238)','rgb(113, 63, 54)']){await badge.evaluate((e,color)=>{e.closest('button').style.color=color;const svg=e.closest('button').querySelector('svg');svg.style.color=color;},ink);await p.waitForTimeout(150);const result=await badge.evaluate(e=>({background:getComputedStyle(e,'::before').backgroundColor,number:getComputedStyle(e.firstElementChild).color,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));assert.equal(result.background,ink);assert.notEqual(result.number,ink);assert.equal(result.w,result.h);}
 rows.push({kind:'badge-radius',...c});console.log('PASS badge-radius',c.design||c.key);
 }finally{await p.close();}}
async function mocha(device,width,height){const p=await page(width,height);try{
 await open(p,'cafe_mocha_forest_a',device);const widget=p.locator('[data-cafe-a-widget-block]').filter({visible:true}).first();await widget.waitFor();const media=await widget.locator('img').evaluate(e=>({fit:getComputedStyle(e).objectFit,position:getComputedStyle(e).objectPosition,ratio:e.parentElement.getBoundingClientRect().width/e.parentElement.getBoundingClientRect().height}));assert.equal(media.fit,'contain');assert.equal(media.position,'100% 100%');assert.ok(Math.abs(media.ratio-3)<.02);assert.equal(await widget.locator('[data-cafe-a-widget-title],[data-cafe-a-widget-body]').count(),0);
 if(device!=='mobile'){const hero=await p.locator('.cafe-a-cover-frame').evaluate(e=>{const r=e.getBoundingClientRect(),rail=e.closest('[data-native-brand]').getBoundingClientRect();return {ratio:r.width/r.height,bottom:r.bottom,railBottom:rail.bottom};});assert.ok(Math.abs(hero.ratio-.8)<.002);assert.ok(Math.abs(hero.bottom-hero.railBottom)<1);}
 await open(p,'cafe_mocha_forest_a',device,{widgetsPreview:'off'});assert.equal(await p.locator('[data-cafe-a-widget-block]').count(),0);rows.push({kind:'mocha',device,width,height});
 }finally{await p.close();}}
async function widgetInk(c){const p=await page();try{
 await open(p,c.key,'mobile',{widgetsPreview:'on',...(c.design?{design:c.design}:{})});
 if(c.key.startsWith('dining')){await p.locator('.aube-table-mobile-page-tabs button,.aube-table-pagination-dot,.aube-table-sidebar-list button').filter({visible:true}).nth(1).click();await p.waitForTimeout(400);}
 const bodies=p.locator('[data-cafe-a-widget-body]').filter({visible:true});await bodies.first().waitFor();assert.ok(await bodies.count(),'widget includes actual supporting text');
 await p.locator('.cafe-a-typography').evaluateAll(es=>es.forEach(e=>{e.setAttribute('data-menu-text-colors','itemName supporting price');e.style.setProperty('--menu-role-supporting-color','#246888');e.style.setProperty('--menu-role-item-name-color','#246888');e.style.setProperty('--menu-role-price-color','#246888');}));
 for(const ink of await p.locator('[data-cafe-a-widget-body],[data-cafe-a-widget-title]').filter({visible:true}).evaluateAll(es=>es.map(e=>getComputedStyle(e).color)))assert.equal(ink,'rgb(36, 104, 136)');
 rows.push({kind:'widget-ink',...c});console.log('PASS widget ink',c.design||c.key);
 }finally{await p.close();}}
try{
 const jobs=[...native.map(key=>({key})),...basics.map(design=>({key:'cafe_design_a',design}))].flatMap(c=>[320,390,430].map(w=>()=>mobile(c,w)));
 if(!process.env.PARITY_WIDGET_ONLY)for(let i=0;i<jobs.length;i+=3)await Promise.all(jobs.slice(i,i+3).map(fn=>fn()));
 if(!process.env.PARITY_WIDGET_ONLY)for(const c of [{key:'cafe_mocha_forest_a'},{key:'restaurant_onue_a'},{key:'fast_food_loop_bagel_a'},{key:'dining_aube_table_a',design:'dining-full-page',device:'pc'},{key:'dining_aube_table_b',design:'dining-sidebar',device:'pc'},...['basic-first-column','basic-top-row-album','dining-full-page','dining-full-page-album','dining-sidebar','dining-sidebar-album'].map(design=>({design,key:design.startsWith('basic')?'cafe_design_a':design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a'}))])await badgeAndRadius(c);
 if(!process.env.PARITY_WIDGET_ONLY)for(const [device,width,height]of [['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',390,844]])await mocha(device,width,height);
 for(const c of [{key:'cafe_design_a'},{key:'cafe_round_focus_a'},{key:'restaurant_onue_a'},{key:'cafe_design_a',design:'basic-first-column'},{key:'dining_aube_table_a',design:'dining-full-page'},{key:'dining_aube_table_b',design:'dining-sidebar'}])await widgetInk(c);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:rows.length,errors}));
}finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({rows,errors},null,2));}
