import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3000',out='/private/tmp/visit-order-history-ui',route='app/qa-visit-order-history';
await fs.mkdir(out,{recursive:true});await fs.mkdir(route,{recursive:true});
await fs.writeFile(route+'/page.tsx',`import {notFound} from 'next/navigation';import Harness from './Harness';export default async function Page({searchParams}:{searchParams:Promise<{service?:string;locale?:string;device?:string}>}){if(process.env.NODE_ENV==='production')notFound();const params=await searchParams;return <Harness params={params}/>;}`);
await fs.writeFile(route+'/Harness.tsx',`"use client";
import {useState} from 'react';import Drawer from '@/components/public-menu/order-call/PostpayOrderCartDrawer';import Locale from '@/components/menu-templates/shared/MenuLocaleScope';
const catalog=[{id:'11111111-1111-4111-8111-111111111111',name:'현재 라떼',price:6000,optionGroups:[]}];
export default function Harness({params}:{params:{service?:string;locale?:string;device?:string}}){const [open,setOpen]=useState(false),[item,setItem]=useState<string|null>(null);const p=new URLSearchParams(Object.entries(params).flatMap(([key,value])=>value?[[key,value]]:[]));const service=p.get('service')||'basic',locale=p.get('locale')==='en'?'en':p.get('locale')==='ja'?'ja':p.get('locale')==='zh'?'zh':'ko';return <Locale locale={locale}><main className="p-5"><h1 className="type-page-title">메뉴판</h1><button onClick={()=>{setItem(null);setOpen(true);}}>주문 열기</button><button onClick={()=>{setItem(catalog[0].id);setOpen(true);}}>상품 담기</button><Drawer iconVariant={service==='dining'?'document':'cart'} open={open} onClose={()=>setOpen(false)} menuSiteId="22222222-2222-4222-8222-222222222222" cartScope={service+':live-test'} catalog={catalog} device={p.get('device')==='mobile'?'mobile':'pc'} previewOnly={false} tableLabel="창가 테이블" selectedMenuItemId={item} onCountChange={()=>{}} onItemAdded={()=>{}}/></main></Locale>;}`);
const browser=await chromium.launch(),results=[],errors=[],unexpected=[];
const id='33333333-3333-4333-8333-333333333333',id2='44444444-4444-4444-8444-444444444444';
function sample(){return [{id,orderNumber:2,tableLabel:'창가 테이블',createdAt:'2026-10-22T03:10:00Z',status:'received',paymentStatus:'unpaid',totalAmount:11000,lines:[{name:'주문 당시 라떼',quantity:2,unitPrice:5500,options:['온도: ICE']}]},{id:id2,orderNumber:1,tableLabel:'창가 테이블',createdAt:'2026-10-22T03:00:00Z',status:'served',paymentStatus:'manual_paid',totalAmount:185000,lines:[{name:'시그니처 코스',quantity:1,unitPrice:185000,options:[]}]}];}
async function setup(viewport,params=''){
 const page=await browser.newPage({viewport});await page.clock.install();page.on('pageerror',error=>errors.push(error.message));
 const state={orders:sample(),gets:0,patches:0,posts:[],mode:'ok'};
 await page.route('**/api/**',async r=>{
  if(!r.request().url().includes('/api/public-menu/orders')){unexpected.push(r.request().url());return r.abort();}
  const method=r.request().method();
  if(method==='GET'){state.gets++;if(state.mode==='expired')return r.fulfill({status:401,json:{ok:false}});if(state.mode==='read-error')return r.fulfill({status:503,json:{ok:false}});return r.fulfill({json:{ok:true,orders:state.orders,hasMore:false}});}
  if(method==='PATCH'){state.patches++;const body=r.request().postDataJSON();assert.deepEqual(Object.keys(body).sort(),['menuSiteId','orderId']);
   if(state.mode==='conflict'){state.orders[0].status='accepted';return r.fulfill({status:409,json:{ok:false}});}
   if(state.mode==='cancel-error')return r.fulfill({status:503,json:{ok:false}});
   state.orders=state.orders.map(o=>o.id===body.orderId?{...o,status:'cancelled'}:o);return r.fulfill({json:{ok:true,order:{id:body.orderId,status:'cancelled'}}});}
  if(method==='POST'){state.posts.push(r.request().postDataJSON());state.orders.unshift({...sample()[0],id:crypto.randomUUID(),orderNumber:3});return r.fulfill({status:201,json:{ok:true,order:{orderNumber:3}}});}
  unexpected.push(method);return r.abort();
 });
 await page.goto(base+'/qa-visit-order-history?'+params,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);return {page,state};
}
async function open(page,historyLabel='주문내역 보기'){await page.getByRole('button',{name:'주문 열기',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog.locator('header')).toHaveCount(0);await dialog.getByRole('button',{name:historyLabel,exact:true}).click();return dialog;}
try{
for(const service of ['basic','dining'])for(const [width,height]of [[320,740],[390,844],[820,1180],[1180,820],[1440,900]]){
 const {page,state}=await setup({width,height},new URLSearchParams({service,device:width<768?'mobile':'pc'}));
 assert.equal(state.gets,0);const dialog=await open(page);await expect(dialog.locator('[data-history-order]')).toHaveCount(2);
 await expect(dialog.getByRole('button',{name:'예시 주문 보기',exact:true})).toHaveCount(0);await expect(dialog.getByText('미리보기 주문내역입니다. 실제 매장에는 전송되지 않습니다.',{exact:true})).toHaveCount(0);
 await expect(dialog.locator('time')).toHaveCount(2);await expect(dialog.getByText('결제 완료',{exact:true})).toBeVisible();await expect(dialog.getByText('온도: ICE',{exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'주문 취소',exact:true})).toHaveCount(1);
 assert.deepEqual(await dialog.boundingBox(),{x:0,y:0,width,height});
 await dialog.getByRole('button',{name:'주문 취소',exact:true}).click();await dialog.getByRole('button',{name:'돌아가기',exact:true}).click();assert.equal(state.patches,0);
 await dialog.getByRole('button',{name:'주문 취소',exact:true}).click();await dialog.getByRole('button',{name:'취소할게요',exact:true}).click();await expect(dialog.getByRole('button',{name:'주문 취소',exact:true})).toHaveCount(0);assert.equal(state.patches,1);
 if(service==='dining'&&width===390)await page.screenshot({path:out+'/mobile.png'});
 await dialog.getByRole('tab',{name:'장바구니',exact:true}).click();const gets=state.gets;await page.clock.fastForward(6000);assert.equal(state.gets,gets);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);console.log('PASS',service,width);results.push({service,viewport:await page.evaluate(()=>[innerWidth,innerHeight]),case:'history-and-cancel'});await page.close();
}
// Poll updates, stopped polling after close, conflict refresh, errors and retry.
{
 const {page,state}=await setup({width:390,height:844},'device=mobile');const dialog=await open(page);await expect(dialog.locator('[data-history-order]')).toHaveCount(2);
 state.mode='conflict';await dialog.getByRole('button',{name:'주문 취소',exact:true}).click();await dialog.getByRole('button',{name:'취소할게요',exact:true}).click();await expect(dialog.getByText('이미 접수되었거나 결제된 주문은 취소할 수 없습니다. 직원에게 문의해 주세요.',{exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'주문 취소',exact:true})).toHaveCount(0);
 state.mode='read-error';await dialog.getByRole('button',{name:'새로고침',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText('주문내역을 불러오지 못했습니다.');await expect(dialog.locator('[data-history-order]')).toHaveCount(2);
 state.mode='ok';await dialog.getByRole('button',{name:'새로고침',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveCount(0);
 state.orders[0].status='cooking';await expect(dialog.locator('[data-history-order]').first().locator('strong').first()).toHaveText('조리 중',{timeout:10000});
 state.mode='expired';await dialog.getByRole('button',{name:'새로고침',exact:true}).click();await expect(dialog.getByRole('alert')).toHaveText('테이블 방문 세션이 만료되었습니다.');await expect(dialog.locator('[data-history-order]')).toHaveCount(0);
 results.push({case:'conflict-error-retry-auto-refresh-expiry'});await page.close();
}
{
 const {page,state}=await setup({width:1440,height:900},'service=dining');await page.getByRole('button',{name:'상품 담기',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:/장바구니 담기/}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'후불로 주문하기',exact:true}).click();await expect(dialog.getByRole('tab',{name:'주문내역',selected:true})).toBeVisible();await expect(dialog.locator('[data-history-order]')).toHaveCount(3);assert.equal(state.posts.length,1);assert.deepEqual(state.posts[0].lines,[{menuItemId:'11111111-1111-4111-8111-111111111111',quantity:1,optionValueIds:[]}]);results.push({case:'live-order-opens-history'});await page.close();
}
for(const [locale,link,refresh,paid,hint]of [
 ['en','View orders','Refresh','Paid','Orders from your current visit. Status updates automatically.'],
 ['ja','注文履歴を見る','更新','支払済み','今回のご来店の注文です。進行状況は自動更新されます。'],
 ['zh','查看订单','刷新','已支付','这是本次到店的订单，状态会自动更新。']]){
 const {page}=await setup({width:320,height:740},'locale='+locale+'&device=mobile');const dialog=await open(page,link);await expect(dialog.getByRole('button',{name:refresh,exact:true})).toBeVisible();await expect(dialog.getByText(paid,{exact:true})).toBeVisible();await expect(dialog.getByText(hint,{exact:true})).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);results.push({case:locale+'-narrow'});await page.close();
}

assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);await fs.writeFile(out+'/report.json',JSON.stringify({results,errors,unexpected},null,2));console.log(JSON.stringify({passed:results.length,results,productionWrites:0,realOrders:0}));
}finally{await browser.close();await fs.rm(route,{recursive:true,force:true});}
