import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {catalogDesigns} from '../lib/catalog-designs.ts';
import {getFixedHeaderIdentityAlignment} from '../lib/menu-design-surfaces.ts';
import {getTemplatePreviewRouteKey} from '../lib/templates.ts';

// Read-only catalog checks: node --import tsx scripts/qa-mobile-representative-surfaces.mjs
const base=process.env.SURFACE_QA_BASE||'http://localhost:3000';
const output=process.env.SURFACE_QA_OUTPUT||'/private/tmp/mobile-representative-surfaces';
await fs.mkdir(output,{recursive:true});
const registered=catalogDesigns.filter(d=>d.service==='basic'&&getFixedHeaderIdentityAlignment(d.templateKey,{menu_design_id:d.id}));
const designs=registered.filter(d=>!process.env.SURFACE_QA_FILTER||process.env.SURFACE_QA_FILTER.split(',').includes(d.id));
const paper='#FAF7F2',auxiliary='#2938A2';
const inks={brand:'#FFFFFF',representative:'#FFFFFF',information:'#775500'};
const browser=await chromium.launch(),results=[],failures=[],errors=[],writes=[];
function href(design,device,extra={}){
 const url=new URL(`/templates/${getTemplatePreviewRouteKey(design.templateKey)}/preview`,base);
 if(design.kind==='standard')url.searchParams.set('design',design.id);
 for(const[k,v]of Object.entries({device,coverPreview:'off',logoPreview:'off',...extra}))url.searchParams.set(k,v);
 return url.toString();
}
async function newPage(viewport){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 return page;
}
async function read(target,mobile){
 await target.locator('[data-menu-appearance]').waitFor();
 await target.locator('body').evaluate(()=>document.fonts.ready);
 await target.locator('body').evaluate(async()=>{
  for(let i=0;i<100;i++){
   const logos=[...document.querySelectorAll('[data-menu-logo-slot]')].filter(e=>e.getBoundingClientRect().width>0&&!e.closest('[aria-hidden=true]'));
   if(logos.every(e=>e.dataset.menuLogoReady==='true'&&e.dataset.menuLogoMeasured==='true'))return;
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error('Visible logo did not settle');
 });
 if(!mobile)await target.locator('[data-native-ready=true],[data-paged-ready=true]').waitFor();
 await target.locator('body').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return target.locator('body').evaluate((_body,mobile)=>{
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!e.closest('[aria-hidden=true],[data-preview-native-sample]');};
  const menu=[...document.querySelectorAll('.cafe-a-typography')].find(visible);
  const pick=s=>[...menu.querySelectorAll(s)].find(visible);
  const surface=pick(mobile?'[data-menu-mobile-representative]':'[data-native-header],[data-basic-top-row]');
  const header=mobile?surface.querySelector('header'):surface;
  const topNotices=pick('.cafe-a-topline-mobile-notices');
  const description=pick('[data-cafe-a-store-description],.cafe-a-topline-description,.cafe-a-store-description');
  const bg=e=>{for(;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;if(!['transparent','rgba(0, 0, 0, 0)'].includes(c))return c;}return '';};
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
  const rows=[...menu.querySelectorAll('.cafe-a-mobile-notice-list p,.cafe-a-topline-notice-text,[data-paged-notices] p,[data-native-notices] p')].filter(visible);
  const r=surface.getBoundingClientRect(),h=header.getBoundingClientRect();
  const ys=[h.top+2,h.bottom-2,...(topNotices?[topNotices.getBoundingClientRect().top+1,topNotices.getBoundingClientRect().bottom-1]:[])];
  const paintedEdges=ys.filter(y=>y>=0&&y<innerHeight).flatMap(y=>[r.left+1,r.right-1].map(x=>({x,y,color:bg(document.elementFromPoint(x,y))})));
  return {viewport:[innerWidth,innerHeight],surface:rect(surface),surfaceBackground:getComputedStyle(surface).backgroundColor,headerBackground:bg(header),paintedEdges,
   copyBackground:mobile?getComputedStyle(header.querySelector('.cafe-a-mobile-header-copy')).backgroundColor:null,
   notices:rows.map(e=>({inside:surface.contains(e),ink:getComputedStyle(e).color,background:bg(e),rect:rect(e)})),
   geometry:{header:rect(header),description:description?rect(description):null,descriptionFont:description?getComputedStyle(description).fontSize:null},
   topNotices:topNotices?surface.contains(topNotices):null,overflow:document.documentElement.scrollWidth>innerWidth+1,
   bottomInset:getComputedStyle(surface).paddingBottom};
 },mobile);
}
function checkFilled(state,mobile,left){
 assert.equal(state.overflow,false);
 assert.equal(state.surfaceBackground,'rgb(41, 56, 162)');
 assert.equal(state.headerBackground,'rgb(41, 56, 162)');
 if(mobile){
  assert.ok(Math.abs(state.surface.x)<1&&Math.abs(state.surface.width-state.viewport[0])<1,'whole mobile width owns the fill');
  assert.equal(state.copyBackground,'rgba(0, 0, 0, 0)','copy cannot paint a nested rectangle');
  for(const edge of state.paintedEdges)assert.equal(edge.color,'rgb(41, 56, 162)',JSON.stringify(edge));
  assert.equal(state.geometry.descriptionFont,'14px');
  assert.equal(state.topNotices,left?null:true,'centered notices stay in the surface; left-logo notices remain below menus');
 }
 for(const notice of state.notices){
  assert.equal(notice.inside,!left,'notice anchor follows the registered structure');
  assert.equal(notice.ink,notice.inside?'rgb(255, 255, 255)':'rgb(119, 85, 0)','notice ink follows its actual surface');
 }
}
async function run(name,fn){try{await fn();console.log('PASS',name);}catch(e){failures.push({name,error:e.stack});console.log('FAIL',name,e.message);}}
async function render(design,[device,width,height],extra={}){
 const page=await newPage({width,height}),mobile=device==='mobile';
 try{
  let baseline;
  for(const [choice,overrides]of [['native',{}],['equal',{pageBackground:paper,auxiliaryBackground:paper}],['colored',{pageBackground:paper,auxiliaryBackground:auxiliary,textColors:inks,textColorGroupsVersion:2}]]){
   await page.goto(href(design,device,{view:'actual',embedded:'1',...extra,designPreview:JSON.stringify(overrides)}),{waitUntil:'networkidle'});
   const state=await read(page,mobile);
   assert.deepEqual(state.viewport,[width,height]);assert.equal(state.overflow,false);
   if(choice==='colored')checkFilled(state,mobile,getFixedHeaderIdentityAlignment(design.templateKey,{menu_design_id:design.id})==='left');
   if(choice==='native')baseline=state.geometry;
   if(choice==='equal')assert.deepEqual(state.geometry,baseline,'equal/no-fill surfaces keep existing geometry');
   results.push({case:'render',design:design.id,choice,device,width,extra,...state});
  }
  if(mobile&&width===430)await page.screenshot({path:`${output}/${design.id}-mobile.png`});
 }catch(e){e.message+=`\nURL: ${page.url()}`;throw e;}finally{await page.close();}
}
async function roundtrip(design){
 const page=await newPage({width:1440,height:1000});
 try{
  await page.goto(href(design,'pc',{previewOptions:'design'}),{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'보조 배경색 선택',exact:true}).click();
  const picker=page.locator('[data-preview-color-picker]');
  const input=picker.getByRole('textbox',{name:'보조 배경색 색상값',exact:true});
  await input.fill(auxiliary);await picker.getByRole('button',{name:'적용',exact:true}).click();
  await page.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').auxiliaryBackground===auxiliary);
  if(await picker.isVisible())await picker.getByRole('button',{name:'컬러피커 닫기',exact:true}).click();
  for(const device of ['모바일','태블릿','PC','모바일']){
   const key={'모바일':'mobile','태블릿':'tablet','PC':'pc'}[device];
   await page.getByRole('navigation',{name:'미리보기 기기 선택'}).getByRole('link',{name:device,exact:true}).click();
   await page.waitForURL(u=>u.searchParams.get('device')===key);
   const state=await read(page.frameLocator('iframe'),key==='mobile');
   assert.equal(state.surfaceBackground,'rgb(41, 56, 162)');
   assert.equal(JSON.parse(new URL(page.url()).searchParams.get('designPreview')).auxiliaryBackground,auxiliary);
   if(key==='mobile')for(const edge of state.paintedEdges)assert.equal(edge.color,'rgb(41, 56, 162)');
   results.push({case:'roundtrip',design:design.id,device,...state});
  }
 }finally{await page.close();}
}
try{
 assert.ok(registered.length>=6,'discover every native/default top-row design');
 const sizes=[['pc',1440,900],['tablet',1180,820],['mobile',320,844],['mobile',430,900]];
 const jobs=designs.flatMap(d=>sizes.map(size=>()=>run(`${d.id}/${size[0]}/${size[1]}`,()=>render(d,size))));
 jobs.push(...designs.map(d=>()=>run(`${d.id}/logo-call-cover`,()=>render(d,['mobile',390,844],{logoPreview:'on',callPreview:'on',coverPreview:'on'}))));
 if(process.env.SURFACE_QA_ROUNDTRIP_ONLY!=='1')for(let i=0;i<jobs.length;i+=2)await Promise.all(jobs.slice(i,i+2).map(job=>job()));
 if(process.env.SURFACE_QA_STATIC_ONLY!=='1')for(const d of designs)await run(`${d.id}/roundtrip`,()=>roundtrip(d));
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{
 await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));
}
console.log(JSON.stringify({checked:results.length,failures,errors,writes}));
