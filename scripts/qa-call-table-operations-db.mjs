import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { getServiceStaffCallItems } from "../lib/call-items.ts";
const {PGlite}=await import(process.env.PGLITE_TEST_MODULE || "/private/tmp/artimenu-order-db-test/node_modules/@electric-sql/pglite/dist/index.js");
const db=new PGlite(),q=async(sql,args=[])=>(await db.query(sql,args)).rows;
let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const reject=async(fn,pattern)=>{await assert.rejects(fn,pattern);checks++;};
const migration=name=>fs.readFile(new URL("../supabase/migrations/"+name,import.meta.url),"utf8");
try {
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
create table auth.users(id uuid primary key);
create table public.menu_sites(id uuid primary key,user_id uuid,template_key text,status text default 'published',settings jsonb default '{}');
create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;`);
await db.exec(await migration("20260806105623_add_table_qr_session_foundation.sql"));
await db.exec(await migration("20260901072048_add_persistent_table_qr_public_id.sql"));
await db.exec("alter table public.table_visit_sessions add unique(menu_site_id,menu_table_id,id)");
await db.exec(await migration("20260806142627_add_call_mvp_foundation.sql"));
await db.exec(await migration("20260828143000_add_store_call_items.sql"));
await db.exec(await migration("20260909115000_fix_replace_menu_call_items_conflict.sql"));
const basic=crypto.randomUUID(),dining=crypto.randomUUID(),sidebar=crypto.randomUUID(),legacy=crypto.randomUUID(),owner=crypto.randomUUID();
await q("insert into auth.users values($1)",[owner]);
for(const [id,template] of [[basic,"cafe_design_a"],[dining,"dining_aube_table_a"],[sidebar,"dining_aube_table_b"],[legacy,"cafe_brew_chapter_a"]])await q("insert into menu_sites(id,user_id,template_key) values($1,$2,$3)",[id,owner,template]);
const saved=[{key:"staff",label:"직원 호출"},{key:"water",label:"물 요청"},{key:"apron",label:"앞치마 요청"},{key:"tableware",label:"식기 요청"},{key:"table_cleanup",label:"테이블 정리"},{key:"order_help",label:"주문 도움"}];
for(const [index,item] of saved.entries())await q("insert into menu_call_items(menu_site_id,item_key,label,sort_order) values($1,$2,$3,$4)",[legacy,item.key,item.label,index]);
const storedBefore=await q("select * from menu_call_items order by item_key");
await db.exec(await migration("20261021145548_align_staff_call_service_defaults.sql"));
check(await q("select * from menu_call_items order by item_key"),storedBefore);
const list=(id,all=false)=>q("select * from public.list_menu_call_items($1,$2)",[id,all]);
for(const [id,service] of [[basic,"basic"],[dining,"dining"],[sidebar,"dining"]]){
 check((await list(id)).map(r=>({key:r.item_key,label:r.label,sortOrder:r.sort_order,active:r.is_active})),getServiceStaffCallItems(service));
}
check((await list(legacy,true)).map(r=>r.label),saved.map(r=>r.label));
check((await q("select count(*)::int n from menu_call_items"))[0].n,6);
await reject(()=>list(crypto.randomUUID()),/CALL_MENU_SITE_NOT_FOUND/);
const save=(id,items)=>q("select * from public.replace_menu_call_items($1,$2::jsonb)",[id,JSON.stringify(items)]);
let choices=getServiceStaffCallItems("basic");choices[0].label="냅킨 부탁드려요";choices[1].active=false;
await save(basic,choices);check((await list(basic)).map(r=>r.label),choices.filter(r=>r.active).map(r=>r.label));
check((await list(basic,true)).length,5);
const before=await list(basic,true);
await reject(()=>save(basic,[...choices,{key:"extra",label:"여섯째",sortOrder:5,active:true}]),/between 1 and 5/);
await reject(()=>save(basic,choices.map(r=>({...r,active:false}))),/At least one/);
await reject(()=>save(basic,[{...choices[0]},{...choices[1],label:choices[0].label}]),/unique/);
check(await list(basic,true),before);
const hash=()=>crypto.randomUUID().replaceAll("-","").repeat(2), table=crypto.randomUUID();
await q("insert into menu_tables(id,menu_site_id,label,token_hash) values($1,$2,'1번 테이블',$3)",[table,dining,hash()]);
const session=async()=>{const id=crypto.randomUUID();await q("insert into table_visit_sessions(id,menu_site_id,menu_table_id,token_hash,user_agent_hash,expires_at) values($1,$2,$3,$4,$5,now()+interval '1 hour')",[id,dining,table,hash(),hash()]);return id;};
const sessionId=await session();
const submit=(sid,key="wine",site=dining)=>q("select * from public.submit_staff_call($1,$2,$3)",[site,sid,key]);
const first=(await submit(sessionId))[0];check(first.request_label,"와인 문의");check(first.is_duplicate,false);
check((await submit(sessionId))[0].call_id,first.call_id);
check((await submit(sessionId))[0].is_duplicate,true);
check((await q("select count(*)::int n from menu_customer_calls"))[0].n,1);
await reject(()=>submit(sessionId,"missing"),/CALL_ITEM_UNAVAILABLE/);
await reject(()=>submit(sessionId,"wine",basic),/session is not active/);
await q("select * from public.cancel_pending_staff_call($1,$2,$3)",[dining,sessionId,first.call_id]);
await reject(()=>submit(sessionId),/CALL_COOLDOWN/);
const secondSession=await session(),ack=(await submit(secondSession,"order"))[0];
await q("update menu_customer_calls set status='acknowledged',acknowledged_by=$1,acknowledged_at=now() where id=$2",[owner,ack.call_id]);
await reject(()=>q("select * from public.cancel_pending_staff_call($1,$2,$3)",[dining,secondSession,ack.call_id]),/CALL_NOT_CANCELLABLE/);
const oldQr=(await q("select qr_public_id from menu_tables where id=$1",[table]))[0].qr_public_id;
await q("update menu_tables set label='창가 테이블' where id=$1",[table]);
check((await q("select qr_public_id from menu_tables where id=$1",[table]))[0].qr_public_id,oldQr);
check((await q("select revoked_at from table_visit_sessions where id=$1",[secondSession]))[0].revoked_at,null);
await q("update menu_tables set token_hash=$1 where id=$2",[hash(),table]);
assert.notEqual((await q("select qr_public_id from menu_tables where id=$1",[table]))[0].qr_public_id,oldQr);checks++;
assert.ok((await q("select revoked_at from table_visit_sessions where id=$1",[secondSession]))[0].revoked_at);checks++;
await reject(()=>submit(secondSession),/session is not active/);
const disabledSession=await session();await q("update menu_tables set status='disabled' where id=$1",[table]);
await reject(()=>submit(disabledSession),/session is not active/);
check((await q("select request_label from menu_customer_calls where id=$1",[first.call_id]))[0].request_label,"와인 문의");
for(const role of ["anon","authenticated"]){
 for(const fn of ["list_menu_call_items(uuid,boolean)","replace_menu_call_items(uuid,jsonb)","submit_staff_call(uuid,uuid,text)"])
 check((await q("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,"public."+fn]))[0].allowed,false);
 await db.exec("set role "+role);await reject(()=>list(dining),/permission denied/);await db.exec("reset role");
}
await db.exec("grant usage on schema public to service_role;grant select on menu_sites to service_role;set role service_role");
check((await list(dining)).length,5);await db.exec("reset role");
// Exercise the actual call-item service, with only its transport/permission adapters replaced.
const {build}=await import("esbuild");
const bundle="/private/tmp/call-items-service-qa.mjs";
await build({entryPoints:["lib/server/call-item-service.ts"],outfile:bundle,bundle:true,platform:"node",format:"esm",tsconfig:"tsconfig.json",logLevel:"silent",plugins:[{name:"isolated-call-adapters",setup(b){
 b.onResolve({filter:/^server-only$/},()=>({path:"empty",namespace:"qa"}));
 b.onLoad({filter:/.*/,namespace:"qa"},()=>({contents:"export {};"}));
 b.onResolve({filter:/supabase\/admin$/},()=>({path:"admin",namespace:"qa-admin"}));
 b.onLoad({filter:/.*/,namespace:"qa-admin"},()=>({contents:"export const createAdminClient=()=>globalThis.__callQaAdmin;"}));
 b.onResolve({filter:/menu-site-access-service$/},()=>({path:"access",namespace:"qa-access"}));
 b.onLoad({filter:/.*/,namespace:"qa-access"},()=>({contents:"export async function requireMenuSiteWriteAccess(){if(!globalThis.__callQaCanWrite)throw new Error('PERMISSION_DENIED');return {};};"}));
}}]});
globalThis.__callQaAdmin={
 from(tableName){assert.equal(tableName,"menu_call_items");let id;const chain={select(){return chain;},eq(_key,value){id=value;return chain;},async is(){return {count:(await q("select count(*)::int n from menu_call_items where menu_site_id=$1 and archived_at is null",[id]))[0].n,error:null};}};return chain;},
 async rpc(name,args){try {if(name==="list_menu_call_items")return {data:await list(args.p_menu_site_id,args.p_include_inactive),error:null};if(name==="replace_menu_call_items")return {data:await save(args.p_menu_site_id,args.p_items),error:null};throw Error("Unexpected RPC");}catch(error){return {data:null,error:{message:error.message}};}}
};
const service=await import("file://"+bundle);
check((await service.listStaffCallItems({menuSiteId:legacy,includeInactive:true})).map(i=>i.label),saved.map(i=>i.label));
check(await service.listStaffCallItems({menuSiteId:dining}),getServiceStaffCallItems("dining"));
globalThis.__callQaCanWrite=false;
await reject(()=>service.saveStaffCallItems({menuSiteId:dining,items:getServiceStaffCallItems("dining")}),/PERMISSION_DENIED/);
check((await q("select count(*)::int n from menu_call_items where menu_site_id=$1",[dining]))[0].n,0);
globalThis.__callQaCanWrite=true;
const renamed=getServiceStaffCallItems("dining");renamed[2].label="와인 추천 부탁드려요";
await service.saveStaffCallItems({menuSiteId:dining,items:renamed});
check(await service.listStaffCallItems({menuSiteId:dining}),renamed);
check((await q("select request_label from menu_customer_calls where id=$1",[first.call_id]))[0].request_label,"와인 문의");
console.log(JSON.stringify({passed:checks,isolatedDatabase:true,productionWrites:0,realCalls:0,qrRotationRevokesSessions:true,savedChoicesPreserved:true,actualCallItemService:true}));
} finally {await db.close();}
