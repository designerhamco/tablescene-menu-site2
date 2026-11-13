import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.NOTIFICATION_QA_BASE || 'http://localhost:3003';
const out=process.env.NOTIFICATION_QA_OUT || '/tmp/mobile-notification-qa';
await fs.mkdir(out,{recursive:true});
const env=await fs.readFile('.env.local','utf8').catch(()=> '');
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL || env.match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)?.[1];
assert.ok(supabaseUrl,'public endpoint for intercepted session fixture');
const browser=await chromium.launch(), results=[], errors=[];
async function create(width,height,{guest=false,empty=false,readError=false,motion='reduce'}={}) {
 const p=await browser.newPage({viewport:{width,height},reducedMotion:motion});p.setDefaultTimeout(15000);
 const writes=[];let readAt=null;
 p.on('pageerror',e=>errors.push(e.message));
 const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'qa@example.com',app_metadata:{},user_metadata:{display_name:'알림 검증'},created_at:'2026-01-01T00:00:00Z'};
 if(!guest) {
  const exp=Math.floor(Date.now()/1000)+3600;
  const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,exp,aud:'authenticated',role:'authenticated'})).toString('base64url'),'fixture-not-a-valid-signature'].join('.');
  const session={access_token:token,refresh_token:'fixture-no-refresh',expires_at:exp,expires_in:3600,token_type:'bearer',user};
  const key=`sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  await p.addInitScript(({key,value})=>{document.cookie=`${key}=${value}; path=/; SameSite=Lax`;},{key,value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')});
 }
 await p.route(`${supabaseUrl}/**`,async route=>{
  const req=route.request();assert.ok(['GET','HEAD'].includes(req.method()),'no real auth/database writes');
  if(req.url().includes('/auth/v1/')) return route.fulfill({status:guest?401:200,contentType:'application/json',body:JSON.stringify(guest?{message:'Guest'}:user)});
  if(req.url().includes('/rest/v1/notification_events')) {
   const rows=empty?[]:Array.from({length:10},(_,i)=>({id:`notice-${i}`,title:`테스트 알림 ${i+1}`,message:'현재 페이지 위에서 알림 내용을 확인합니다. 긴 내용과 여러 줄의 알림도 목록 안에서 스크롤할 수 있습니다.',created_at:new Date(Date.now()-i*60000).toISOString(),read_at:readAt||(i%2?new Date().toISOString():null),metadata:{href:'/faq?tab=faq&notification=1'}}));
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-range':`0-${Math.max(0,rows.length-1)}/${empty||readAt?0:5}`},body:JSON.stringify(rows)});
  }
  return route.fulfill({status:200,contentType:'application/json',body:'[]'});
 });
 await p.route('**/api/**',route=>{
  const req=route.request();
  if(req.method()==='GET') {
   if(req.url().includes('/account/navigation')) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({account:{name:'알림 검증',email:user.email,role:'사장'}})});
   return route.continue();
  }
  writes.push(new URL(req.url()).pathname);
  if(req.url().includes('/api/notifications/')) {
   if(!readError) readAt=new Date().toISOString();
   return route.fulfill({status:readError?500:200,contentType:'application/json',body:JSON.stringify({ok:!readError,readAt,userId:user.id})});
  }
  throw Error(`Unexpected write: ${req.url()}`);
 });
 return {p,writes};
}
try {
 for(const [width,height] of [[320,780],[390,844],[430,932],[667,375],[767,900],[768,900],[820,1000],[1180,820],[1440,900]]) {
  const {p,writes}=await create(width,height);try {
   await p.goto(`${base}/faq?tab=faq`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
   const search=p.getByRole('searchbox',{name:'고객센터 검색',exact:true});await search.fill('QR');await p.evaluate(()=>scrollTo({top:320,behavior:'instant'}));
   const original={url:p.url(),y:await p.evaluate(()=>scrollY),history:await p.evaluate(()=>history.length)};
   const mobile=width<768;
   const bell=p.locator(mobile?'[data-site-notification-mobile-trigger]':'[data-site-notification-trigger]');
   await expect(bell).toBeVisible();await bell.click();
   const layer=p.locator(mobile?'[data-site-notification-sheet]':'[data-site-notification-popover]');await expect(layer).toBeVisible();
   assert.equal(p.url(),original.url);assert.equal(await p.evaluate(()=>history.length),original.history);assert.equal(writes.length,0,'opening does not mark read');
   await expect(layer.getByRole('tablist',{name:'알림 분류'})).toBeVisible();
   await expect(layer.getByRole('link',{name:'전체 알림 보기',exact:true})).toBeVisible();
   const bounds=await layer.boundingBox();await p.screenshot({path:`${out}/bounds-${width}.png`});assert.ok(bounds.x>=-.5&&bounds.x+bounds.width<=width+.5&&bounds.y>=0&&bounds.y+bounds.height<=height+.5,JSON.stringify({width,height,bounds,css:await layer.evaluate(e=>({transform:getComputedStyle(e).transform,translate:getComputedStyle(e).translate,height:getComputedStyle(e).height,top:getComputedStyle(e).top}))}));
   const feed=layer.locator('.site-notification-feed[data-state="active"]');
   if(mobile) {
    await expect(layer.getByRole('heading',{name:'알림',exact:true})).toBeFocused();
    assert.ok(Math.abs(bounds.width-width)<1);assert.ok(Math.abs(bounds.y+bounds.height-height)<1);
    const m=await feed.evaluate(e=>({scroll:e.scrollHeight,height:e.clientHeight}));assert.ok(m.scroll>m.height,'long list scrolls inside the sheet');
    await feed.hover();await p.mouse.wheel(0,350);await expect.poll(()=>feed.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
    await p.mouse.move(width/2,5);await p.mouse.wheel(0,300);assert.equal(await p.evaluate(()=>scrollY),original.y,'background stays locked');
    await layer.getByRole('button',{name:'닫기',exact:true}).focus();
    for(let i=0;i<15;i++){await p.keyboard.press('Tab');assert.ok(await layer.evaluate(e=>e.contains(document.activeElement)),'focus stays in sheet');}
   }
   await layer.getByRole('tab',{name:/읽지 않음/}).click();await expect(layer.locator('.site-notification-feed[data-state="active"] a.site-notification-item')).toHaveCount(5);
   await p.screenshot({path:`${out}/notifications-${width}.png`});
   await p.keyboard.press('Escape');await expect(layer).toBeHidden();await expect(bell).toBeFocused();
   await expect(search).toHaveValue('QR');assert.equal(p.url(),original.url);assert.equal(await p.evaluate(()=>scrollY),original.y);
   if(width<1280) {
    await p.getByRole('button',{name:'메뉴 열기',exact:true}).click();const menu=p.getByRole('dialog',{name:'아티메뉴 전체 메뉴',exact:true});await expect(menu).toBeVisible();
    await menu.getByRole('button',{name:/^알림/}).click();await expect(menu).toBeHidden();await expect(layer).toBeVisible();
    assert.equal(p.url(),original.url);await p.keyboard.press('Tab');if(mobile)assert.ok(await layer.evaluate(e=>e.contains(document.activeElement)),'menu handoff keeps focus in sheet');
    if(mobile) await layer.getByRole('button',{name:'닫기',exact:true}).click();else await p.keyboard.press('Escape');
    await expect(layer).toBeHidden();await expect(bell).toBeFocused();await expect(search).toHaveValue('QR');assert.equal(await p.evaluate(()=>scrollY),original.y);
   }
   await bell.click();await expect(layer).toBeVisible();
   await layer.getByRole('button',{name:'모두 읽음',exact:true}).click();await expect(layer.locator('.site-notification-read-all-dock')).toHaveCount(0);
   assert.deepEqual(writes,['/api/notifications/read-all']);await expect(layer.locator('.site-notification-item[data-unread]')).toHaveCount(0);
   if(mobile){await p.mouse.click(width/2,2);await expect(layer).toBeHidden();await expect(bell).toBeFocused();assert.equal(await p.evaluate(()=>scrollY),original.y);}
   else await p.keyboard.press('Escape');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   results.push({width,height,presentation:mobile?'sheet':'popover',writes:'intercepted read-all only',restoredInputAndScroll:true});
  }finally{await p.close();}
 }
 for(const options of [{guest:true},{empty:true},{readError:true},{motion:'no-preference'}]) {
  const {p,writes}=await create(390,844,options);try {
   await p.goto(`${base}/faq?tab=faq`,{waitUntil:'networkidle'});const bell=p.locator('[data-site-notification-mobile-trigger]');
   if(options.guest){await expect(bell).toHaveCount(0);await p.getByRole('button',{name:'메뉴 열기',exact:true}).click();await expect(p.locator('[data-site-menu-notification-trigger]')).toHaveCount(0);}
   else {
    await bell.click();const sheet=p.locator('[data-site-notification-sheet]');await expect(sheet).toBeVisible();
    if(options.empty){await expect(sheet.getByRole('heading',{name:'새 알림이 없습니다',exact:true})).toBeVisible();await expect(sheet.locator('.site-notification-read-all-dock')).toHaveCount(0);}
    else if(options.readError){await sheet.getByRole('button',{name:'모두 읽음',exact:true}).click();await expect(sheet.getByRole('alert')).toBeVisible();await expect(sheet.getByRole('button',{name:'모두 읽음',exact:true})).toBeEnabled();await expect(sheet.locator('.site-notification-item[data-unread]')).toHaveCount(5);}
    else {assert.match(await sheet.evaluate(e=>getComputedStyle(e).animationName),/siteNotificationSheetIn/);await sheet.getByRole('link',{name:/테스트 알림 1\s/}).click();await p.waitForURL('**/faq?tab=faq&notification=1');assert.deepEqual(writes,['/api/notifications/notice-0/read']);}
   }
   results.push(options);
  }finally{await p.close();}
 }
 assert.deepEqual(errors,[]);await fs.writeFile(`${out}/results.json`,JSON.stringify({base,results,errors},null,2));console.log(`PASS ${results.length} cases: overlay navigation, scroll/input/focus restoration, menu handoff, feed scrolling, responsive popovers, read states, guests and motion; all writes intercepted.`);
} finally {await browser.close();}
