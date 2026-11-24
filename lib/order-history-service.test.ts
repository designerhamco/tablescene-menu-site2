import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
import { getOrderListGroups } from "./order-management-list";
import * as management from "./order-management";
import * as history from "./order-history-query";
import * as kitchen from "./kitchen-order";
const site="11111111-1111-4111-8111-111111111111",table="22222222-2222-4222-8222-222222222222";
const uuid=(n:number)=>`33333333-3333-4333-8333-${String(n).padStart(12,"0")}`;
function row(n:number,status="received",payment="unpaid",served_at:string|null=null,payment_completed_at:string|null=null) {return{id:uuid(n),menu_site_id:site,menu_table_id:table,order_number:n,status,served_at,payment_status:payment,payment_completed_at,created_at:`2020-01-${String(1+Math.floor((n-1)/24)).padStart(2,"0")}T${String((n-1)%24).padStart(2,"0")}:00:00.000000+00:00`,updated_at:"2020-01-01T00:00:00Z",total_amount:1000,currency:"KRW"};}
function fixture(rows:ReturnType<typeof row>[],options:{denied?:boolean;enabled?:boolean;fail?:boolean;items?:number;optionsPerItem?:number;doneItems?:number;menuSources?:unknown[]}={}){
 const calls:{table:string;filters:Record<string,unknown>;or?:string;columns?:string}[]=[];let gates=0;
 const itemRows=Array.from({length:options.items??0},(_,i)=>({id:uuid(i+5000),order_id:rows[0]?.id,menu_site_id:site,item_name_snapshot:`상품 ${i}`,base_price_snapshot:1000,option_price_snapshot:0,unit_price_snapshot:1000,quantity:1,line_total_snapshot:1000,display_order:i,cooking_completed_at:i<(options.doneItems??0)?"2020-01-01T00:00:00Z":null,menu_item:options.menuSources?.[i]}));
 const optionRows=itemRows.flatMap((item,i)=>Array.from({length:options.optionsPerItem??0},(_,j)=>({id:uuid(10000+i*10+j),menu_site_id:site,order_item_id:item.id,group_name_snapshot:"옵션",value_name_snapshot:`값 ${j}`,price_delta_snapshot:0,display_order:j})));
 const db={from(name:string){const filters:Record<string,unknown>={},orders:{key:string;ascending:boolean}[]=[];let or="",limit=Infinity,offset=0,count=false,columns="";
 const query={select(projection:string,args?:{count?:string}){columns=projection;count=Boolean(args?.count);return query;},eq(key:string,value:unknown){filters[key]=value;return query;},neq(key:string,value:unknown){filters[`neq:${key}`]=value;return query;},in(key:string,value:unknown){filters[`in:${key}`]=value;return query;},gte(key:string,value:unknown){filters[`gte:${key}`]=value;return query;},lte(key:string,value:unknown){filters[`lte:${key}`]=value;return query;},lt(key:string,value:unknown){filters[`lt:${key}`]=value;return query;},or(value:string){or=value;return query;},order(key:string,value:{ascending:boolean}){orders.push({key,ascending:value.ascending});return query;},limit(value:number){limit=value;return query;},range(from:number,to:number){offset=from;limit=to-from+1;return query;},async maybeSingle(){calls.push({table:name,filters});assert.equal(name,"menu_sites");return{data:{id:site,name:"예시"},error:null};},then(resolve:(value:unknown)=>void){
  calls.push({table:name,filters,or,columns});assert.equal(filters.menu_site_id,site);
  let result:Record<string,unknown>[]= name==="menu_customer_orders"?rows:name==="menu_customer_order_items"?itemRows:name==="menu_customer_order_item_options"?optionRows:[{id:table,label:"테이블 1",point_kind:"table",status:"archived",menu_site_id:site}];
  result=result.filter(item=>Object.entries(filters).every(([key,value])=>{const [op,field]=key.includes(":")?key.split(":"):["eq",key];const actual=item[field];return op==="neq"?actual!==value:op==="in"?(value as unknown[]).includes(actual):op==="gte"?String(actual)>=String(value):op==="lte"?String(actual)<=String(value):op==="lt"?String(actual)<String(value):actual===value;}));
  const hallCompletion = or.match(/and\(status\.eq\.served,payment_status\.in\.\(([^)]+)\),served_at\.lte\.([^,]+),payment_completed_at\.lte\.([^,]+),or\(served_at\.gte\.([^,]+),payment_completed_at\.gte\.([^)]+)\)\)/);
  if(or.includes("status.neq.served"))result=result.filter(item=>{
    if(item.status!=="served"||item.payment_status==="unpaid")return true;
    if (!hallCompletion || !hallCompletion[1].split(",").includes(String(item.payment_status))) return false;
    const served = Date.parse(String(item.served_at)), paid = Date.parse(String(item.payment_completed_at));
    return served <= Date.parse(hallCompletion[2]) && paid <= Date.parse(hallCompletion[3])
      && (served >= Date.parse(hallCompletion[4]) || paid >= Date.parse(hallCompletion[5]));
  });
  const kitchenScope=or.match(/status\.in\.\(([^)]+)\),and\(status\.eq\.served,served_at\.gte\.([^,]+),served_at\.lte\.([^)]+)\)/);
  if(kitchenScope)result=result.filter(item=>kitchenScope[1].split(",").includes(String(item.status))||
    (item.status==="served"&&typeof item.served_at==="string"&&Date.parse(item.served_at)>=Date.parse(kitchenScope[2])&&Date.parse(item.served_at)<=Date.parse(kitchenScope[3])));
  const cursor=or.match(/created_at\.(gt|lt)\.([^,()]+),and\(created_at\.eq\.([^,()]+),id\.(gt|lt)\.([^,()]+)/);
  if(cursor)result=result.filter(item=>cursor[1]==="gt"?String(item.created_at)>cursor[2]||(item.created_at===cursor[2]&&String(item.id)>cursor[5]):String(item.created_at)<cursor[2]||(item.created_at===cursor[2]&&String(item.id)<cursor[5]));
  result.sort((a,b)=>{for(const order of orders){const compared=String(a[order.key]).localeCompare(String(b[order.key]));if(compared)return order.ascending?compared:-compared;}return 0;});
  resolve({data:result.slice(offset,offset+limit),count:count?result.length:null,error:options.fail&&name==="menu_customer_orders"?{code:"failure"}:null});
 }};return query;}};
 const dependencies:Record<string,unknown>={"server-only":{},"@/lib/order-history-query":history,"@/lib/kitchen-order":kitchen,"@/lib/order-management":management,"@/lib/server/table-operations-eligibility-service":{hasPaidTableOperationsAccess:async()=>options.enabled!==false},"@/lib/order-dashboard-runtime":{isOrderDashboardRuntimeEnabledForSite:()=>true},"@/lib/menu-site-permissions":{hasMenuSitePermission:()=>false},"@/lib/server/menu-site-access-service":{requireMenuSitePermission:async(id:string,permission:string)=>{gates++;assert.equal(id,site);assert.equal(permission,"order.read");if(options.denied)throw new Error("denied");return{};},requireMenuSiteWriteAccess:async()=>{throw new Error("not used");}},"@/lib/supabase/admin":{createAdminClient:()=>db}};
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
test("홀 리스트는 한국시간 오늘 마지막 처리까지 완료된 주문만 현재 주문과 함께 읽을 수 있다", async () => {
  const today = history.orderHistoryBounds(history.defaultOrderHistoryFilters()).from;
  const yesterday = new Date(Date.parse(today) - 1).toISOString();
  const future = new Date(Date.now() + 60_000).toISOString();
  const f = fixture([
    row(1, "served", "manual_paid", yesterday, today), // Previous-day handoff, paid today.
    row(2, "served", "paid", today, yesterday), // Prepaid yesterday, handed off today.
    row(3, "served", "paid", yesterday, yesterday),
    row(4, "served", "unpaid", yesterday),
    row(5, "cooking", "paid", null, yesterday),
    row(6, "served", "refunded", today, today),
    row(7, "served", "manual_paid", today, null),
    row(8, "served", "paid", today, future),
  ]);
  const flags = { includeTableDetail: true, includeCompletedToday: true };
  const { orders, view } = await f.service.listOrderDashboard(site, {}, "hall", flags);
  assert.deepEqual(orders.map(order => order.orderNumber), [1, 2, 4, 5]);
  assert.equal(view?.totalCount, 2);
  const filters = { query: "", searchField: "number" as const, status: "all" as const, oldestFirst: true, menus: null };
  const groups = getOrderListGroups(orders, { ...filters, payments: null });
  assert.deepEqual(groups.map(group => group.orders.map(row => row.order.orderNumber)), [[1], [2], [4, 5]]);
  const paidGroups = getOrderListGroups(orders, { ...filters, payments: new Set(["completed"]) });
  assert.deepEqual(paidGroups.flatMap(group => group.orders.map(row => row.order.orderNumber)), [1, 2, 5]);
  assert.ok(orders.slice(0, 2).every(order => !order.nextStatus && !order.canMarkManualPayment && !order.canCancelUnpaid));
  const ordinary = await f.service.listOrderDashboard(site);
  assert.deepEqual(ordinary.orders.map(order => order.orderNumber), [4, 5]);
  const kitchenOrders = await f.service.listOrderDashboard(site, {}, "kitchen", flags);
  assert.deepEqual(kitchenOrders.orders.map(order => order.orderNumber), [2, 5, 6, 7, 8]);
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

test("주방에 조리 대상만 표시하고 모든 메뉴를 체크한 주문만 완료할 수 있다", async () => {
  const orders = [row(1, "cooking"), row(2, "received"), row(3, "accepted"), row(4, "ready"), row(5, "served"), row(6, "cancelled")];
  for (const doneItems of [0, 1, 2]) {
    const { service } = fixture(orders, { items: 2, optionsPerItem: 1, doneItems });
    const data = await service.listKitchenDashboard(site);
    assert.deepEqual(data.orders.map(order => kitchen.getKitchenStage(order.status)), ["cooking", "before", "before", "ready"]);
    assert.equal(kitchen.canFinishKitchenOrder(data.orders[0]), doneItems === 2);
    assert.equal(kitchen.canFinishKitchenOrder({ status: "cooking", items: [] }), false);
    assert.deepEqual(data.orders[0].items[0].options, [{ groupName: "옵션", valueName: "값 0", kind: "price" }]);
  }
  const hall = await fixture(orders).service.listOrderDashboard(site);
  assert.equal(hall.orders.find(order => order.status === "cooking")?.nextStatus, null);
  assert.equal(hall.orders.find(order => order.status === "ready")?.nextStatus, "served");
});

test("주방은 한국시간 오늘 서빙한 주문과 이전 조리 대상 주문을 함께 읽는다", async () => {
  const lastDay = new Date(Date.now() - 86_400_000);
  const { orders } = await fixture([
    row(1, "received"),
    row(2, "served", "paid", new Date().toISOString()),
    row(3, "served", "paid", lastDay.toISOString()),
    row(4, "ready"),
  ], { items: 1 }).service.listKitchenDashboard(site);
  assert.deepEqual(orders.map(order => [order.orderNumber, kitchen.getKitchenStage(order.status)]), [[1, "before"], [2, "ready"], [4, "ready"]]);
  assert.equal(kitchen.canChangeKitchenStage(orders[1], "return"), false);
});

test("주방은 상품 선택과 직접 입력을 같은 칸에 넣고 가격 옵션을 별도 표시한다", () => {
  assert.deepEqual(kitchen.getKitchenOptionLabels([
    { groupName: "가격 옵션", valueName: "세트", kind: "price" },
    { groupName: "상품 옵션", valueName: "레몬 에이드", kind: "product" },
    { groupName: "상품 요청", valueName: "얼음 적게", kind: "request" },
  ]), { product: "레몬 에이드(얼음 적게)", price: "세트" });
  assert.deepEqual(kitchen.getKitchenOptionLabels([
    { groupName: "상품 요청", valueName: "얼음 적게", kind: "request" },
  ]), { product: "(얼음 적게)", price: "" });
  assert.deepEqual(kitchen.getKitchenOptionLabels([
    { groupName: "상품 옵션", valueName: "덜 맵게", kind: "product" },
  ]), { product: "덜 맵게", price: "" });
});

test("주문 테이블 팝업에 조리 완료 여부와 상품옵션 형식을 전달한다", async () => {
  const f = fixture([row(1, "cooking")], {
    items: 2, optionsPerItem: 22, doneItems: 1,
    menuSources: [
      { id: "same-item", menu_site_id: site, price_note: "ICE ONLY" },
      { id: "other-item", menu_site_id: "other-site", price_note: "다른 메뉴판 문구" },
    ],
  });
  const { orders } = await f.service.listOrderDashboard(site, {}, "hall", { includeTableDetail: true });
  const [first, second] = orders[0].items;
  assert.equal(first.cookingDone, true);
  assert.equal(second.cookingDone, false);
  assert.equal(first.priceNote, "ICE ONLY");
  assert.equal(second.priceNote, undefined);
  assert.equal(first.options.find(option => option.valueName === "값 20")?.kind, "product");
  assert.equal(first.options.find(option => option.valueName === "값 21")?.kind, "request");
  assert.match(f.calls.find(call => call.table === "menu_customer_order_items")!.columns!, /cooking_completed_at.*price_note/);
});

test("주방 메뉴 필터는 메뉴판의 등록 순서를 쓰고 연결이 끊긴 기존 주문도 조회한다", async () => {
  const category = (id: string, name: string, sort_order: number, menu_site_id = site) =>
    ({ id, name, sort_order, menu_site_id });
  const source = (id: string, sort_order: number, group: ReturnType<typeof category>, menu_site_id = site) =>
    ({ id, sort_order, category: group, menu_site_id });
  const fixtureData = fixture([row(1, "cooking")], {
    items: 5,
    menuSources: [
      source("drink", 0, category("beverage", "Beverage", 2)),
      source("main-2", 2, category("main", "Main", 0)),
      source("main-1", 1, category("main", "Main", 0)),
      source("foreign-item", 0, category("foreign", "Foreign", 0), "other-site"),
      source("same-site", 0, category("foreign", "Foreign", 0, "other-site")),
    ],
  });
  const { orders } = await fixtureData.service.listKitchenDashboard(site);
  const groups = kitchen.getKitchenMenuGroups(orders);
  assert.deepEqual(groups.map(group => group.name), ["Main", "Beverage", "분류 없음"]);
  assert.deepEqual(groups[0].items.map(item => item.key), ["menu:main-1", "menu:main-2"]);
  assert.deepEqual(groups[2].items.map(item => item.key), ["menu:same-site", "name:상품 3"]);
  assert.match(fixtureData.calls.find(call => call.table === "menu_customer_order_items")!.columns!, /menu_item:menu_items!.*category:menu_categories!/);
  const hall = await fixtureData.service.listOrderDashboard(site);
  assert.ok(hall.orders[0].items.every(item => item.menuSource === undefined));
  assert.doesNotMatch(fixtureData.calls.filter(call => call.table === "menu_customer_order_items").at(-1)!.columns!, /menu_item:/);
});

test("결합 주문은 테이블을 넘어 한 묶음으로 정렬하고 나중에 들어온 주문은 독립적으로 표시한다", async () => {
  const { orders } = await fixture([row(1), row(2), row(3)]).service.listOrderDashboard(site);
  const combined = orders.map((order, index) => ({
    ...order,
    tableId: index === 2 ? uuid(500) : table,
    settlementGroupId: index === 1 ? undefined : uuid(501),
    createdAt: `2026-11-01T00:00:0${index}+00:00`,
  }));
  const options = { query: "", searchField: "number" as const, status: "all" as const, menus: null, payments: null };
  const groupNumbers = (oldestFirst: boolean) => getOrderListGroups(combined, { ...options, oldestFirst })
    .map(group => group.orders.map(row => row.order.orderNumber));
  assert.deepEqual(groupNumbers(true), [[1, 3], [2]]);
  assert.deepEqual(groupNumbers(false), [[3, 1], [2]]);
});
