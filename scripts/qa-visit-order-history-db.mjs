import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {NextRequest} from 'next/server.js';
import {createTableVisitSessionMaterial,TABLE_VISIT_SESSION_COOKIE} from '../lib/table-qr-session-tokens.ts';
import {getPermissionsForAccessRole} from '../lib/menu-site-permissions.ts';
const {PGlite}=await import(process.env.PGLITE_TEST_MODULE||'/private/tmp/artimenu-order-db-test/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite(), q=async(sql,args=[])=>(await db.query(sql,args)).rows, clean=v=>JSON.parse(JSON.stringify(v));
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;}, reject=async(fn,pattern)=>{await assert.rejects(fn,pattern);checks++;};
const migration=name=>fs.readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create table menu_sites(id uuid primary key,user_id uuid,template_key text,status text default 'published',slug text default 'test-menu',settings jsonb default '{}');
 create table menu_pages(id uuid primary key,menu_site_id uuid,visible boolean default true);
 create table menu_categories(id uuid primary key,menu_site_id uuid,menu_page_id uuid,name text,course_price integer,course_price_visible boolean default true,visible boolean default true);
 create table menu_items(id uuid primary key,menu_site_id uuid references menu_sites(id),name text,price integer,price_label text,visible boolean default true,price_visible boolean default true,is_sold_out boolean default false,category_id uuid,menu_page_id uuid,sort_order integer default 0,updated_at timestamptz default now());
 create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
 create table menu_promotions(id uuid primary key,menu_site_id uuid,type text,active boolean,starts_at timestamptz,ends_at timestamptz,schedule_type text,daily_start_time time,daily_end_time time,timezone text);
 create table menu_promotion_items(id uuid primary key,promotion_id uuid,menu_item_id uuid,price_column_id uuid,visible boolean,sale_price integer);`);
 for(const name of ['20260806105623_add_table_qr_session_foundation.sql','20260901072048_add_persistent_table_qr_public_id.sql','20260806124512_add_postpay_order_foundation.sql','20261018085245_add_menu_order_configuration.sql'])await db.exec(await migration(name));
 const daily=await migration('20260713130607_add_time_sale_daily_windows.sql');const active=daily.slice(daily.indexOf('create or replace function public.is_menu_promotion_active_now'));await db.exec(active.slice(0,active.indexOf('$;')+3));
 await db.exec(await migration('20261018090357_add_course_postpay_orders.sql'));
 await db.exec(await migration('20261028141514_simplify_menu_item_orderability.sql'));
 await db.exec(await migration('20261029001153_add_order_session_settings.sql'));
 const owner=crypto.randomUUID(), basic=crypto.randomUUID(), dining=crypto.randomUUID(),other=crypto.randomUUID(),table=crypto.randomUUID(),otherTable=crypto.randomUUID(),item=crypto.randomUUID(),group=crypto.randomUUID(),option=crypto.randomUUID(),course=crypto.randomUUID();
 const settings={table_order:{orderEnabled:true,postpayEnabled:true,customerPhone:'hidden',orderableCourseIds:[course]}};
 await q('insert into auth.users values($1)',[owner]);
 for(const [id,key]of [[basic,'cafe_design_a'],[dining,'dining_aube_table_a'],[other,'cafe_mocha_forest_a']])await q('insert into menu_sites(id,user_id,template_key,settings) values($1,$2,$3,$4)',[id,owner,key,settings]);
 const hash=()=>crypto.randomUUID().replaceAll('-','').repeat(2);
 for(const id of [table,otherTable])await q("insert into menu_tables(id,menu_site_id,label,token_hash) values($1,$2,$3,$4)",[id,basic,id===table?'창가 테이블':'다른 테이블',hash()]);
 const ua='ArtiMenu isolated history QA';
 async function session(t=table){const m=createTableVisitSessionMaterial({userAgent:ua}),id=crypto.randomUUID();await q('insert into table_visit_sessions(id,menu_site_id,menu_table_id,token_hash,user_agent_hash,expires_at) values($1,$2,$3,$4,$5,$6)',[id,basic,t,m.tokenHash,m.userAgentHash,m.expiresAt]);return {id,token:m.rawToken,table:t};}
 const visit=await session(),anotherVisit=await session(),anotherTableVisit=await session(otherTable);
 await q("insert into menu_items(id,menu_site_id,name,price,orderable) values($1,$2,'주문 당시 라떼',5000,true)",[item,basic]);
 await q("insert into menu_order_option_groups(id,menu_site_id,menu_item_id,name,is_required,min_selections) values($1,$2,$3,'온도',true,1)",[group,basic,item]);
 await q("insert into menu_order_option_values(id,menu_site_id,option_group_id,name,price_delta) values($1,$2,$3,'ICE',500)",[option,basic,group]);
 await q("insert into menu_categories(id,menu_site_id,name,course_price) values($1,$2,'시그니처 코스',185000)",[course,basic]);
 const submit=async(s=visit,courseOnly=false)=>(await q('select * from public.submit_postpay_order_v2($1,$2,$3,null,$4::jsonb)',[basic,s.id,crypto.randomUUID(),JSON.stringify([courseOnly?{menuCategoryId:course,quantity:1,optionValueIds:[]}:{menuItemId:item,quantity:2,optionValueIds:[option]}])]))[0];
 const original=await submit(),courseOrder=await submit(visit,true),foreign=await submit(anotherVisit),foreignTable=await submit(anotherTableVisit);
 const before=await q('select * from menu_customer_orders order by id');
 await db.exec(await migration('20261021151631_add_visit_order_history_and_cancellation.sql'));
 check(await q('select * from menu_customer_orders order by id'),before);
 const existingVisits=await q('select * from table_visit_sessions order by id');
 const visitSecurity=await q("select relacl,relrowsecurity,relforcerowsecurity from pg_class where oid='public.table_visit_sessions'::regclass");
 await db.exec(await migration('20261029014156_allow_terminal_connection_renewal.sql'));
 check(await q('select * from table_visit_sessions order by id'),existingVisits);
 check(await q('select * from menu_customer_orders order by id'),before);
 check(await q("select relacl,relrowsecurity,relforcerowsecurity from pg_class where oid='public.table_visit_sessions'::regclass"),visitSecurity);
 const history=async(s=visit,site=basic)=>(await q('select public.list_visit_customer_orders($1,$2) value',[site,s.id]))[0].value;
 const cancel=async(id,s=visit,site=basic)=>(await q('select public.cancel_visit_customer_order($1,$2,$3) value',[site,s.id,id]))[0].value;
 let data=await history();check(data.orders.map(o=>o.id),[courseOrder.order_id,original.order_id]);check(data.hasMore,false);
 check(data.orders[1].lines,[{name:'주문 당시 라떼',quantity:2,unitPrice:5500,options:['온도: ICE']}]);check(data.orders[1].totalAmount,11000);check(data.orders[0].lines[0].name,'시그니처 코스 · 코스');
 check(data.orders[1].tableLabel,'창가 테이블');assert.ok(Number.isFinite(Date.parse(data.orders[1].createdAt)));checks++;
 await q("update menu_items set name='변경된 이름',price=9999 where id=$1",[item]);await q("update menu_order_option_values set name='변경된 옵션' where id=$1",[option]);
 check((await history()).orders[1].lines,data.orders[1].lines);
 await reject(()=>cancel(foreign.order_id),/NOT_FOUND/);await reject(()=>cancel(foreignTable.order_id),/NOT_FOUND/);await reject(()=>history(visit,other),/INACTIVE/);
 for(const status of ['accepted','cooking','ready','served']){await q('update menu_customer_orders set status=$1 where id=$2',[status,original.order_id]);await reject(()=>cancel(original.order_id),/NOT_CANCELLABLE/);check((await history()).orders.find(o=>o.id===original.order_id).status,status);}
 await q("update menu_customer_orders set status='received',payment_status='manual_paid',payment_method='manual_cash',payment_completed_at=now(),payment_completed_by=$1 where id=$2",[owner,original.order_id]);
 await reject(()=>cancel(original.order_id),/NOT_CANCELLABLE/);check((await history()).orders.find(o=>o.id===original.order_id).paymentStatus,'manual_paid');
 await q("update menu_customer_orders set payment_status='unpaid',payment_method=null,payment_completed_at=null,payment_completed_by=null where id=$1",[original.order_id]);
 check(await cancel(original.order_id),{id:original.order_id,status:'cancelled'});const stamp=(await q('select updated_at from menu_customer_orders where id=$1',[original.order_id]))[0].updated_at;await cancel(original.order_id);check((await q('select updated_at from menu_customer_orders where id=$1',[original.order_id]))[0].updated_at,stamp);
 for(const role of ['anon','authenticated'])for(const fn of ['list_visit_customer_orders(uuid,uuid)','cancel_visit_customer_order(uuid,uuid,uuid)'])check((await q("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,'public.'+fn]))[0].allowed,false);
 await db.exec('grant select on menu_sites,menu_items,menu_pages,menu_categories,menu_promotions,menu_promotion_items to service_role;set role service_role');check((await history()).orders.length,2);await db.exec('reset role');
 for(const fn of ['list_visit_customer_orders','cancel_visit_customer_order'])check((await q("select prosecdef,proconfig from pg_proc where proname=$1",[fn]))[0],{prosecdef:false,proconfig:['search_path=""']});
 // Actual server services and route handlers, replacing only auth/account and DB transport adapters.
 const bundle='/private/tmp/visit-order-services-qa.mjs';
 await build({stdin:{contents:`export * as history from './lib/server/customer-order-history-service.ts';export * as staff from './lib/server/order-management-service.ts';export * as api from './app/api/public-menu/orders/route.ts';export * as orderSession from './app/api/public-menu/order-session/route.ts';export * as terminal from './lib/server/table-terminal-service.ts';export * as visits from './lib/server/table-visit-session-service.ts';export * as tableActions from './app/mypage/menus/[menuId]/tables/actions.ts';`,resolveDir:process.cwd()},outfile:bundle,bundle:true,platform:'node',format:'esm',tsconfig:'tsconfig.json',logLevel:'silent',plugins:[{name:'isolated-adapters',setup(b){
 b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export {};'}));
 b.onResolve({filter:/^next\/server$/},()=>({path:process.cwd()+'/node_modules/next/server.js',external:true}));
 b.onResolve({filter:/^next\/(headers|cache|navigation)$/},args=>({path:args.path,namespace:'qa-next'}));b.onLoad({filter:/.*/,namespace:'qa-next'},args=>({contents:args.path==='next/headers'?`export const cookies=async()=>globalThis.__visitCookies;export const headers=async()=>new Headers({'user-agent':globalThis.__visitUa});`:args.path==='next/navigation'?`export const redirect=path=>{throw new Error('QA_REDIRECT:'+path);};`:`export const revalidatePath=()=>{};`}));
 b.onResolve({filter:/supabase\/server$/},()=>({path:'session-auth',namespace:'qa-auth'}));b.onLoad({filter:/.*/,namespace:'qa-auth'},()=>({contents:`export const createClient=async()=>({auth:{signOut:async options=>{globalThis.__visitSignOut.push(options);return {error:globalThis.__visitSignOutError??null};}}});`}));

 b.onResolve({filter:/supabase\/admin$/},()=>({path:'admin',namespace:'qa-db'}));b.onLoad({filter:/.*/,namespace:'qa-db'},()=>({contents:'export const createAdminClient=()=>globalThis.__visitAdmin;'}));
 b.onResolve({filter:/menu-site-access-service$/},()=>({path:'access',namespace:'qa-access'}));b.onLoad({filter:/.*/,namespace:'qa-access'},()=>({contents:`export const MENU_SITE_INACTIVE_EDIT_MESSAGE='Inactive site';export const getMenuSiteAccessStateForMenuSite=async()=>globalThis.__visitAccess;export async function requireMenuSitePermission(id,permission){if(!globalThis.__visitPermissions.has(permission))throw new Error('PERMISSION_DENIED');return {menuSiteId:id,isOwner:false,staffAccessAllowed:true,permissions:globalThis.__visitPermissions,actorUserId:globalThis.__visitOwner};}export async function requireMenuSiteWriteAccess(id,permission){return {context:await requireMenuSitePermission(id,permission),supabase:globalThis.__visitAdmin};}`}));
 }}]});
 const tables=new Set(['menu_sites','table_visit_sessions','menu_tables','menu_customer_orders','menu_customer_order_items','menu_customer_order_item_options']);
 const ident=k=>{assert.match(k,/^[a-z_]+$/);return k;};
 const rpcParams={register_table_terminal_visit:['p_menu_site_id','p_table_id','p_token_hash','p_user_agent_hash','p_previous_token_hash'],resolve_order_visit_access:['p_menu_site_id','p_session_id'],extend_table_order_access:['p_menu_site_id','p_session_id','p_rescan'],submit_postpay_order_v3:['p_menu_site_id','p_table_visit_session_id','p_client_request_id','p_request_text','p_lines','p_notification_phone','p_repeat_order_id'],list_visit_customer_orders:['p_menu_site_id','p_table_visit_session_id'],cancel_visit_customer_order:['p_menu_site_id','p_table_visit_session_id','p_order_id'],submit_postpay_order_v2:['p_menu_site_id','p_table_visit_session_id','p_client_request_id','p_request_text','p_lines']};
 globalThis.__visitAdmin={from(tableName){assert.ok(tables.has(tableName));let filters=[],args=[],fields='*',patch=null,sort=[],limit='';const add=(key,operator,value)=>{args.push(value);filters.push(`${ident(key)} ${operator} $${args.length}`);return chain;};
 const execute=async()=>{try{const where=filters.length?' where '+filters.join(' and '):'';let sql;
 if(patch){if(globalThis.__visitBeforeUpdate){const hook=globalThis.__visitBeforeUpdate;globalThis.__visitBeforeUpdate=null;await hook();}const keys=Object.keys(patch);sql=`update ${tableName} set ${keys.map((k,i)=>ident(k)+'=$'+(args.length+i+1)).join(',')}${where} returning ${fields}`;args.push(...keys.map(k=>patch[k]));}else sql=`select ${fields} from ${tableName}${where}${sort.length?' order by '+sort.join(','):''}${limit}`;
 return {data:clean(await q(sql,args)),error:null};}catch(e){return {data:null,error:{message:e.message,details:e.detail,code:e.code}}}};
 const chain={select(value){fields=value.split(',').map(k=>ident(k.trim())).join(',');return chain;},update(value){patch=value;return chain;},eq:(k,v)=>add(k,'=',v),neq:(k,v)=>add(k,'<>',v),gt:(k,v)=>add(k,'>',v),lt:(k,v)=>add(k,'<',v),lte:(k,v)=>add(k,'<=',v),in:(k,v)=>add(k,'= any',v),is(k,v){assert.equal(v,null);filters.push(`${ident(k)} is null`);return chain;},order(k,{ascending=true}={}){sort.push(ident(k)+(ascending?' asc':' desc'));return chain;},limit(n){limit=' limit '+Number(n);return chain;},async maybeSingle(){const r=await execute();return {...r,data:r.data?.[0]??null};},single(){return chain.maybeSingle();},then(ok,bad){return execute().then(ok,bad);}};return chain;},
 async rpc(name,args){try{const keys=rpcParams[name];assert.ok(keys);const params=keys.map(k=>k==='p_lines'?JSON.stringify(args[k]):args[k]);const query=`select ${name.startsWith('submit_postpay_order_v')?'* from ':''}public.${name}(${keys.map((k,i)=>'$'+(i+1)+(k==='p_lines'?'::jsonb':'')).join(',')})${name.startsWith('submit_postpay_order_v')?'':' value'}`;const rows=await q(query,params);return {data:clean(name.startsWith('submit_postpay_order_v')?rows:rows[0].value),error:null};}catch(e){return {data:null,error:{message:e.message,details:e.detail,code:e.code}}}}
 };
 process.env.POSTPAY_ORDER_ENABLED='true';process.env.POSTPAY_ORDER_ALLOWED_SITE_IDS=[basic,dining,other].join(',');process.env.TABLE_MANAGEMENT_ENABLED='true';process.env.TABLE_MANAGEMENT_ALLOWED_SITE_IDS=[basic,dining,other].join(',');process.env.ORDER_DASHBOARD_ENABLED='true';process.env.ORDER_DASHBOARD_ALLOWED_SITE_IDS=basic;
 globalThis.__visitAccess={canViewPublic:true,planType:'business_basic'};globalThis.__visitOwner=owner;globalThis.__visitPermissions=getPermissionsForAccessRole('owner');
 const services=await import(pathToFileURL(bundle).href), serviceVisit={id:visit.id,menuSiteId:basic,menuTableId:table,tableLabel:'창가 테이블',expiresAt:new Date(Date.now()+3600000).toISOString()};
 check((await services.history.listCustomerVisitOrders({menuSiteId:basic,tableSession:serviceVisit})).orders.length,2);
 process.env.POSTPAY_ORDER_ALLOWED_SITE_IDS=dining;await reject(()=>services.history.listCustomerVisitOrders({menuSiteId:basic,tableSession:serviceVisit}),/이용할 수 없습니다/);process.env.POSTPAY_ORDER_ALLOWED_SITE_IDS=[basic,dining,other].join(',');
 globalThis.__visitAccess={canViewPublic:true,planType:'personal_trial'};await reject(()=>services.history.listCustomerVisitOrders({menuSiteId:basic,tableSession:serviceVisit}),/이용할 수 없습니다/);globalThis.__visitAccess={canViewPublic:true,planType:'business_basic'};
 await reject(()=>services.history.listCustomerVisitOrders({menuSiteId:other,tableSession:serviceVisit}),/이용할 수 없습니다/);
 const request=(method,s=visit,body,origin='https://menu.test')=>new NextRequest('https://menu.test/api/public-menu/orders'+(method==='GET'?'?menuSiteId='+basic:''),{method,headers:{origin,'user-agent':ua,'content-type':'application/json',...(s?{cookie:TABLE_VISIT_SESSION_COOKIE+'='+s.token}:{})},...(method!=='GET'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
 check((await services.api.GET(request('GET',null))).status,401);
 const otherAgent=request('GET');otherAgent.headers.set('user-agent','another-browser');check((await services.api.GET(otherAgent)).status,401);
 check((await (await services.api.GET(request('GET',anotherVisit))).json()).orders.map(o=>o.id),[foreign.order_id]);
 let result=await services.api.GET(request('GET'));check(result.status,200);check(result.headers.get('cache-control'),'no-store');check(result.headers.get('vary'),'Cookie');check((await result.json()).orders.length,2);
 check((await services.api.PATCH(request('PATCH',visit,{menuSiteId:basic,orderId:courseOrder.order_id},'https://evil.test'))).status,403);
 check((await services.api.PATCH(request('PATCH',null,{menuSiteId:basic,orderId:courseOrder.order_id}))).status,401);
 check((await services.api.PATCH(request('PATCH',visit,'{bad'))).status,400);check((await services.api.PATCH(request('PATCH',visit,'x'.repeat(2049)))).status,413);
 check((await services.api.PATCH(request('PATCH',visit,{menuSiteId:basic,orderId:foreign.order_id}))).status,404);
 // Staff acceptance wins before customer cancel; customer-first cancellation rejects late staff acceptance/payment.
 await services.staff.transitionOrderStatus({menuSiteId:basic,orderId:courseOrder.order_id,nextStatus:'accepted'});
 check((await services.api.PATCH(request('PATCH',visit,{menuSiteId:basic,orderId:courseOrder.order_id}))).status,409);
 for(const nextStatus of ['cooking','ready','served'])await services.staff.transitionOrderStatus({menuSiteId:basic,orderId:courseOrder.order_id,nextStatus});
 await services.staff.markOrderManualPayment({menuSiteId:basic,orderId:courseOrder.order_id,method:'manual_card'});
 data=await (await services.api.GET(request('GET'))).json();check(data.orders.find(o=>o.id===courseOrder.order_id).status,'served');check(data.orders.find(o=>o.id===courseOrder.order_id).paymentStatus,'manual_paid');
 await reject(()=>services.staff.transitionOrderStatus({menuSiteId:basic,orderId:original.order_id,nextStatus:'accepted'}),/현재 단계/);await reject(()=>services.staff.markOrderManualPayment({menuSiteId:basic,orderId:original.order_id,method:'manual_card'}),/미결제/);
 // Simulate the interval between a staff read and conditional write using the real guest cancellation RPC.
 for(const operation of ['accept','payment']){
 const raced=await submit();globalThis.__visitBeforeUpdate=()=>cancel(raced.order_id);
 if(operation==='accept')await reject(()=>services.staff.transitionOrderStatus({menuSiteId:basic,orderId:raced.order_id,nextStatus:'accepted'}),/먼저 변경/);
 else await reject(()=>services.staff.markOrderManualPayment({menuSiteId:basic,orderId:raced.order_id,method:'manual_card'}),/먼저 변경/);
 check((await history()).orders.find(o=>o.id===raced.order_id).status,'cancelled');check((await history()).orders.find(o=>o.id===raced.order_id).paymentStatus,'unpaid');
 }
 for(const role of ['viewer','editor']){globalThis.__visitPermissions=getPermissionsForAccessRole(role);await reject(()=>services.staff.transitionOrderStatus({menuSiteId:basic,orderId:foreign.order_id,nextStatus:'accepted'}),/PERMISSION_DENIED/);await reject(()=>services.staff.markOrderManualPayment({menuSiteId:basic,orderId:foreign.order_id,method:'manual_cash'}),/PERMISSION_DENIED/);}
 globalThis.__visitPermissions=getPermissionsForAccessRole('owner');
 const freshBody={menuSiteId:basic,clientRequestId:crypto.randomUUID(),lines:[{menuItemId:item,quantity:1,optionValueIds:[option]}]};
 result=await services.api.POST(request('POST',visit,freshBody));check(result.status,201);const posted=(await result.json()).order;
 check((await services.api.POST(request('POST',visit,freshBody))).status,200);check((await services.api.PATCH(request('PATCH',visit,{menuSiteId:basic,orderId:posted.orderId,status:'served',paymentStatus:'paid',tableVisitSessionId:anotherVisit.id}))).status,200);
 await q("update menu_sites set settings='{}' where id=$1",[basic]);check((await services.api.GET(request('GET'))).status,200);await q('update menu_sites set settings=$1 where id=$2',[settings,basic]);
 for(const key of ['expired','revoked','disabled','rotated','unpublished']){
 const s=await session(),order=await submit(s);
 if(key==='expired')await q("update table_visit_sessions set created_at=now()-interval '2 hours',last_seen_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where id=$1",[s.id]);
 if(key==='revoked')await q('update table_visit_sessions set revoked_at=now() where id=$1',[s.id]);
 if(key==='disabled')await q("update menu_tables set status='disabled' where id=$1",[table]);
 if(key==='rotated')await q('update menu_tables set token_hash=$1 where id=$2',[hash(),table]);
 if(key==='unpublished')await q("update menu_sites set status='draft' where id=$1",[basic]);
 await reject(()=>history(s),/INACTIVE/);await reject(()=>cancel(order.order_id,s),/INACTIVE/);
 await q("update menu_tables set status='active' where id=$1",[table]);await q("update menu_sites set status='published' where id=$1",[basic]);
 }
 const bounded=await session();
 for(let i=0;i<101;i++)await q("with o as(insert into menu_customer_orders(menu_site_id,menu_table_id,table_visit_session_id,client_request_id,subtotal_amount,total_amount) values($1,$2,$3,$4,5000,5000) returning id) insert into menu_customer_order_items(menu_site_id,order_id,item_name_snapshot,base_price_snapshot,unit_price_snapshot,quantity,line_total_snapshot) select $1,id,'이전 주문',5000,5000,1,5000 from o",[basic,table,bounded.id,crypto.randomUUID()]);
 data=await history(bounded);check(data.orders.length,100);check(data.hasMore,true);assert.ok(data.orders[0].orderNumber>data.orders.at(-1).orderNumber);checks++;
 checks += await (await import('./qa-order-session-cases.mjs')).verifyOrderSessions({db,q,basic,table,other,otherTable,item,option,group,owner,services,ua,session,settings});
 console.log(JSON.stringify({passed:checks,isolatedDatabase:true,actualRoutes:true,actualHistoryService:true,actualStaffService:true,productionWrites:0,realOrders:0,realPayments:0}));
}finally{await db.close();}
