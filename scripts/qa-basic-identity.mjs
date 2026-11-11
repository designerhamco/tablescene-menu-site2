import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {catalogDesigns} from '../lib/catalog-designs.ts';
const base=process.env.IDENTITY_QA_BASE||'http://localhost:3187';
const designs=catalogDesigns.filter(d=>d.service==='basic'&&(!process.env.IDENTITY_QA_FILTER||process.env.IDENTITY_QA_FILTER.split(',').includes(d.id)));
const sizes=process.env.IDENTITY_QA_SMOKE==='1'?[['tablet',820,1180],['mobile',390,844]]:[['pc',1440,900],['tablet',1180,820],['tablet',820,1180],['mobile',390,844]];
const browser=await chromium.launch(),errors=[],results=[];

async function check(page,id,mobile){
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-menu-logo-slot]')].filter(e=>e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden').some(e=>e.dataset.menuLogoReady==='true'&&e.dataset.menuLogoMeasured==='true'));
 await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
 const logos=await page.locator('[data-menu-logo-slot]').filter({visible:true}).evaluateAll(elements=>elements.map(root=>{
  const rect=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
  const box=root.querySelector('[data-menu-logo-box]'),image=root.querySelector('img'),panel=root.closest('.cafe-a-panel-intro,[data-upper-left-intro][data-photo=true]');
  return{root:rect(root),box:rect(box),parent:rect(root.parentElement),ratio:Number(root.dataset.menuLogoRatio),top:root.dataset.menuLogoLayout==='top-row',rem:parseFloat(getComputedStyle(document.documentElement).fontSize),src:image.getAttribute('src'),natural:[image.naturalWidth,image.naturalHeight],image:rect(image),photo:panel?rect(panel):null,description:root.parentElement.querySelector('.cafe-a-store-description')?rect(root.parentElement.querySelector('.cafe-a-store-description')):null};
 }));
 assert.ok(logos.length>0,id);
 for(const logo of logos){
  const maxWidth=logo.root.width*(mobile?.7:.75),maxHeight=mobile?Math.min(logo.root.width*.4,10*logo.rem):logo.top?logo.parent.height*.8:logo.root.width*.6;
  assert.ok(logo.box.width>0&&logo.box.height>0,`${id}: visible logo`);
  assert.ok(logo.box.width<=maxWidth+1&&logo.box.height<=maxHeight+1,`${id}: actual-slot two-axis limits`);
  assert.ok(Math.abs(logo.box.height/logo.box.width-logo.ratio)<.01,`${id}: protected artwork aspect`);
  assert.ok(Math.abs(logo.image.width/logo.image.height-logo.natural[0]/logo.natural[1])<.01,`${id}: original file not stretched ${JSON.stringify(logo)}`);
  assert.ok(logo.box.x>=logo.root.x-1&&logo.box.right<=logo.root.right+1,`${id}: contained horizontal identity`);
  if(logo.photo){assert.ok(logo.box.y>=logo.photo.y-1&&logo.box.bottom<=logo.photo.bottom+1,`${id}: logo stays inside registered photo`);if(logo.description)assert.ok(logo.box.bottom<=logo.description.y+1,`${id}: logo and description remain separate`);}
  if(logo.top)assert.ok(logo.box.y>=logo.parent.y-1&&logo.box.bottom<=logo.parent.bottom+1,`${id}: contained top-row identity`);
 }
 results.push({id,logos:logos.length});console.log('PASS',id);
}
try{
 for(const design of process.env.IDENTITY_QA_FIXTURES_ONLY==='1'||process.env.IDENTITY_QA_FALLBACK_ONLY==='1'?[]:designs)for(const[device,width,height]of sizes){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'}),id=`${design.id}/${device}/${width}`;
  page.on('pageerror',error=>errors.push({id,error:error.message}));
  const url=new URL(design.previewHref,base);for(const[k,v]of Object.entries({device,view:'actual',embedded:'1',logoPreview:'on'}))url.searchParams.set(k,v);
  try{assert.equal((await page.goto(url.toString(),{waitUntil:'domcontentloaded'})).status(),200);await check(page,id,device==='mobile');}catch(error){console.error('FAIL',id);throw error;}finally{await page.close();}
 }
 // Controlled image responses exercise actual tall/square/wide and transparent marks.
 if(!process.env.IDENTITY_QA_FILTER&&process.env.IDENTITY_QA_FALLBACK_ONLY!=='1')for(const designId of (process.env.IDENTITY_QA_FIXTURE_DESIGNS||'basic-top-row,basic-top-row-left-logo,basic-upper-left,restaurant_onue_a').split(','))for(const[device,width,height]of [['tablet',820,1180],['mobile',390,844]]){
  const design=catalogDesigns.find(d=>d.id===designId),page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push({id:`${designId}/${device}/fixture`,error:error.message}));
  const url=new URL(design.previewHref,base);for(const[k,v]of Object.entries({device,view:'actual',embedded:'1',logoPreview:'on',coverPreview:'on'}))url.searchParams.set(k,v);
  await page.goto(url.toString());await check(page,`${designId}/${device}/original`,device==='mobile');
  const src=await page.locator('[data-menu-logo-slot] img').filter({visible:true}).first().getAttribute('src'),imageUrl=new URL(src,base).toString();
  for(const[shape,w,h,padded]of [['wide',900,200,false],['square',400,400,false],['tall',180,600,false],['transparent',800,800,true]]){
   const body=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect x="${padded?200:0}" y="${padded?300:0}" width="${padded?400:w}" height="${padded?200:h}" fill="#191c1b"/></svg>`;
   await page.route(imageUrl,route=>route.fulfill({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body}));
   await page.goto(url.toString(),{waitUntil:'domcontentloaded'});
   await check(page,`${designId}/${device}/${shape}`,device==='mobile');
   const actual=await page.locator('[data-menu-logo-slot] img').filter({visible:true}).first().evaluate(image=>[image.naturalWidth,image.naturalHeight]);
   assert.deepEqual(actual,[w,h],'controlled artwork really loaded');
   if(padded){const ratio=await page.locator('[data-menu-logo-slot]').filter({visible:true}).first().getAttribute('data-menu-logo-ratio');assert.ok(Number(ratio)<.65,'excess transparent canvas is measured independently of the square file');}
   await page.unroute(imageUrl);
  }
  await page.close();
 }
 if(!process.env.IDENTITY_QA_FILTER){
  const page=await browser.newPage({viewport:{width:820,height:1180},reducedMotion:'reduce'});
  page.on('pageerror',error=>errors.push({id:'analysis-unavailable',error:error.message}));
  // Deny only detached Image analysis. React's visible <img> remains intact.
  await page.addInitScript(()=>{const Original=window.Image;window.Image=class extends Original{constructor(){super();Object.defineProperty(this,'src',{get(){return '';},set(){queueMicrotask(()=>this.dispatchEvent(new Event('error')));}});}};});
  await page.route('**/placeholders/starter/default-logo.svg',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect x="200" y="300" width="400" height="200" fill="black"/></svg>'}));
  await page.goto(`${base}/templates/cafe_real_matcha_a/preview?design=basic-top-row-left-logo&device=tablet&view=actual&embedded=1&logoPreview=on`);
  await check(page,'analysis-unavailable',false);
  const logo=page.locator('[data-menu-logo-slot]').filter({visible:true}).first();
  assert.equal(await logo.locator('img').getAttribute('src'),'/placeholders/starter/default-logo.svg','original display URL stays intact');
  assert.equal(await logo.getAttribute('data-menu-logo-ratio'),'1','unreadable alpha uses full original canvas');
  await page.close();
 }
}finally{await browser.close();}
assert.deepEqual(errors,[]);console.log(JSON.stringify({checked:results.length,errors}));
