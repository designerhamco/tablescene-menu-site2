import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
import * as management from "./order-management";
import * as history from "./order-history-query";
const site="11111111-1111-4111-8111-111111111111",table="22222222-2222-4222-8222-222222222222";
const uuid=(n:number)=>`33333333-3333-4333-8333-${String(n).padStart(12,"0")}`;
function row(n:number,status="received",payment="unpaid") {return{id:uuid(n),menu_site_id:site,menu_table_id:table,order_number:n,status,payment_status:payment,created_at:`2020-01-${String(1+Math.floor((n-1)/24)).padStart(2,"0")}T${String((n-1)%24).padStart(2,"0")}:00:00.000000+00:00`,updated_at:"2020-01-01T00:00:00Z",total_amount:1000,currency:"KRW"};}
function fixture(rows:ReturnType<typeof row>[],options:{denied?:boolean;enabled?:boolean;fail?:boolean;items?:number;optionsPerItem?:number}={}){
 const calls:{table:string;filters:Record<string,unknown>;or?:string}[]=[];let gates=0;
 const itemRows=Array.from({length:options.items??0},(_,i)=>({id:uuid(i+5000),order_id:rows[0]?.id,menu_site_id:site,item_name_snapshot:`상품 ${i}`,base_price_snapshot:1000,option_price_snapshot:0,unit_price_snapshot:1000,quantity:1,line_total_snapshot:1000,display_order:i}));
 const optionRows=itemRows.flatMap((item,i)=>Array.from({length:options.optionsPerItem??0},(_,j)=>({id:uuid(10000+i*10+j),menu_site_id:site,order_item_id:item.id,group_name_snapshot:"옵션",value_name_snapshot:`값 ${j}`,price_delta_snapshot:0,display_order:j})));
 const db={from(name:string){const filters:Record<string,unknown>={},orders:{key:string;ascending:boolean}[]=[];let or="",limit=Infinity,offset=0,count=false;
 const query={select(_columns:string,args?:{count?:string}){count=Boolean(args?.count);return query;},eq(key:string,value:unknown){filters[key]=value;return query;},neq(key:string,value:unknown){filters[`neq:${key}`]=value;return query;},in(key:string,value:unknown){filters[`in:${key}`]=value;return query;},gte(key:string,value:unknown){filters[`gte:${key}`]=value;return query;},lte(key:string,value:unknown){filters[`lte:${key}`]=value;return query;},lt(key:string,value:unknown){filters[`lt:${key}`]=value;return query;},or(value:string){or=value;return query;},order(key:string,value:{ascending:boolean}){orders.push({key,ascending:value.ascending});return query;},limit(value:number){limit=value;return query;},range(from:number,to:number){offset=from;limit=to-from+1;return query;},async maybeSingle(){calls.push({table:name,filters});assert.equal(name,"menu_sites");return{data:{id:site,name:"예시"},error:null};},then(resolve:(value:unknown)=>void){
  calls.push({table:name,filters,or});assert.equal(filters.menu_site_id,site);
  let result:Record<string,unknown>[]= name==="menu_customer_orders"?rows:name==="menu_customer_order_items"?itemRows:name==="menu_customer_order_item_options"?optionRows:[{id:table,label:"테이블 1",point_kind:"table",status:"archived",menu_site_id:site}];
  result=result.filter(item=>Object.entries(filters).every(([key,value])=>{const [op,field]=key.includes(":")?key.split(":"):["eq",key];const actual=item[field];return op==="neq"?actual!==value:op==="in"?(value as unknown[]).includes(actual):op==="gte"?String(actual)>=String(value):op==="lte"?String(actual)<=String(value):op==="lt"?String(actual)<String(value):actual===value;}));
  if(or.includes("status.neq.served"))result=result.filter(item=>item.status!=="served"||item.payment_status==="unpaid");
  const cursor=or.match(/created_at\.(gt|lt)\.([^,()]+),and\(created_at\.eq\.([^,()]+),id\.(gt|lt)\.([^,()]+)/);
  if(cursor)result=result.filter(item=>cursor[1]==="gt"?String(item.created_at)>cursor[2]||(item.created_at===cursor[2]&&String(item.id)>cursor[5]):String(item.created_at)<cursor[2]||(item.created_at===cursor[2]&&String(item.id)<cursor[5]));
  result.sort((a,b)=>{for(const order of orders){const compared=String(a[order.key]).localeCompare(String(b[order.key]));if(compared)return order.ascending?compared:-compared;}return 0;});
  resolve({data:result.slice(offset,offset+limit),count:count?result.length:null,error:options.fail&&name==="menu_customer_orders"?{code:"failure"}:null});
 }};return query;}};
 const dependencies:Record<string,unknown>={"server-only":{},"@/lib/order-history-query":history,"@/lib/order-management":management,"@/lib/server/table-operations-eligibility-service":{hasPaidTableOperationsAccess:async()=>options.enabled!==false},"@/lib/order-dashboard-runtime":{isOrderDashboardRuntimeEnabledForSite:()=>true},"@/lib/menu-site-permissions":{hasMenuSitePermission:()=>false},"@/lib/server/menu-site-access-service":{requireMenuSitePermission:async(id:string,permission:string)=>{gates++;assert.equal(id,site);assert.equal(permission,"order.read");if(options.denied)throw new Error("denied");return{};},requireMenuSiteWriteAccess:async()=>{throw new Error("not used");}},"@/lib/supabase/admin":{createAdminClient:()=>db}};
 const source=readFileSync(new URL("./server/order-management-service.ts",import.meta.url),"utf8"),loaded={exports:{}};
 new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)((name:string)=>{assert.ok(name in dependencies,name);return dependencies[name];},loaded,loaded.exports);
 return{service:loaded.exports as typeof import("./server/order-management-service"),calls,gates:()=>gates};
}
test("현재 주문은 100건 이후와 200건 배치를 넘는 오래된 주문도 빠짐없이 조회한다",async()=>{
 const rows=Array.from({length:205},(_,i)=>row(i+1));rows.push(row(206,"served","unpaid"),row(207,"served","paid"),row(208,"cancelled","unpaid"));
 const f=fixture(rows);const data=await f.service.listOrderDashboard(site);
 assert.equal(data.orders.length,206);assert.equal(data.orders[0].orderNumber,1);assert.equal(data.orders.at(-1)?.orderNumber,206);
 assert.equal(data.view?.totalCount,206);assert.equal(f.calls.filter(call=>call.table==="menu_customer_orders").length,2);assert.equal(f.gates(),1);
 assert.ok(f.calls.every(call=>call.table==="menu_sites"||call.filters.menu_site_id===site));
});
test("주문 이력은 기간·상태·테이블·번호 필터를 서버에서 적용하고 보관 항목 이력도 유지한다",async()=>{
 const f=fixture([row(1),row(2,"served","paid"),row(3,"cancelled","unpaid")]);
 const data=await f.service.listOrderDashboard(site,{tab:"history",from:"2020-01-01",to:"2020-01-02",status:"served",paymentStatus:"paid",tableId:table,orderNumber:"2"});
 assert.deepEqual(data.orders.map(order=>order.orderNumber),[2]);assert.equal(data.view?.totalCount,1);assert.equal(data.view?.tables[0].archived,true);
});
test("이력 페이지는 중복 없이 양방향 이동하며 전체 조건 건수를 유지한다",async()=>{
 const f=fixture(Array.from({length:75},(_,i)=>row(i+1,"served","paid"))),filters={tab:"history",from:"2020-01-01",to:"2020-01-10"};
 const first=await f.service.listOrderDashboard(site,filters);assert.equal(first.orders.length,50);assert.equal(first.view?.totalCount,75);assert.ok(first.view?.olderCursor);
 const second=await f.service.listOrderDashboard(site,{...filters,cursor:first.view.olderCursor!,direction:"older"});assert.equal(second.orders.length,25);assert.equal(second.view?.totalCount,75);assert.equal(second.view?.olderCursor,null);
 const ids=new Set(first.orders.map(order=>order.id));assert.ok(second.orders.every(order=>!ids.has(order.id)));
 const back=await f.service.listOrderDashboard(site,{...filters,cursor:second.view!.newerCursor!,direction:"newer"});assert.deepEqual(back.orders.map(order=>order.id),first.orders.map(order=>order.id));
});
test("잘못된 조회는 다른 조건으로 대신 실행하지 않고 권한·런타임 거부는 주문 읽기 전에 멈춘다",async()=>{
 const invalid=fixture([row(1)]);const data=await invalid.service.listOrderDashboard(site,{tab:"history",from:"2020-02-30"});assert.ok(data.view?.error);assert.equal(data.orders.length,0);assert.equal(invalid.calls.some(call=>call.table==="menu_customer_orders"),false);
 for(const options of [{denied:true},{enabled:false}]){const f=fixture([row(1)],options);await assert.rejects(f.service.listOrderDashboard(site));assert.equal(f.calls.length,0);}
 const failed=fixture([row(1)],{fail:true});await assert.rejects(failed.service.listOrderDashboard(site),/불러오지/);
});
test("상품·옵션 스냅샷은 기본 행 제한보다 많아도 빠짐없이 묶는다",async()=>{
 const f=fixture([row(1)],{items:600,optionsPerItem:6});const data=await f.service.listOrderDashboard(site);
 assert.equal(data.orders[0].items.length,600);assert.ok(data.orders[0].items.every(item=>item.options.length===6));
});


