import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3000',route='app/qa-order-sessions',out='/private/tmp/order-session-ui';
await fs.mkdir(out,{recursive:true});await fs.mkdir(route,{recursive:true});
await fs.writeFile(route+'/page.tsx',`import {notFound} from 'next/navigation';import Harness from './Harness';export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){if(process.env.NODE_ENV==='production')notFound();return <Harness params={await searchParams}/>;}`);
await fs.writeFile(route+'/Harness.tsx',`"use client";
import {useState} from 'react';import Locale from '@/components/menu-templates/shared/MenuLocaleScope';import TableMenuInteractions,{TableMenuActionButtons} from '@/components/public-menu/order-call/TableMenuInteractions';import MenuOrderAddButton from '@/components/public-menu/order-call/MenuOrderAddButton';import Settings from '@/app/mypage/menus/[menuId]/order-settings/OrderSettingsForm';import {readMenuOrderSettings} from '@/lib/menu-order-settings';
const catalog=[{id:'11111111-1111-4111-8111-111111111111',name:'라떼',price:6000,optionGroups:[]}];
export default function Harness({params}:{params:Record<string,string>}){const channel=params.channel==='terminal'?'terminal':'customer',locale=params.locale==='en'?'en':params.locale==='ja'?'ja':params.locale==='zh'?'zh':'ko';const [expiry]=useState(()=>new Date(Date.now()+3600000).toISOString());return <Locale locale={locale}><main className="p-5"><h1 className="type-page-title">메뉴판</h1>{params.settings?<Settings menuId="22222222-2222-4222-8222-222222222222" settings={readMenuOrderSettings({})} section="orders" activeTablesReady={true} runtime={{orders:false,calls:false}}/>:<TableMenuInteractions config={{mode:'active',orderEnabled:params.orders!=='off',callEnabled:true,hasValidTableSession:true,orderingOpen:true,languageSlotEnabled:true,menuSiteId:'22222222-2222-4222-8222-222222222222',cartScope:channel+':qa-session',tableLabel:'창가 테이블',orderCatalog:catalog,previewOnly:params.preview==='on',checkoutModes:params.checkout==='prepay'?['prepay']:['postpay','prepay'],channel,orderExpiresAt:channel==='customer'?expiry:null,customerPhone:'required'}} presentation={params.service==='dining'?'aube':'cafe'} locale={locale} locales={['ko','en','ja','zh']}><div className="space-y-6"><p>라떼 6,000원</p><TableMenuActionButtons appearance="inline"/><MenuOrderAddButton itemId={catalog[0].id} itemName="라떼"/></div></TableMenuInteractions>}</main></Locale>;}`);
const browser=await chromium.launch(),results=[],errors=[],unexpected=[];
async function setup({channel='customer',width=390,height=844,params=''}={}){
  const page=await browser.newPage({viewport:{width,height}});await page.clock.install();page.on('pageerror',e=>errors.push(e.message));
  const state={expiry:Date.now()+3600000,posts:[],orders:[],receipts:new Map(),renewals:0,repeat:false,loseNextResponse:false,sessionReads:0};
  await page.route('**/api/**',async r=>{
    const url=new URL(r.request().url()),method=r.request().method();
    if(url.pathname==='/api/public-menu/order-session'){
      state.sessionReads++;const now=await page.evaluate(()=>Date.now());
      if(method==='POST'){state.renewals++;state.expiry=now+3600000;}
      return r.fulfill({json:{ok:true,channel,orderExpiresAt:new Date(state.expiry).toISOString(),serverNow:new Date(now).toISOString()}});
    }
    if(url.pathname==='/api/public-menu/orders'){
      if(method==='GET')return r.fulfill({json:{ok:true,orders:state.orders,hasMore:false}});
      if(method==='POST'){
        const body=r.request().postDataJSON();state.posts.push(body);
        if(state.receipts.has(body.clientRequestId))return r.fulfill({status:201,json:state.receipts.get(body.clientRequestId)});
        if(state.repeat&&!body.repeatOrderId)return r.fulfill({status:409,json:{ok:false,code:'ORDER_REPEAT_CONFIRM',repeatOrderId:state.orders[0].id}});
        state.orders.unshift({id:crypto.randomUUID(),orderNumber:state.orders.length+1,tableLabel:'창가 테이블',createdAt:new Date().toISOString(),status:'received',paymentStatus:'unpaid',totalAmount:6000,lines:[{name:'라떼',quantity:1,unitPrice:6000,options:[]}]});
        const receipt={ok:true,order:{orderNumber:state.orders[0].orderNumber}};state.receipts.set(body.clientRequestId,receipt);
        if(state.loseNextResponse){const failure=state.loseNextResponse;state.loseNextResponse=false;return failure==='server-error'?r.fulfill({status:500,json:{ok:false,message:'Temporary server error'}}):r.abort('connectionreset');}
        return r.fulfill({status:201,json:receipt});
      }
    }
    unexpected.push(url.pathname);return r.abort();
  });
  await page.goto(base+'/qa-order-sessions?channel='+channel+'&'+params,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);return {page,state};
}
async function add(page){await page.locator('[data-menu-order-add]').click();await page.getByRole('dialog').getByRole('button',{name:/장바구니 담기/}).click();await page.getByRole('button',{name:/장바구니/}).first().click();return page.locator('[data-menu-cart]');}
try{
  for(const [channel,width,height]of [['customer',320,740],['customer',390,844],['customer',842,800],['customer',1440,900],['terminal',820,1180],['terminal',1180,820],['terminal',1440,900]]){
    const {page,state}=await setup({channel,width,height,params:'service=dining'}),cart=await add(page);
    const initialViewport=await page.evaluate(()=>[innerWidth,innerHeight]);
    await expect(cart.getByRole('textbox')).toHaveCount(channel==='customer'?1:0);
    await expect(cart.getByRole('button',{name:'선결제 · 준비 중',exact:true})).toHaveCount(channel==='customer'?1:0);
    if(channel==='customer'){
      await cart.getByRole('textbox').fill('010-0000-0000');
      await page.setViewportSize({width:width<768?842:390,height:844});
      await expect(cart.getByRole('textbox')).toHaveValue('010-0000-0000');
      await expect(cart.getByRole('button',{name:'선결제 · 준비 중',exact:true})).toBeDisabled();
    }
    await cart.getByRole('button',{name:'후불로 주문하기',exact:true}).click();
    await expect(cart.getByRole('tab',{name:'주문내역',selected:true})).toBeVisible();
    assert.equal(state.posts.length,1);assert.equal(state.posts[0].notificationPhone,channel==='customer'?'01000000000':null);
    await cart.getByRole('button',{name:'메뉴판으로 돌아가기',exact:true}).click();
    const again=await add(page);
    if(channel==='customer'){await expect(again.getByRole('textbox')).toHaveValue('010-0000-0000');await again.getByRole('textbox').fill('01011111111');}
    state.repeat=true;await again.getByRole('button',{name:'후불로 주문하기',exact:true}).click();
    const repeat=page.getByRole('dialog',{name:'동일한 주문 확인',exact:true});await expect(repeat).toBeVisible();
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.closest('dialog')?.getAttribute('aria-label')),'동일한 주문 확인');
    await page.keyboard.press('Escape');await expect(repeat).not.toBeVisible();await expect(again).toBeVisible();assert.equal(state.orders.length,1);
    await again.getByRole('button',{name:'후불로 주문하기',exact:true}).click();await repeat.getByRole('button',{name:'다시 주문하기',exact:true}).click();await expect(again.locator('[data-history-order]')).toHaveCount(2);
    assert.ok(state.posts.at(-1).repeatOrderId);if(channel==='customer')assert.equal(state.posts.at(-1).notificationPhone,'01011111111');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    results.push({case:'phone-checkout-repeat',channel,requested:[width,height],initialActual:initialViewport,afterResizeActual:await page.evaluate(()=>[innerWidth,innerHeight])});
    if(channel==='terminal'&&width===820)await page.screenshot({path:out+'/terminal-orders.png'});
    await page.close();
  }
  for(const failure of ['connection-reset','server-error']){
    const {page,state}=await setup();const cart=await add(page);await cart.getByRole('textbox').fill('01000000000');state.loseNextResponse=failure;
    await cart.getByRole('button',{name:'후불로 주문하기',exact:true}).click();await expect(cart.getByRole('button',{name:'후불로 주문하기',exact:true})).toBeEnabled();
    assert.equal(state.orders.length,1);const requestId=state.posts[0].clientRequestId;
    await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:/장바구니/}).first().click();const restored=page.locator('[data-menu-cart]');
    await expect(restored.getByRole('textbox')).toBeVisible();await restored.getByRole('textbox').fill('01000000000');await restored.getByRole('button',{name:'후불로 주문하기',exact:true}).click();
    await expect(restored.locator('[data-history-order]')).toHaveCount(1);assert.equal(state.posts[1].clientRequestId,requestId);assert.equal(state.orders.length,1);
    results.push({case:'lost-response-reload-retries-same-request',failure});await page.close();
  }
  {
    const {page,state}=await setup({params:'checkout=prepay'});const cart=await add(page);await expect(cart.getByRole('button',{name:'선결제 · 준비 중',exact:true})).toBeDisabled();assert.equal(state.posts.length,0);results.push({case:'prepay-only-does-not-submit-postpay'});await page.close();
  }
  {
    const {page,state}=await setup();await page.clock.fastForward(55*60000+1000);
    const warning=page.getByRole('dialog',{name:'주문 이용 시간 연장',exact:true});await expect(warning).toBeVisible();await warning.getByRole('button',{name:'1시간 연장',exact:true}).click();await expect(warning).not.toBeVisible();assert.equal(state.renewals,1);
    await page.clock.fastForward(61*60000);const expired=page.getByRole('dialog',{name:'주문 이용 시간 만료',exact:true});await expect(expired).toBeVisible();await expired.getByRole('button',{name:'메뉴판 계속 보기',exact:true}).click();
    const cart=await add(page);await expect(cart.getByRole('button',{name:'후불로 주문하기',exact:true})).toBeDisabled();await expect(cart.getByText('주문 이용 시간이 만료되었습니다. 테이블 QR을 다시 스캔해 주세요.',{exact:true})).toBeVisible();
    await page.screenshot({path:out+'/personal-expired.png'});results.push({case:'renew-and-expire-preserve-cart'});await page.close();
  }
  {
    const {page,state}=await setup({channel:'terminal',width:820,height:1180});await add(page);
    await page.clock.fastForward(9*60000+1500);const notice=page.getByRole('dialog',{name:'장바구니 자동 초기화 안내',exact:true});await expect(notice).toBeVisible();await notice.getByRole('button',{name:'계속 이용하기',exact:true}).click();await expect(notice).not.toBeVisible();
    await page.clock.fastForward(10*60000+1500);const cleared=page.getByRole('dialog',{name:'장바구니를 비웠습니다',exact:true});await expect(cleared).toBeVisible();await cleared.getByRole('button',{name:'확인',exact:true}).click();await expect(page.getByText('장바구니가 비어 있어요',{exact:true})).toBeVisible();assert.equal(state.posts.length,0);assert.equal(state.sessionReads,0);
    results.push({case:'terminal-idle-warning-continue-clear'});await page.close();
  }
  {
    const {page,state}=await setup({params:'orders=off'});await page.clock.fastForward(25*3600000);await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'메뉴판',exact:true})).toBeVisible();assert.equal(state.sessionReads,0);results.push({case:'call-only-no-order-timeout'});await page.close();
  }
  {
    const {page}=await setup({width:390,height:844,params:'settings=on'});await page.getByRole('combobox').first().selectOption('prepay');await expect(page.getByText(/선결제만 선택하면 개인 기기의 실제 주문을 받을 수 없습니다/)).toBeVisible();await expect(page.getByText('연동 준비 중',{exact:true})).toBeVisible();await expect(page.getByRole('checkbox',{name:'알림톡 사용 · 준비 중'})).toBeDisabled();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:out+'/settings-mobile.png'});results.push({case:'settings-and-notification-preparation'});await page.close();
  }
  for(const [locale,title,extend]of [['en','Extend ordering time','Extend by 1 hour'],['ja','注文受付時間を延長','1時間延長'],['zh','延长下单时间','延长1小时']]){
    const {page}=await setup({width:320,height:740,params:'locale='+locale});await page.clock.fastForward(55*60000+1000);const notice=page.getByRole('dialog',{name:title,exact:true});await expect(notice.getByRole('button',{name:extend,exact:true})).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);results.push({case:'translated-expiry',locale});await page.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  await fs.writeFile(out+'/report.json',JSON.stringify({results,errors,unexpected},null,2));console.log(JSON.stringify({passed:results.length,results,productionWrites:0,actualMessaging:0}));
}finally{await browser.close();await fs.rm(route,{recursive:true,force:true});}
