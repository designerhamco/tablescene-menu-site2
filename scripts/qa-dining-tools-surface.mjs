import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {menuColorContrast} from '../lib/menu-interaction-theme.ts';
const base=process.env.ORDER_QA_BASE||'http://localhost:3027';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/dining-tools-surface';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[],writes=[];
const devices=[['pc',1440,900],['tablet',1180,820],['mobile',390,844]],cases=[];
for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const [device,width,height]of devices)for(const surface of ['photo','dark','light'])cases.push({key,device,width,height,surface,actions:'both'});
for(const [device,width,height]of [devices[0],devices[2]])for(const surface of ['dark','light'])for(const actions of ['call','order'])cases.push({key:'dining_aube_table_a',device,width,height,surface,actions});
for(const design of ['dining-full-page','dining-sidebar','dining-full-page-album','dining-sidebar-album'])for(const [device,width,height]of [devices[1],devices[2]])cases.push({key:design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a',design,device,width,height,surface:'dark',actions:'both'});
for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const width of [320,430])cases.push({key,device:'mobile',width,height:844,surface:'dark',actions:'both'});
for(const key of ['dining_aube_table_a','dining_aube_table_b'])for(const [device,width,height]of [devices[0],devices[2]])for(const surface of ['photo','dark','light'])cases.push({key,device,width,height,surface,actions:'none'});
const measure=()=>{
 const visible=e=>e.getBoundingClientRect().width>0&&getComputedStyle(e).display!=='none';
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,bg:s.backgroundColor,ink:s.color,radius:s.borderRadius,position:s.position};};
 const root=document.querySelector('.aube-table-root'),cover=root?.querySelector('[data-aube-table-cover]'),shell=document.querySelector('[data-menu-interaction-shell]');
 const header=document.querySelector('[data-table-menu-header]'),toolbar=document.querySelector('[data-dining-menu-toolbar]'),dock=document.querySelector('[data-table-mobile-dock]'),nav=document.querySelector('.aube-table-pagination'),notes=document.querySelector('[data-dining-cover-notices]');
 const control=header||toolbar||document.querySelector('[data-aube-table-language-control]');
 return {viewport:[innerWidth,innerHeight],cover:box(cover),root:box(root),header:box(header),toolbar:box(toolbar),tools:box(control),dock:box(dock),nav:box(nav),dots:[...document.querySelectorAll('.aube-table-pagination-dot')].map(e=>({...box(e),appearance:getComputedStyle(e).appearance})),notes:box(notes),circle:box(document.querySelector('[data-dining-floating-call]')),
 toolInks:control?[...control.querySelectorAll('[data-language-menu-trigger],[data-terminal-table-label],[data-table-menu-actions] button,[data-dining-cart]')].filter(visible).map(e=>getComputedStyle(e).color):[],buttons:dock?[...dock.querySelectorAll('button')].map(box):[],
 palette:Object.fromEntries(['--menu-order-bg','--menu-order-ink','--menu-call-bg','--menu-call-ink','--menu-call-circle-bg','--menu-call-circle-ink'].map(k=>[k,shell?getComputedStyle(shell).getPropertyValue(k).trim():'']))};
};
const transparent=color=>color==='rgba(0, 0, 0, 0)'||color==='transparent';
const selected=cases.filter(c=>(!process.env.DINING_TOOLS_QA_CASE||`${c.key}:${c.device}:${c.surface}:${c.actions}`===process.env.DINING_TOOLS_QA_CASE)&&(!process.env.DINING_TOOLS_QA_ACTIONS||c.actions===process.env.DINING_TOOLS_QA_ACTIONS)&&(!process.env.DINING_TOOLS_QA_SMOKE||!c.design&&((c.key==='dining_aube_table_a'&&['pc','mobile'].includes(c.device)&&c.surface==='dark'&&c.actions==='both')||(c.key==='dining_aube_table_b'&&c.device==='mobile'&&c.surface==='light'&&c.actions==='both')||(c.key==='dining_aube_table_a'&&c.device==='mobile'&&c.surface==='photo'&&c.actions==='none'))));
for(const c of selected){
 const page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(writes.push(route.request().url()),route.abort()));
 try{
  const query=new URLSearchParams({device:c.device,view:'actual',coverPreview:'on',coverImagesPreview:c.surface==='photo'?'on':'off',callPreview:['call','both'].includes(c.actions)?'on':'off',orderPreview:['order','both'].includes(c.actions)?'on':'off',...(c.design?{design:c.design}:{}),designPreview:JSON.stringify({textColorGroupsVersion:2,...(process.env.DINING_TOOLS_QA_NATIVE?{}:{textColors:{category:'#70528e'}}),...(c.surface==='photo'?{}:{coverBackground:c.surface==='dark'?'#0d172a':'#f7f2ea'})})});
  const path=`/templates/${c.key}/preview`;
  await page.goto(`${base}${path}?${query}`,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('[data-aube-table-cover]')&&getComputedStyle(document.querySelector('[data-aube-table-cover]')).display==='grid'&&document.querySelector('.aube-table-root')?.style.getPropertyValue('--menu-font-ko')&&(!document.querySelector('[data-menu-interaction-shell]')||getComputedStyle(document.querySelector('[data-menu-interaction-shell]')).getPropertyValue('--menu-dining-tools-ink').trim()));await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);
  const m=await page.evaluate(measure),tools=m.tools;assert.deepEqual(m.viewport,[c.width,c.height]);assert.ok(m.cover);assert.ok(tools&&transparent(tools.bg),'cover tools have no white paper');assert.ok(m.toolInks.length&&m.toolInks.every(ink=>ink===tools.ink),'language/order/table share current surface ink');
  if(m.nav){assert.ok(m.nav.width>0&&m.nav.height>0,'pagination is visible');assert.ok(m.dots.length&&m.dots.every(d=>d.width>0&&d.height>0&&d.appearance==='none'),'custom dots do not inherit native button rendering');}
  if(c.surface==='dark'&&c.key==='dining_aube_table_a'&&c.actions==='both'&&['pc','mobile'].includes(c.device))await page.screenshot({path:`${output}/${c.device}-${c.width}-dark-cover.png`});
  if(c.surface==='photo')assert.equal(tools.ink,'rgb(255, 255, 255)');else assert.ok(menuColorContrast(tools.ink,m.cover.bg)>=4.5,'solid cover controls remain readable');
  if(c.device==='mobile'&&c.actions!=='none'){
   assert.ok(m.dock&&transparent(m.dock.bg),'mobile cover dock has no white bar');assert.equal(m.header.position,'fixed');assert.equal(m.cover.top,0);assert.ok(Math.abs(m.cover.bottom-c.height)<2,'cover fills behind both bars');assert.equal(m.buttons.length,c.actions==='both'?2:1);
   for(const b of m.buttons){assert.equal(b.radius,'8px');assert.ok(b.width>b.height*2,'existing horizontal buttons');}if(m.buttons.length===2)assert.ok(Math.abs(m.buttons[0].top-m.buttons[1].top)<1,'Order/Call remain side by side');
   assert.ok(m.notes.bottom<=(m.nav?.top??m.dock.top)-4,'notices clear navigation and actions');if(m.nav)assert.ok(m.nav.bottom<=m.dock.top-4);
  }else if(c.actions!=='order'&&c.actions!=='none'){assert.equal(m.circle.radius,'50%');assert.equal(m.circle.width,m.circle.height);}
  const trigger=page.locator('[data-language-menu-trigger]').filter({visible:true}).first();if(await trigger.isEnabled()){await trigger.click();const menu=page.locator('[data-language-menu-surface]').filter({visible:true});await menu.waitFor();const inks=await menu.locator('[data-language-menu-item]').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.ok(inks.every(ink=>menuColorContrast(ink,'#fff')>=4.5),'white language list keeps dark readable ink');await page.keyboard.press('Escape');}
  const nav=page.locator('.aube-table-pagination-dots button,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({visible:true});await nav.nth(1).click();await page.locator('.aube-table-page').waitFor();await page.waitForFunction(()=>!document.querySelector('.aube-table-root[data-cover-active="true"]'));await page.waitForTimeout(200);const body=await page.evaluate(measure);assert.deepEqual(body.palette,m.palette,'action colors do not change between cover and menu');if(c.actions!=='none')assert.equal(body.tools.bg,body.root.bg,'menu tools match the actual menu paper');
  if(body.dock)assert.ok(transparent(body.dock.bg),'mobile menu dock stays transparent');assert.ok(menuColorContrast(body.tools.ink,body.root.bg)>=4.5,'menu tools remain readable');
  results.push(c);console.log('PASS',JSON.stringify(c));
 }catch(e){failures.push({...c,error:e.message});console.log('FAIL',JSON.stringify(failures.at(-1)));await page.screenshot({path:`${output}/fail-${failures.length}.png`});}finally{await page.close();}
}
await browser.close();await fs.writeFile(`${output}/results.json`,JSON.stringify({results,failures,errors,writes},null,2));console.log(JSON.stringify({passed:results.length,failed:failures.length,errors,writes}));if(failures.length||errors.length||writes.length)process.exitCode=1;
