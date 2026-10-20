import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/default-logo-preview';
const toolbarOnly=process.env.LOGO_QA_TOOLBAR_ONLY==='1',smoke=process.env.LOGO_QA_SMOKE==='1',designs=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','dining-full-page','dining-sidebar'];
const sizes=smoke?[['tablet',1180,820],['mobile',320,740]]:[['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',320,740],['mobile',390,844],['mobile',430,932]];
const keyFor=design=>design.startsWith('basic')?'cafe_design_a':design==='dining-sidebar'?'dining_aube_table_b':'dining_aube_table_a';
const urlFor=(design,device,extra={})=>`${base}/templates/${keyFor(design)}/preview?`+new URLSearchParams({design,device,view:'actual',callPreview:'on',orderPreview:'on',...extra});
await fs.mkdir(out,{recursive:true});const b=await chromium.launch(),results=[],errors=[],writes=[];
async function page(width,height){const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));return p;}
async function settle(p,design,device,logo){await p.evaluate(()=>document.fonts.ready);if(design.startsWith('basic')&&device!=='mobile')await p.locator('[data-paged-ready=true]').waitFor();if(logo)await p.locator('[data-default-design-logo]').filter({visible:true}).waitFor();else if(design.startsWith('basic')&&device==='mobile')await p.locator('[data-mobile-brand-fit=ready]').waitFor();}
const mobileItems=()=>{const es=[...document.querySelectorAll('[data-paged-mobile] [data-cafe-a-menu-item]')].filter(e=>e.getBoundingClientRect().height>0),top=es[0]?.getBoundingClientRect().top||0;return es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y-top,width:r.width,height:r.height};});};
async function logoGeometry(p){return p.locator('[data-default-design-logo]').filter({visible:true}).evaluate(el=>{const r=el.getBoundingClientRect(),parent=(el.closest('.cafe-a-store-logo-wrap')||el.parentElement).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,parent:{x:parent.x,y:parent.y,width:parent.width,height:parent.height},natural:[el.naturalWidth,el.naturalHeight],fit:getComputedStyle(el).objectFit};});}
function checkLogo(g,width,height,mobile){assert.ok(g.width>0&&g.height>0);assert.ok(Math.abs(g.width/g.height-g.natural[0]/g.natural[1])<.01,'intrinsic logo ratio remains unchanged');assert.equal(g.fit,'contain');assert.ok(g.width<=g.parent.width*.75+1);assert.ok(g.height<=Math.min(height*.2,mobile?128:192)+1);assert.ok(g.x>=0&&g.right<=width+1);if(mobile)assert.ok(Math.abs(g.x+g.width/2-width/2)<1,'mobile logo is centered in the menu');}
try{
 for(const design of toolbarOnly?[]:designs)for(const [device,width,height] of sizes){
  const p=await page(width,height),id=`${design}-${device}-${width}`;
  try{
   await p.goto(urlFor(design,device),{waitUntil:'networkidle'});await settle(p,design,device,false);
   assert.equal(await p.locator('[data-default-design-logo]').count(),0,'logo defaults off');
   const before=device==='mobile'&&design.startsWith('basic')?await p.evaluate(mobileItems):null;
   if(design.startsWith('dining')){assert.equal(await p.locator('.aube-table-cover-image').count(),0,'cover image defaults off');assert.equal(await p.locator('[data-aube-table-cover]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');}
   await p.goto(urlFor(design,device,{logoPreview:'on'}),{waitUntil:'networkidle'});await settle(p,design,device,true);
   assert.equal(await p.locator('.cafe-a-store-title, [data-aube-table-cover] h1').filter({visible:true}).count(),0,'logo replaces the visible store title');
   const g=await logoGeometry(p);checkLogo(g,width,height,device==='mobile');
   if(design==='basic-top-row'&&device!=='mobile'){const header=await p.locator('[data-basic-top-row]').boundingBox();assert.ok(g.y>=header.y-1&&g.bottom<=header.y+header.height+1,'logo remains inside the fixed header');}
   if(before){assert.deepEqual(await p.evaluate(mobileItems),before,'mobile menu geometry is unchanged relative to the first item');const gap=await p.locator('header').first().evaluate(header=>{const logo=header.querySelector('[data-default-design-logo]').getBoundingClientRect(),copy=header.querySelector('[data-cafe-a-store-description]').getBoundingClientRect(),row=header.querySelector('.cafe-a-mobile-language-row').getBoundingClientRect();return {copy:copy.top-logo.bottom,controls:logo.top-row.bottom};});assert.ok(Math.abs(gap.copy-12)<1);assert.ok(Math.abs(gap.controls-16)<1);}
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width);assert.equal(await p.locator('[role=alert]:not(#__next-route-announcer__)').count(),0);
   await p.screenshot({path:`${out}/${id}.png`});
   await p.goto(urlFor(design,device,{logoPreview:'off'}),{waitUntil:'networkidle'});await settle(p,design,device,false);assert.equal(await p.locator('[data-default-design-logo]').count(),0);assert.equal(await p.locator('.cafe-a-store-title, [data-aube-table-cover] h1').filter({visible:true}).count(),1,'turning logo off restores the title');
   results.push({id,g});console.log('PASS',id);
  }finally{await p.close();}
 }
 // Both toolbar groups retain options through device, locale and detached navigation.
 for(const design of ['basic-first-column','basic-top-row','dining-full-page']){
  const p=await page(1440,1000);try{
   await p.goto(urlFor(design,'tablet').replace('&view=actual',''),{waitUntil:'networkidle'});const guide=p.locator('[data-preview-guide-variant]');if(await guide.isVisible())await guide.getByRole('button',{name:'닫기',exact:true}).click();
   const logo=p.getByRole('checkbox',{name:'로고 보기',exact:true});assert.equal(await logo.isChecked(),false);await logo.check();await p.waitForURL(u=>u.searchParams.get('logoPreview')==='on');await p.frameLocator('iframe').locator('[data-default-design-logo]').filter({visible:true}).waitFor();await logo.uncheck();await p.waitForURL(u=>u.searchParams.get('logoPreview')==='off');await p.frameLocator('iframe').locator('.cafe-a-store-title, [data-aube-table-cover] h1').filter({visible:true}).waitFor();await logo.check();await p.waitForURL(u=>u.searchParams.get('logoPreview')==='on');
   if(design.startsWith('dining')){const cover=p.getByRole('checkbox',{name:'커버 이미지 보기',exact:true});assert.equal(await cover.isChecked(),false);await cover.check();await p.waitForURL(u=>u.searchParams.get('coverImagesPreview')==='on');}
   await p.getByRole('navigation',{name:'미리보기 기기 선택'}).getByRole('link',{name:'모바일',exact:true}).click();await p.waitForFunction(()=>new URL(document.querySelector('iframe').src).searchParams.get('device')==='mobile');await p.frameLocator('iframe').locator('[data-default-design-logo]').filter({visible:true}).waitFor();
   const detached=new URL(await p.locator('[data-preview-detached-link]').getAttribute('href'),base);assert.equal(detached.searchParams.get('logoPreview'),'on');if(design.startsWith('dining'))assert.equal(detached.searchParams.get('coverImagesPreview'),'on');
   await p.goto(detached.href,{waitUntil:'networkidle'});await p.locator('button[aria-haspopup=menu]').filter({visible:true}).first().click();await p.locator('[data-language-menu-item][href*="lang=en"]').filter({visible:true}).click();await p.waitForURL(u=>u.searchParams.get('lang')==='en');assert.equal(new URL(p.url()).searchParams.get('logoPreview'),'on');await p.locator('[data-default-design-logo]').filter({visible:true}).waitFor();
   results.push({id:`${design}-toolbar-device-locale`});console.log('PASS toolbar',design);
  }finally{await p.close();}
 }
 for(const design of toolbarOnly?[]:['dining-full-page','dining-sidebar'])for(const logoPreview of ['off','on']){
  const p=await page(390,844);try{
   await p.goto(urlFor(design,'mobile',{coverImagesPreview:'on',logoPreview}),{waitUntil:'networkidle'});await settle(p,design,'mobile',logoPreview==='on');
   assert.equal(await p.locator('.aube-table-cover-image').count(),1);const theme=await p.locator('[data-aube-table-cover]').evaluate(e=>({color:e.querySelector('.aube-table-cover-overlay').style.backgroundColor,opacity:e.querySelector('.aube-table-cover-overlay').style.opacity,description:getComputedStyle(e.querySelector('.aube-table-cover-description')).color,title:e.querySelector('h1')?getComputedStyle(e.querySelector('h1')).color:null}));assert.equal(theme.color,'rgb(0, 0, 0)');assert.equal(theme.opacity,'0.75');assert.equal(theme.description,'rgb(255, 255, 255)');if(logoPreview==='off')assert.equal(theme.title,'rgb(255, 255, 255)');if(design==='dining-full-page')assert.equal(await p.locator('.aube-table-pagination-dot[data-active=true]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
   await p.locator('.aube-table-mobile-page-tabs button, .aube-table-pagination-dots button').filter({visible:true}).last().click();await p.locator('.aube-table-item').first().waitFor();assert.equal(await p.locator('.aube-table-page-header h1').count(),1,'menu page titles remain visible');
   await p.screenshot({path:`${out}/${design}-cover-image-${logoPreview}.png`});results.push({id:`${design}-cover-image-${logoPreview}`});console.log('PASS cover image',design,logoPreview);
  }finally{await p.close();}
 }
 if(!smoke&&!toolbarOnly){
  for(const [design,device,width,height]of [['basic-first-column','mobile',320,740],['basic-top-row','tablet',1180,820],['basic-center-column','tablet',1180,820],['dining-full-page','tablet',1180,820],['dining-sidebar','mobile',320,740]])for(const [w,h]of [[900,180],[600,600],[300,900]]){
   const p=await page(width,height);try{await p.route('**/placeholders/starter/default-logo.svg',r=>r.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#ddd"/></svg>`}));await p.goto(urlFor(design,device,{logoPreview:'on'}),{waitUntil:'networkidle'});await settle(p,design,device,true);const g=await logoGeometry(p);checkLogo(g,width,height,device==='mobile');assert.equal(await p.locator('[role=alert]:not(#__next-route-announcer__)').count(),0);results.push({id:`${design}-${device}-shape-${w}-${h}`});console.log('PASS shape',design,w,h);}finally{await p.close();}
  }
  for(const [design,device,width,height]of [['basic-first-column','mobile',390,844],['basic-top-row','tablet',1180,820],['dining-full-page','mobile',390,844]]){const p=await page(width,height);try{await p.route('**/placeholders/starter/default-logo.svg',r=>r.abort());await p.goto(urlFor(design,device,{logoPreview:'on'}),{waitUntil:'networkidle'});await p.locator('.cafe-a-store-title, [data-aube-table-cover] h1').filter({visible:true}).waitFor();results.push({id:`${design}-failed-logo-fallback`});console.log('PASS fallback',design);}finally{await p.close();}}
  for(const key of ['cafe_design_a','dining_aube_table_a','dining_aube_table_b']){const p=await page(1440,900);try{await p.goto(`${base}/templates/${key}/preview?view=actual&device=pc&logoPreview=on&coverImagesPreview=on`,{waitUntil:'networkidle'});assert.equal(await p.locator('[data-default-design-logo], [data-default-cover-image]').count(),0,'existing templates do not opt into neutral preview styles');results.push({id:`${key}-original-scope`});}finally{await p.close();}}
 }
}finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors,writes},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
