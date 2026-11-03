import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
const base=process.env.ORDER_QA_BASE || 'http://localhost:3042';
const out=process.env.ORDER_QA_OUTPUT || '/private/tmp/notification-read-all';
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

async function run(name, fn) {try{await fn();results.push(name);console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message);}}
const userId='00000000-0000-4000-8000-000000000001';
const rows=[{id:'notice-1',title:'결제가 완료되었습니다.',message:'결제 내역에서 확인하세요.',created_at:'2026-11-02T08:22:00Z',read_at:null,status:'sent',channel:'in_app',sent_at:null,metadata:{}},{id:'notice-2',title:'새 소식입니다.',message:'서비스 안내를 확인하세요.',created_at:'2026-10-22T05:03:00Z',read_at:null,status:'sent',channel:'email',sent_at:null,metadata:{}}];
const readAt='2026-11-03T12:00:00.000Z';
try {
 // The real site header uses isolated browser auth/query fixtures. No customer write reaches a server.
 for(const width of [820,1440,2560])await run(`header bulk action and badge ${width}`,async()=>{
  const p=await create(width,1000,'사장');let count=12,calls=0;
  await p.route(`${supabaseUrl}/rest/v1/notification_events**`,route=>route.fulfill({status:200,contentType:'application/json',headers:{'content-range':`0-1/${count}`,'access-control-expose-headers':'content-range','access-control-allow-origin':'*'},body:JSON.stringify(rows.map(r=>({...r,read_at:count?null:readAt})))}));
  await p.route('**/api/notifications/read-all',async route=>{calls++;count=0;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,readAt,userId})});});
  try{await p.goto(base+'/faq',{waitUntil:'networkidle'});const bell=p.locator('[data-site-notification-trigger]');await bell.waitFor();await expect(bell).toContainText('9+');await bell.click();const panel=p.locator('[data-site-notification-popover]');await panel.waitFor();const read=panel.getByRole('button',{name:'모두 읽기',exact:true});await expect(read).toBeEnabled();await expect(panel.getByRole('tab',{name:/읽지 않음/})).toContainText('12');await panel.getByRole('tab',{name:/읽지 않음/}).click();
   const geometry=await read.evaluate(e=>{const s=getComputedStyle(e);return{height:e.getBoundingClientRect().height,weight:s.fontWeight,radius:s.borderRadius}});assert.ok(geometry.height>=32&&geometry.height<=36,'compact minimum with the shared bounded wide-screen type scale');assert.equal(geometry.weight,'600');assert.equal(geometry.radius,'8px');
   await p.screenshot({path:`${out}/header-before-${width}.png`});await read.click();await expect(panel.getByText('읽지 않은 알림이 없습니다',{exact:true})).toBeVisible();await expect(read).toBeDisabled();await expect(bell).not.toContainText('9+');assert.equal(calls,1);assert.ok(await panel.isVisible());await panel.getByRole('tab',{name:'전체 알림',exact:true}).click();assert.equal(await panel.locator('[data-unread]').count(),0);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.keyboard.press('Escape');await expect(bell).toBeFocused();
  }finally{await p.close();}
 });
 // Render the actual history component with a navigation-only stub. This is the same client component used by both inbox routes.
 const probe=await create(1440,1000);await probe.goto(base+'/design-system',{waitUntil:'networkidle'});const sheets=await probe.locator('link[rel=stylesheet]').evaluateAll(es=>es.map(e=>e.href));await probe.close();
 const wd=process.cwd(),entry=`${out}/history-entry.tsx`,nav=`${out}/navigation.ts`;
 await fs.writeFile(nav,`const router={refresh(){window.qaRefreshes=(window.qaRefreshes||0)+1;}};export function useRouter(){return router;}`);
 await fs.writeFile(entry,`import React from 'react';import{createRoot}from'react-dom/client';import History from '${wd}/components/mypage/NotificationHistorySection';const root=createRoot(document.getElementById('root'));let version=0;window.mountHistory=(events,count)=>root.render(<History key={++version} events={events} userId='${userId}' unreadCount={count} showIntro={false}/>);`);
 const built=await build({entryPoints:[entry],bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',alias:{'next/navigation':nav},nodePaths:[`${wd}/node_modules`],tsconfig:`${wd}/tsconfig.json`,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
 async function history(width){const p=await create(width,1000);await p.route('**/__qa_notification_history',route=>route.fulfill({status:200,contentType:'text/html',body:`<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1">${sheets.map(h=>`<link rel="stylesheet" href="${h}">`).join('')}</head><body class="site-management-scope"><main class="site-gutter"><div id="root" style="max-width:42rem;margin-inline:auto"></div></main></body></html>`}));await p.goto(base+'/__qa_notification_history',{waitUntil:'networkidle'});await p.addScriptTag({content:built.outputFiles[0].text});return p;}
 for(const width of [320,390,820,1440,2560])await run(`shared inbox/history layout ${width}`,async()=>{const p=await history(width);try{await p.evaluate(({rows})=>window.mountHistory(rows,12),{rows});const read=p.getByRole('button',{name:'모두 읽기',exact:true});await read.waitFor();await p.evaluate(()=>document.fonts.ready);const b=await read.boundingBox(),tab=await p.getByRole('tablist',{name:'알림 분류'}).boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width);assert.ok(b.y>=tab.y);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`${out}/history-${width}.png`});}finally{await p.close();}});
 await run('pending, failure, retry, unread filter, offscreen unread and account isolation',async()=>{
  const p=await history(390);let calls=0,fail=true,release;await p.route('**/api/notifications/read-all',async route=>{calls++;if(calls===1)await new Promise(resolve=>{release=resolve;});await route.fulfill({status:fail?500:200,contentType:'application/json',body:JSON.stringify(fail?{ok:false}:{ok:true,readAt,userId})});});
  try{await p.evaluate(({rows})=>window.mountHistory(rows,12),{rows});const read=p.getByRole('button',{name:'모두 읽기',exact:true});await read.waitFor();await p.getByRole('tab',{name:/읽지 않음/}).click();await read.click();await expect(p.getByRole('button',{name:'처리 중…',exact:true})).toBeDisabled();assert.equal(calls,1);release();await expect(p.getByRole('alert')).toBeVisible();await expect(read).toBeEnabled();assert.equal(await p.locator('.site-notification-item[data-unread]').count(),2);
   fail=false;await read.click();await expect(read).toBeDisabled();await expect(p.getByText('읽지 않은 알림이 없습니다',{exact:true})).toBeVisible();await expect(p.getByRole('alert')).toHaveCount(0);assert.equal(calls,2);assert.ok(await p.evaluate(()=>window.qaRefreshes)>0);
   await p.evaluate(({rows,readAt})=>window.mountHistory(rows.map(r=>({...r,read_at:readAt})),12),{rows,readAt});await expect(read).toBeEnabled();await p.evaluate(()=>window.dispatchEvent(new CustomEvent('artimenu:notifications-read-all',{detail:{readAt:'2026-11-03T12:00:00Z',userId:'another-account'}})));await expect(read).toBeEnabled();await read.click();await expect(read).toBeDisabled();assert.equal(calls,3);
   await p.evaluate(({rows,readAt})=>window.mountHistory(rows.map(r=>({...r,read_at:readAt})),0),{rows,readAt});await expect(read).toBeDisabled();
  }finally{await p.close();}
 });
 await run('component library example uses local read state without API calls',async()=>{const p=await create(390,1000);try{await p.goto(base+'/design-system',{waitUntil:'networkidle'});const section=p.getByRole('heading',{name:'알림 패널',exact:true}).locator('../..');await section.scrollIntoViewIfNeeded();const read=section.getByRole('button',{name:'모두 읽기',exact:true});await expect(read).toBeEnabled();await read.click();await expect(read).toBeDisabled();assert.equal(await section.locator('[data-unread]').count(),0);}finally{await p.close();}});
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
