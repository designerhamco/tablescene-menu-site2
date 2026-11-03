import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.ORDER_QA_BASE || 'http://localhost:3017';
const out=process.env.ORDER_QA_OUTPUT || '/private/tmp/site-feedback';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(), results=[], failures=[], errors=[], writes=[];
let accountLinkStyle;
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
async function run(name,fn){try{await fn();results.push(name);console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message);}}
async function overflow(p){assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page horizontal overflow');}
try{
 for(const [w,h] of [[320,780],[390,844],[820,1000],[1440,900]]) await run(`guide ${w}`,async()=>{
  const p=await create(w,h);try{
   await p.goto(`${base}/guides`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
   assert.equal(await p.getByRole('heading',{name:'이용가이드',exact:true}).count(),1);
   assert.equal(await p.locator('aside.site-notice').count(),0,'large Chrome banner removed');
   const info=p.getByRole('button',{name:'권장 브라우저 안내',exact:true}).filter({visible:true});
   await info.click();const bubble=p.getByRole('dialog',{name:'권장 브라우저 안내',exact:true});await bubble.waitFor();assert.ok((await bubble.innerText()).includes('Chrome(크롬)'));
   const r=await bubble.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=w+1,'bubble fits phone');
   await p.keyboard.press('Escape');await bubble.waitFor({state:'hidden'});await info.focus();await p.keyboard.press('Enter');await bubble.waitFor();await p.keyboard.press('Escape');
   if(w===1440){await info.hover();await bubble.waitFor();await p.mouse.move(1,h-1);await bubble.waitFor({state:'hidden'});}
   await overflow(p);if(w===390)await p.screenshot({path:`${out}/guide-mobile.png`});
  }finally{await p.close();}
 });
 for(const role of [null,'사장','직원'])for(const [w,h] of [[320,780],[390,844],[820,1000],[1180,820]])await run(`menu ${role||'guest'} ${w}`,async()=>{
  const p=await create(w,h,role);try{
   await p.goto(`${base}/guides`,{waitUntil:'networkidle'});
   if(role)await p.locator('[data-site-header-account]').waitFor({state:'attached'});
   const trigger=p.getByRole('button',{name:'메뉴 열기',exact:true});await trigger.click();const menu=p.getByRole('dialog',{name:'아티메뉴 전체 메뉴',exact:true});await menu.waitFor();
   const main=menu.getByRole('navigation',{name:'모바일 공식 사이트 메뉴',exact:true});const support=main.getByRole('button',{name:'고객센터',exact:true});assert.equal(await support.getAttribute('aria-expanded'),'false');
   assert.equal(await main.getByRole('link',{name:'공지사항',exact:true}).count(),0);
   await support.click();assert.equal(await support.getAttribute('aria-expanded'),'true');await main.getByRole('link',{name:'공지사항',exact:true}).waitFor();
   assert.equal(await main.getByRole('link',{name:'이용가이드',exact:true}).getAttribute('href'),'/guides');
   const sizes=await main.locator(':scope > a, :scope > div > button').evaluateAll(es=>es.map(e=>({font:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight,height:e.getBoundingClientRect().height})));
   assert.equal(sizes.length,5);assert.equal(new Set(sizes.map(s=>s.font)).size,1);assert.ok(sizes.every(s=>s.height>=44));
   assert.equal(await menu.getByRole('link',{name:'만들기',exact:true}).getAttribute('href'),'/apply');
   const bounds=await menu.boundingBox();assert.ok(Math.abs(bounds.x)<1&&Math.abs(bounds.width-w)<1,'menu fills viewport from its right edge');
   assert.equal(await menu.evaluate(e=>getComputedStyle(e).animationName),'none','reduced motion disables slide');
   if(role){await menu.getByText('검증 매장',{exact:true}).waitFor();assert.equal(await menu.getByText(role,{exact:true}).count(),1);await menu.getByText('qa@example.com',{exact:true}).waitFor();
    assert.ok(await menu.getByRole('link',{name:'마이 메뉴',exact:true}).isVisible());
    const operations=menu.getByRole('link',{name:'매장 운영 (새 창으로 열기)',exact:true});assert.ok(await operations.isVisible());assert.equal(await operations.getAttribute('target'),'_blank');assert.equal(await operations.getAttribute('rel'),'noopener noreferrer');
    assert.ok(await menu.getByRole('region',{name:'계정 정보'}).getByRole('button',{name:'로그아웃',exact:true}).isVisible());assert.equal(await menu.getByRole('link',{name:'알림',exact:true}).getAttribute('href'),'/notifications');
   }else{for(const label of ['로그인','회원가입'])assert.ok(await menu.getByRole('link',{name:label,exact:true}).isVisible());assert.equal(await menu.getByRole('button',{name:'로그아웃',exact:true}).count(),0);assert.equal(await menu.getByRole('link',{name:/^알림/}).count(),0,'guests do not see notifications');}
   const linkStyle=await menu.getByRole('link',{name:role?'마이 메뉴':'로그인',exact:true}).evaluate(e=>{const s=getComputedStyle(e);return {font:s.fontSize,weight:s.fontWeight,border:s.borderWidth,background:s.backgroundColor,height:e.getBoundingClientRect().height};});
   assert.equal(linkStyle.border,'0px');assert.equal(linkStyle.background,'rgba(0, 0, 0, 0)');if(accountLinkStyle)assert.deepEqual(linkStyle,accountLinkStyle,'account links share the guest text style');else accountLinkStyle=linkStyle;
   assert.equal(await menu.locator('[class*=drawerFooter]').getByRole('button',{name:'로그아웃',exact:true}).count(),0);
   const inside=await menu.evaluate(e=>[...e.querySelectorAll('a,button')].filter(el=>el.getBoundingClientRect().width>0).every(el=>{const r=el.getBoundingClientRect(),b=e.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1;}));assert.ok(inside,'controls fit drawer width');
   for(let i=0;i<14;i++){await p.keyboard.press('Tab');assert.ok(await menu.evaluate(e=>e.contains(document.activeElement)),'focus remains in modal');}
   await p.mouse.click(w-2,2);await main.evaluate(e=>e.closest('[role=dialog]').querySelector('[class*=drawerBody]').scrollTo({top:0,behavior:'instant'}));
   if(w===390)await p.screenshot({path:`${out}/menu-${role==='사장'?'owner':role==='직원'?'staff':'guest'}.png`});
   await p.keyboard.press('Escape');await menu.waitFor({state:'hidden'});assert.ok(await trigger.evaluate(e=>e===document.activeElement),'Escape restores trigger focus');await overflow(p);
  }finally{await p.close();}
 });
 await run('menu slides from and back to the right',async()=>{
  const p=await create(390,844);try{await p.emulateMedia({reducedMotion:'no-preference'});await p.goto(`${base}/guides`,{waitUntil:'networkidle'});const trigger=p.getByRole('button',{name:'메뉴 열기',exact:true});await trigger.click();const menu=p.getByRole('dialog',{name:'아티메뉴 전체 메뉴',exact:true});
   const sample=async()=>menu.evaluate(e=>{const a=e.getAnimations().find(a=>a.animationName?.includes('drawerSlide'));if(!a)throw new Error('slide animation missing');const duration=a.effect.getTiming().duration;a.pause();const positions=[0,duration/2,duration-1].map(time=>{a.currentTime=time;return e.getBoundingClientRect().x;});a.currentTime=0;a.play();return {duration,positions};});
   const opening=await sample();assert.equal(opening.duration,300);assert.ok(Math.abs(opening.positions[0]-390)<1&&opening.positions[1]>0&&opening.positions[1]<390&&opening.positions[2]<1);
   await menu.getByRole('button',{name:'메뉴 닫기',exact:true}).click();const closing=await sample();assert.equal(closing.duration,240);assert.ok(closing.positions[0]<1&&closing.positions[1]>0&&closing.positions[1]<390&&closing.positions[2]>385);await menu.waitFor({state:'hidden'});assert.ok(await trigger.evaluate(e=>e===document.activeElement));await overflow(p);
  }finally{await p.close();}
 });
 for(const [w,h] of [[320,780],[820,1000],[1440,900]])await run(`notice loading ${w}`,async()=>{
  const p=await create(w,h);let release;const gate=new Promise(resolve=>release=resolve);
  await p.route('**/api/support/announcements?**',async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'qa-notice',title:'검증 공지사항',category:'notice',published_at:'2026-11-02T00:00:00Z',pinned:false}],count:1,unavailable:false})});});
  try{await p.goto(`${base}/faq/notices`,{waitUntil:'domcontentloaded'});const loading=p.getByRole('status').filter({hasText:'공지사항을 불러오는 중입니다.'});await loading.waitFor();assert.equal(await loading.locator('.site-loading-spinner').count(),1);assert.equal(await p.getByRole('region',{name:'공지사항 게시판'}).getAttribute('aria-busy'),'true');await overflow(p);if(w===1440)await p.screenshot({path:`${out}/notice-loading.png`});release();await p.getByRole('link',{name:'검증 공지사항',exact:true}).waitFor();assert.equal(await p.locator('.site-loading-spinner').count(),0);await overflow(p);}finally{release();await p.close();}
 });
 for(const key of ['cafe_design_a','dining_aube_table_a','display_menu_a'])for(const [w,h] of [[390,844],[820,1000],[1440,900]])await run(`detail ${key} ${w}`,async()=>{
  const p=await create(w,h);try{await p.goto(`${base}/templates/${key}`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);const summary=p.getByRole('list',{name:'상품 설명',exact:true});assert.deepEqual(await summary.locator('li').allTextContents(),['8가지 파워풀한 기능들','마음대로 커스터마이징','할인,광고,위젯과 주문 및 호출까지']);assert.equal(await summary.locator('svg.lucide-check[aria-hidden=true]').count(),3);assert.equal(await summary.locator('a').count(),0);assert.equal(await p.locator('[data-feature-summary]').count(),0);assert.equal(await p.getByText('디자인별 지원 여부는 아래 기능 안내에서 확인하세요.',{exact:true}).count(),0);assert.equal(await p.locator('[data-feature-section]').count(),8);await overflow(p);if(key==='cafe_design_a'&&w===1440){await p.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await delay(100);await p.screenshot({path:`${out}/template-summary.png`});}}finally{await p.close();}
 });
 await run('design system feedback and safe account examples',async()=>{
  const p=await create(1440,1000);try{await p.goto(`${base}/design-system`,{waitUntil:'networkidle'});await p.locator('#loading-feedback').scrollIntoViewIfNeeded();const bar=p.getByRole('progressbar',{name:'파일 업로드 진행률 예시'});assert.equal(await bar.getAttribute('aria-valuenow'),'65');assert.equal(await p.locator('.site-loading-spinner').first().evaluate(e=>getComputedStyle(e).animationName),'none');const example=p.locator('#mobile-navigation');await example.getByRole('tab',{name:'사장',exact:true}).click();await example.getByRole('button',{name:'전체 메뉴 예시 열기'}).click();const dialog=p.getByRole('dialog',{name:'전체 메뉴 디자인 예시'});await dialog.getByRole('button',{name:'로그아웃',exact:true}).click();assert.ok(await dialog.getByRole('link',{name:'로그인',exact:true}).isVisible());await p.keyboard.press('Escape');await overflow(p);}finally{await p.close();}
 });
 await run('anonymous account summary remains private',async()=>{const p=await create(390,844);try{const response=await p.request.get(`${base}/api/account/navigation`);assert.equal(response.status(),401);assert.match(response.headers()['cache-control'],/private.*no-store/);assert.deepEqual(await response.json(),{account:null});}finally{await p.close();}});
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