test("실제 Supabase 클라이언트의 조회 요청은 가짜 자격증명·격리 fetch로 범위와 복합 조건을 검증한다",async()=>{
 const {createClient}=await import("@supabase/supabase-js");let requests=0;
 const db=createClient("http://127.0.0.1:54321","example-only-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input)=>{
  requests++;const url=new URL(String(input));assert.equal(url.origin,"http://127.0.0.1:54321");assert.equal(url.searchParams.get("menu_site_id"),`eq.${site}`);
  assert.match(url.searchParams.get("or")??"",/status\.neq\.served/);assert.match(url.searchParams.get("or")??"",/id\.gt\./);
  return new Response("[]",{status:200,headers:{"content-type":"application/json","content-range":"*/0"}});
 }}});
 const cursor={createdAt:"2020-01-01T00:00:00.123456+00:00",id:uuid(1)};
 const result=await db.from("menu_customer_orders").select("id",{count:"exact"}).eq("menu_site_id",site).neq("status","cancelled").or(`and(or(status.neq.served,payment_status.eq.unpaid),or(${history.orderCursorPredicate(cursor,"newer")}))`).order("created_at",{ascending:true}).order("id",{ascending:true}).limit(200);
 assert.equal(result.error,null);assert.equal(requests,1);assert.equal(result.count,0);
});
