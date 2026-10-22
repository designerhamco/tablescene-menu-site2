import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {NextRequest} from 'next/server.js';
import {TABLE_VISIT_SESSION_COOKIE} from '../lib/table-qr-session-tokens.ts';
const {PGlite}=await import(process.env.PGLITE_TEST_MODULE || '/private/tmp/artimenu-order-db-test/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite(), site=crypto.randomUUID(), table=crypto.randomUUID(), visit=crypto.randomUUID(), call=crypto.randomUUID();
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
try {
 await db.exec('create table menu_sites(id uuid primary key,template_key text,settings jsonb);create table menu_customer_calls(id uuid primary key,menu_site_id uuid,menu_table_id uuid,table_visit_session_id uuid,status text,request_label text,acknowledged_by uuid)');
 await db.query('insert into menu_sites values($1,$2,$3)',[site,'cafe_design_a',JSON.stringify({order:{callEnabled:true}})]);
 // Use the saved table_order settings shape.
 const settings=callEnabled=>JSON.stringify({table_order:{callEnabled}});
 await db.query('update menu_sites set settings=$1 where id=$2',[settings(true),site]);
 await db.query('insert into menu_customer_calls values($1,$2,$3,$4,$5,$6,$7)',[call,site,table,visit,'pending','Private request',crypto.randomUUID()]);
 const bundle='/private/tmp/customer-call-status-qa.mjs';
 await build({entryPoints:['app/api/public-menu/calls/route.ts'],outfile:bundle,bundle:true,platform:'node',format:'esm',tsconfig:'tsconfig.json',logLevel:'silent',plugins:[{name:'isolated-call-transport',setup(b){
  b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export {};'}));
  b.onResolve({filter:/^next\/server$/},()=>({path:process.cwd()+'/node_modules/next/server.js',external:true}));
  b.onResolve({filter:/supabase\/admin$/},()=>({path:'admin',namespace:'qa-db'}));b.onLoad({filter:/.*/,namespace:'qa-db'},()=>({contents:'export const createAdminClient=()=>globalThis.__callStatusAdmin;'}));
  b.onResolve({filter:/menu-site-access-service$/},()=>({path:'access',namespace:'qa-access'}));b.onLoad({filter:/.*/,namespace:'qa-access'},()=>({contents:'export const getMenuSiteAccessStateForMenuSite=async()=>globalThis.__callStatusAccess;'}));
  b.onResolve({filter:/table-visit-session-service$/},()=>({path:'visit',namespace:'qa-visit'}));b.onLoad({filter:/.*/,namespace:'qa-visit'},()=>({contents:'export const resolveTableVisitSession=async input=>globalThis.__callStatusResolve(input);'}));
  b.onResolve({filter:/call-runtime$/},()=>({path:'runtime',namespace:'qa-runtime'}));b.onLoad({filter:/.*/,namespace:'qa-runtime'},()=>({contents:'export const isCallRuntimeEnabledForSite=()=>globalThis.__callStatusRuntime;'}));
 }}]});
 globalThis.__callStatusRuntime=true;globalThis.__callStatusAccess={canViewPublic:true,planType:'business_basic'};
 let transportFailure=false, reads=0;
 globalThis.__callStatusAdmin={from(name){let fields,filters=[];const chain={select(value){fields=value;return chain;},eq(key,value){filters.push([key,value]);return chain;},async maybeSingle(){reads++;if(transportFailure)return {error:{message:'private backend detail'},data:null};const columns=fields.split(',');for(const key of columns)assert.match(key,/^[a-z_]+$/);for(const [key]of filters)assert.match(key,/^[a-z_]+$/);const result=await db.query(`select ${fields} from ${name} where ${filters.map(([key],i)=>key+'=$'+(i+1)).join(' and ')}`,filters.map(([,value])=>value));return {data:result.rows[0]??null,error:null};}};return chain;}};
 let session={id:visit,menuSiteId:site,menuTableId:table,tableLabel:'QA',expiresAt:'2099-01-01T00:00:00Z'};
 globalThis.__callStatusResolve=({expectedMenuSiteId,sessionToken})=>sessionToken==='verified'&&session?.menuSiteId===expectedMenuSiteId?session:null;
 const api=await import('file://'+bundle);
 const request=(sid=site,cid=call,token='verified')=>new NextRequest('https://menu.test/api/public-menu/calls?'+new URLSearchParams({menuSiteId:sid,callId:cid}),{headers:{cookie:TABLE_VISIT_SESSION_COOKIE+'='+token}});
 for(const status of ['pending','acknowledged','completed','cancelled']){
  await db.query('update menu_customer_calls set status=$1 where id=$2',[status,call]);const res=await api.GET(request());check(res.status,200);check(await res.json(),{ok:true,call:{callId:call,status}});check(res.headers.get('cache-control'),'no-store');check(res.headers.get('vary'),'Cookie');
 }
 for(const key of ['id','menuSiteId','menuTableId']){const original=session;session={...session,[key]:crypto.randomUUID()};if(key==='menuSiteId')await db.query('insert into menu_sites values($1,$2,$3)',[session.menuSiteId,'cafe_design_a',JSON.stringify({table_order:{callEnabled:true}})]);check((await api.GET(request(session.menuSiteId))).status,404);session=original;}
 check((await api.GET(request(site,crypto.randomUUID()))).status,404);
 check((await api.GET(request(site,call,'expired'))).status,401);
 check((await api.GET(request('invalid'))).status,400);check((await api.GET(request(site,'invalid'))).status,400);
 globalThis.__callStatusRuntime=false;check((await api.GET(request())).status,409);globalThis.__callStatusRuntime=true;
 for(const access of [null,{canViewPublic:false,planType:'business_basic'},{canViewPublic:true,planType:'personal'}]){globalThis.__callStatusAccess=access;check((await api.GET(request())).status,409);}globalThis.__callStatusAccess={canViewPublic:true,planType:'business_basic'};
 await db.query('update menu_sites set settings=$1 where id=$2',[settings(false),site]);check((await api.GET(request())).status,409);
 await db.query('update menu_sites set settings=$1 where id=$2',[settings(true),site]);
 transportFailure=true;const failed=await api.GET(request());check(failed.status,409);check((await failed.text()).includes('private backend detail'),false);
 check((await db.query('select count(*)::int n from menu_customer_calls')).rows[0].n,1);assert.ok(reads>0);
 console.log(JSON.stringify({passed:checks,actualServiceAndRoute:true,isolatedDatabase:true,productionWrites:0}));
}finally{await db.close();}
