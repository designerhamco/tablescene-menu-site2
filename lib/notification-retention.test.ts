import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

function load(file: string, dependencies: Record<string, unknown>) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return loaded.exports as Record<string, (...args: unknown[]) => Promise<unknown>>;
}

test("발송 기록 조회는 삭제된 본문 없이도 중복을 찾고 동일한 대상 범위를 유지한다", async () => {
  const queries: string[] = [], filters: unknown[] = [];
  const client = { from(table: string) { queries.push(table);return {
    select() { return this; }, eq(key: string,value: unknown) { filters.push([key,value]);return this; },
    is(key: string,value: unknown) { filters.push([key,value]);return this; },
    limit(value: number) { assert.equal(value,1);return this; },
    maybeSingle: async () => ({ data: { id:"archived-event" }, error:null }),
  };} };
  const {findNotificationDeliveryKey} = load("lib/server/notification-delivery-key.ts",{"server-only":{}});
  assert.deepEqual(await findNotificationDeliveryKey(client,{userId:"owner",eventType:"payment_paid",channel:"in_app",periodKey:"paid:1",menuSiteId:null,subscriptionId:"sub-1"}),{id:"archived-event"});
  assert.deepEqual(queries,["notification_delivery_keys"]);
  assert.deepEqual(filters,[["user_id","owner"],["event_type","payment_paid"],["channel","in_app"],["menu_site_id",null],["subscription_id","sub-1"],["period_key","paid:1"]]);
});

test("마이그레이션 전에는 기존 기록으로 대체하되 권한/조회 오류에서는 재발송하지 않는다", async () => {
  for (const code of ["42P01","PGRST205","42501","XX000"]) {
    const tables: string[]=[];
    const client={from(table: string) {tables.push(table);return {
      select(){return this;},eq(){return this;},limit(){return this;},contains(){return this;},
      maybeSingle:async()=>table==="notification_delivery_keys"?{data:null,error:{code,message:"test"}}:{data:{id:"legacy"},error:null},
    };}};
    const {findNotificationDeliveryKey}=load("lib/server/notification-delivery-key.ts",{"server-only":{}});
    const call=()=>findNotificationDeliveryKey(client,{userId:"owner",eventType:"payment_paid",channel:"email",periodKey:"key"});
    if (["42P01","PGRST205"].includes(code)) {assert.deepEqual(await call(),{id:"legacy"});assert.equal(tables.length,2);}
    else {await assert.rejects(call,/NOTIFICATION_DELIVERY_LOOKUP_FAILED/);assert.equal(tables.length,1);}
  }
});

test("인앱 알림은 본문 정리 후 중복을 생략하고 동시에 생성된 키 충돌도 성공적인 생략으로 처리한다", async () => {
  for (const race of [false,true]) {
    let lookup=0,inserts=0;
    const {createInAppNotificationOnce}=load("lib/server/in-app-notification-service.ts",{
      "server-only":{},"@/lib/supabase/admin":{createAdminClient:()=>({from(){return {insert(){inserts++;return this;},select(){return this;},single:async()=>({data:null,error:{code:"23505",message:"duplicate"}})};}})},
      "@/lib/server/notification-delivery-key":{findNotificationDeliveryKey:async()=>{lookup++;return race&&lookup===1?null:{id:"retained-key"};}},
    });
    assert.deepEqual(await createInAppNotificationOnce({userId:"owner",eventType:"payment_paid",title:"title",message:"message",href:"/mypage",periodKey:"key"}),{ok:true,skipped:true,id:"retained-key"});
    assert.equal(inserts,race?1:0);
  }
});

test("보관 cron은 인증을 강제하고 기본 모의실행·명시 활성화·강제 모의실행을 구분한다", async () => {
  const originalSecret=process.env.CRON_SECRET,originalEnabled=process.env.ENABLE_NOTIFICATION_RETENTION_EXECUTE;
  let clients=0;const modes: boolean[]=[];
  const {GET}=load("app/api/cron/prune-notifications/route.ts",{
    "next/server":{NextResponse},"node:crypto":{timingSafeEqual},
    "@/lib/supabase/admin":{createAdminClient(){clients++;return {}; }},
    "@/lib/server/notification-retention-service":{pruneNotificationContent:async(_client: unknown,execute: boolean)=>{modes.push(execute);return {dryRun:!execute,deleted:execute?1:0};}},
  });
  const call=(auth="Bearer secret",query="")=>GET(new NextRequest(`https://site.test/api/cron/prune-notifications${query}`,{headers:{authorization:auth}})) as Promise<Response>;
  try {
    delete process.env.CRON_SECRET;assert.equal((await call()).status,503);
    process.env.CRON_SECRET="secret";
    assert.equal((await call("Bearer invalid")).status,401);assert.equal(clients,0);
    delete process.env.ENABLE_NOTIFICATION_RETENTION_EXECUTE;assert.equal((await (await call()).json()).dryRun,true);
    process.env.ENABLE_NOTIFICATION_RETENTION_EXECUTE="true";assert.equal((await (await call()).json()).dryRun,false);
    assert.equal((await (await call("Bearer secret","?dryRun=true")).json()).dryRun,true);
    assert.deepEqual(modes,[false,true,false]);
  } finally {
    if(originalSecret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=originalSecret;
    if(originalEnabled===undefined)delete process.env.ENABLE_NOTIFICATION_RETENTION_EXECUTE;else process.env.ENABLE_NOTIFICATION_RETENTION_EXECUTE=originalEnabled;
  }
});

test("보관 서비스는 고정된 제한으로 RPC를 호출하고 DB 오류/잘못된 응답을 성공으로 취급하지 않는다",async()=>{
  const {pruneNotificationContent}=load("lib/server/notification-retention-service.ts",{"server-only":{}});
  let calls=0;
  const client={rpc:async(name: string,args: unknown)=>{assert.equal(name,"prune_notification_content");assert.deepEqual(args,{p_execute:false,p_batch_limit:100});calls++;return {data:{dryRun:true,deleted:0},error:null};}};
  assert.deepEqual(await pruneNotificationContent(client),{dryRun:true,deleted:0});assert.equal(calls,1);
  await assert.rejects(()=>pruneNotificationContent({rpc:async()=>({data:null,error:{code:"PGRST202"}})}),/NOTIFICATION_RETENTION_FAILED/);
  await assert.rejects(()=>pruneNotificationContent({rpc:async()=>({data:{dryRun:false,deleted:1},error:null})}),/INVALID_NOTIFICATION_RETENTION_RESULT/);
});
