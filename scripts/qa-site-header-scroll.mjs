import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE || 'http://localhost:3042';
const out=process.env.ORDER_QA_OUTPUT || '/private/tmp/site-header-scroll';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(), results=[], failures=[], errors=[], writes=[];
const env=await fs.readFile('.env.local','utf8').catch(()=> '');
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL || env.match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)?.[1];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function create(width,height,role){
 const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});p.setDefaultTimeout(15000);
 p.on('pageerror',e=>errors.push({url:p.url(),error:e.message}));
 await p.route('**/api/**',route=>route.request().method()==='GET'?route.continue():(writes.push(route.request().url()),route.abort()));
 if(role){
  assert.ok(supabaseUrl,'public Supabase URL is available for isolated session fixtures');
  const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'qa@example.com',app_metadata:{},user_metadata:{display_name:'검증 매장'},created_at:'2026-01-01T00:00:00Z'};
  const expires=Math.floor(Date.now()/1000)+3600;
  const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp:expires,aud:'authenticated',role:'authenticated'})).toString('base64url'),'fixture-not-a-valid-signature'].join('.');
  const session={access_token:token,refresh_token:'fixture-no-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user};
  const key=`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  await p.addInitScript(({key,value})=>{document.cookie=`${key}=${value}; path=/; SameSite=Lax`;},{key,value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')});
  await p.route(`${supabaseUrl}/auth/v1/**`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}));
  await p.route(`${supabaseUrl}/rest/v1/notification_events**`,route=>route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/0'},body:'[]'}));
  await p.route('**/api/account/navigation',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({account:{name:'검증 매장',email:user.email,role}})}));
 }
 return p;
}
async function run(name, fn) {
 try { await fn(); results.push(name); console.log('PASS', name); }
 catch (error) { failures.push({name, error: error.message}); console.log('FAIL', name, error.message); }
}
async function snapshot(header) {
 return header.evaluate(e => {
  const bounds = el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const panel=e.firstElementChild, s=getComputedStyle(e), p=getComputedStyle(panel);
  return {shell:bounds(e),panel:bounds(panel),radius:p.borderRadius,blur:p.backdropFilter,shadow:p.boxShadow,
   controls:[...e.querySelectorAll('a,button')].filter(el=>el.getBoundingClientRect().width>0&&getComputedStyle(el).visibility!=='hidden').map(el=>({name:el.getAttribute('aria-label')||el.textContent.trim(),...bounds(el)})),background:s.backgroundColor,panelBackground:p.backgroundColor};
 });
}
async function scroll(page, y) {
 await page.evaluate(top=>window.scrollTo({top,behavior:'instant'}), y);
 await page.waitForFunction(scrolled=>document.querySelector('[data-site-header]')?.getAttribute('data-scrolled')===String(scrolled),y>24);
}
try {
 for(const [width,height] of [[320,780],[390,844],[820,1000],[1180,820],[1440,900],[2560,1200]]) {
  for(const route of ['/','/services/dining','/services/display','/faq','/templates']) await run(`guest ${route} ${width}`,async()=>{
   const page=await create(width,height);try {
    const response=await page.goto(base+route,{waitUntil:'networkidle'});assert.ok(response.ok());await page.evaluate(()=>document.fonts.ready);
    const header=page.locator('[data-site-header]');await header.locator('[data-site-header-account]').waitFor({state:'attached'});await scroll(page,0);
    const initial=await snapshot(header);assert.equal(initial.background,'rgba(0, 0, 0, 0)');assert.equal(initial.panelBackground,'rgba(0, 0, 0, 0)');
    assert.equal(initial.shell.x,0);assert.equal(initial.shell.width,width);assert.equal(initial.shell.y,0);
    await scroll(page,20);assert.equal((await snapshot(header)).background,initial.background);
    await scroll(page,400);const after=await snapshot(header);
    assert.equal(after.background,'rgb(255, 255, 255)');assert.equal(after.radius,'0px');assert.equal(after.blur,'none');assert.equal(after.shadow,'none');
    assert.deepEqual(after,{...initial,background:'rgb(255, 255, 255)'});assert.ok(await header.getByRole('link',{name:'ArtiMenu',exact:true}).isVisible());
    if(width<1280){const trigger=header.getByRole('button',{name:'메뉴 열기',exact:true});await trigger.click();const menu=page.getByRole('dialog',{name:'아티메뉴 전체 메뉴',exact:true});await menu.waitFor();await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert.ok(await trigger.evaluate(e=>e===document.activeElement));assert.deepEqual((await snapshot(header)).controls,initial.controls);}
    else {assert.ok(await header.getByRole('link',{name:'만들기',exact:true}).isVisible());assert.ok(await header.getByRole('button',{name:'고객센터 메뉴',exact:true}).isVisible());}
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(route==='/'&&[390,820,1440].includes(width))await page.screenshot({path:`${out}/scrolled-${width}.png`});
    await scroll(page,0);assert.deepEqual(await snapshot(header),initial);
   }finally{await page.close();}
  });
  await run(`owner controls ${width}`,async()=>{
   const page=await create(width,height,'사장');try{
    await page.goto(base+'/services/dining',{waitUntil:'networkidle'});const header=page.locator('[data-site-header]');await header.locator('[data-site-header-account]').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);await scroll(page,0);const initial=await snapshot(header);await scroll(page,400);assert.deepEqual(await snapshot(header),{...initial,background:'rgb(255, 255, 255)'});
    if(width>=768){const bell=header.locator('[data-site-notification-trigger]');await bell.click();const panel=page.locator('[data-site-notification-popover]');await panel.waitFor();await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.ok(await bell.evaluate(e=>e===document.activeElement));}
    else assert.equal(await header.locator('[data-site-notification-link]').getAttribute('href'),'/notifications');
    if(width<1280){await header.getByRole('button',{name:'메뉴 열기',exact:true}).click();const menu=page.getByRole('dialog',{name:'아티메뉴 전체 메뉴',exact:true});await menu.getByText('검증 매장',{exact:true}).waitFor();assert.ok(await menu.getByRole('link',{name:/매장 운영/}).isVisible());await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});}
    else assert.ok(await header.locator('[data-site-header-operations]').isVisible());
   }finally{await page.close();}
  });
 }
 await run('background transition and route navigation',async()=>{
  const page=await create(1440,900);try{
   await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(base+'/faq',{waitUntil:'networkidle'});const header=page.locator('[data-site-header]');assert.equal(await header.evaluate(e=>getComputedStyle(e).transitionProperty),'background-color');assert.equal(await header.evaluate(e=>getComputedStyle(e).transitionDuration),'0.24s');await scroll(page,400);await header.getByRole('link',{name:'디자인 템플릿',exact:true}).click();await page.waitForURL('**/templates');await scroll(page,0);assert.equal(await header.getAttribute('data-scrolled'),'false');await delay(300);assert.equal((await snapshot(header)).background,'rgba(0, 0, 0, 0)');
  }finally{await page.close();}
 });
} finally {await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
