import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.ACTUAL_PREVIEW_QA_BASE||'http://localhost:3192';
const output=process.env.ACTUAL_PREVIEW_QA_OUTPUT||'/tmp/actual-preview-qa';
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),errors=[],writes=[],results=[];
async function context(options={}) {
 const ctx=await browser.newContext({reducedMotion:'reduce',...options});
 ctx.setDefaultTimeout(30000);
 ctx.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 await ctx.route('**/api/**',route=>route.request().method()==='GET'?route.continue():(writes.push(route.request().url()),route.abort()));
 return ctx;
}
async function ready(page,phone=false) {
 if(phone){await page.locator('.menu-typography').filter({visible:true}).first().waitFor();await page.waitForLoadState('networkidle');}
 else await page.locator('[data-preview-fullscreen-control]').waitFor();
 await page.evaluate(()=>document.fonts.ready);
}
try {
 // Catalog modes select mockups only. A new actual tab must use its real viewport.
 for(const [template,width,height,touch] of [['cafe_design_a',1440,900,false],['dining_aube_table_a',1440,900,false],['cafe_design_a',320,740,true]]) for(const device of ['tablet','pc','mobile']) {
  const ctx=await context({viewport:{width,height},hasTouch:touch,isMobile:touch}),page=await ctx.newPage();
  await page.goto(`${base}/templates/${template}/preview?device=${device}&orientation=portrait&lang=en`,{waitUntil:'domcontentloaded'});
  if(touch){await page.locator('[data-preview-mobile-entry]').waitFor();await page.getByRole('button',{name:'모바일로 계속 보기',exact:true}).click();await page.locator('[data-preview-mobile-entry]').waitFor({state:'hidden'});}
  const link=page.locator('[data-preview-detached-link]');await link.waitFor({state:'visible'});
  const bounds=await link.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1,'actual-screen entry stays inside narrow toolbar');
  const href=new URL(await link.getAttribute('href'),base);
  assert.equal(href.searchParams.get('device'),null);assert.equal(href.searchParams.get('orientation'),null);
  assert.equal(href.searchParams.get('lang'),'en');assert.equal(href.searchParams.get('detached'),'1');
  const opened=page.waitForEvent('popup');await link.click();const actual=await opened;await ready(actual,touch);
  assert.deepEqual(await actual.evaluate(()=>[innerWidth,innerHeight]),[width,height]);
  assert.equal(await actual.locator('[data-preview-frame-shell]').count(),0);
  if(touch)assert.equal(await actual.locator('[data-preview-fullscreen-control], [data-preview-actual-guide], [data-preview-mobile-entry]').count(),0,'mobile actual tab contains only the menu');
  if(!touch)await actual.locator('dialog[open]').waitFor();
  assert.equal(await actual.locator('dialog[open]').count(),touch?0:1);
  assert.equal(await actual.getByRole('heading',{name:'브라우저 확대·축소',exact:true}).count(),touch?0:1);
  if(template==='cafe_design_a')assert.equal(await actual.locator('[data-cafe-a-mobile-style=true]').filter({visible:true}).count(),touch?1:0);
  results.push(`${template}/${device}/${width}/actual-link`);console.log('PASS',results.at(-1));await ctx.close();
 }
 const environments=[
  {id:'desktop',viewport:{width:1440,height:900},touch:false,supported:true},
  {id:'narrow-desktop',viewport:{width:820,height:900},touch:false,supported:true},
  {id:'android',phone:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',touch:true,supported:true},
  {id:'android-landscape',phone:true,viewport:{width:844,height:390},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',touch:true,supported:true},
  {id:'android-tablet',viewport:{width:820,height:1180},hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Safari/537.36',touch:true,supported:true},
  {id:'ipad-desktop-agent',viewport:{width:1180,height:820},userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',ipad:true,touch:true,supported:true},
  {id:'iphone-safari',phone:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',api:'missing',touch:true,supported:false},
  {id:'iphone-chrome',phone:true,viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1',api:'blocked',touch:true,supported:false},
  {id:'desktop-policy-blocked',viewport:{width:1440,height:900},api:'blocked',touch:false,supported:false},
  {id:'fullscreen-request-denied',viewport:{width:1440,height:900},api:'reject',touch:false,supported:true},
 ];
 for(const scenario of environments) {
  const {id,touch,supported,api,ipad,phone,...options}=scenario;
  const ctx=await context(options);
  await ctx.addInitScript(({api,ipad})=>{
   if(ipad){Object.defineProperty(navigator,'platform',{get:()=> 'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});}
   if(api==='missing'||api==='blocked')Object.defineProperty(document,'fullscreenEnabled',{get:()=>false});
   if(api==='missing')Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined});
   if(api==='reject')Object.defineProperty(Element.prototype,'requestFullscreen',{value:()=>Promise.reject(new Error('Denied by test policy'))});
  },{api,ipad});
  const page=await ctx.newPage();
  await page.goto(`${base}/templates/cafe_design_a/preview?view=actual&embedded=1&detached=1`,{waitUntil:'domcontentloaded'});await ready(page,phone);
  if(phone){
   assert.equal(await page.locator('[data-preview-fullscreen-control], [data-preview-actual-guide], [data-preview-mobile-entry]').count(),0,`${id}: mobile has no guide/fullscreen UI`);
   assert.equal(await page.getByText('현재 브라우저에서는 전체화면을 지원하지 않습니다.',{exact:false}).count(),0);
   if(options.viewport.width<768)assert.equal(await page.locator('[data-cafe-a-mobile-style=true]').filter({visible:true}).count(),1);
   await page.screenshot({path:`${output}/${id}-actual.png`});
   results.push(id);console.log('PASS',id);await ctx.close();continue;
  }
  assert.equal(await page.locator('dialog[open]').count(),!touch&&supported?1:0,`${id}: automatic guide policy`);
  assert.equal(await page.locator('[data-preview-fullscreen-control]').getByRole('button',{name:'전체화면 보기',exact:true}).count(),supported?1:0,`${id}: actual fullscreen capability`);
  if(touch)assert.equal(await page.locator('#actual-preview-zoom-title').count(),0,`${id}: no PC zoom instructions`);
  if(!(!touch&&supported))await page.getByRole('button',{name:'화면 보기 안내',exact:true}).click();
  await page.locator('dialog[open]').waitFor();
  assert.equal(await page.locator('#actual-preview-zoom-title').count(),touch?0:1);
  const guide=await page.locator('dialog').innerText();
  if(!supported)assert.ok(guide.includes('현재 브라우저에서는 전체화면을 지원하지 않습니다.'));
  if(touch){assert.ok(!guide.includes('ESC'));assert.equal(await page.locator('[data-columns=one]').count(),1);}
  assert.equal(await page.getByRole('button',{name:/Chrome|크롬/}).count(),0);
  await page.screenshot({path:`${output}/${id}-guide.png`});
  await page.getByRole('button',{name:'안내 닫기',exact:true}).click();await page.locator('dialog[open]').waitFor({state:'hidden'});
  if(id==='desktop') {
   await page.getByRole('button',{name:'전체화면 보기',exact:true}).click();
   await page.waitForFunction(()=>Boolean(document.fullscreenElement));
   assert.equal(await page.locator('[data-preview-fullscreen-control]').count(),0);
   await page.evaluate(()=>document.exitFullscreen());await ready(page);
   assert.equal(await page.locator('dialog[open]').count(),0,'fullscreen exit keeps guide dismissed');
  }
  if(api==='reject') {
   await page.getByRole('button',{name:'전체화면 보기',exact:true}).click();
   await page.getByRole('status').waitFor();assert.ok((await page.getByRole('status').innerText()).includes('권한'));
  }
  results.push(id);console.log('PASS',id);await ctx.close();
 }
}finally{await browser.close();}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
await writeFile(`${output}/report.json`,JSON.stringify({base,checked:results.length,results,errors,writes},null,2));
console.log(JSON.stringify({checked:results.length,errors,writes}));
