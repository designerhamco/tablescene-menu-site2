import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {fileURLToPath} from "node:url";
import {ALIMTALK_BILLING_TERMS_VERSION} from "./alimtalk-billing-policy";
const owner="11111111-1111-4111-8111-111111111111",menu="22222222-2222-4222-8222-222222222222",requestId="33333333-3333-4333-8333-333333333333";
const fixture={isOwner:true,loggedIn:true,isAdmin:false,enabled:false,adminReads:0,adminClients:0,rpcError:null as string|null,calls:[] as {name:string;args:unknown}[]};
(globalThis as unknown as {__refundFixture:typeof fixture}).__refundFixture=fixture;
const bundle=await build({entryPoints:[fileURLToPath(new URL("./server/alimtalk-refund-service.ts",import.meta.url))],bundle:true,platform:"node",format:"esm",write:false,plugins:[{name:"isolated",setup(b){
  b.onResolve({filter:/^(server-only|.*supabase\/(admin|server)|.*menu-site-access-service|.*alimtalk-refund-worker)$/},a=>({path:a.path,namespace:"test"}));
  b.onLoad({filter:/.*/,namespace:"test"},a=>({contents:a.path==="server-only"?"export {};":a.path.endsWith("alimtalk-refund-worker")?"export async function alimtalkRefundExecutionEnabled(){return globalThis.__refundFixture.enabled;}":a.path.endsWith("menu-site-access-service")?`export async function requireMenuSitePermission(menu,permission){if(menu!==${JSON.stringify(menu)}||permission!=='menu.edit')throw new Error('wrong authorization scope');return {isOwner:globalThis.__refundFixture.isOwner,actorUserId:${JSON.stringify(owner)}}}`
    :a.path.endsWith("supabase/admin")?"export function createAdminClient(){const f=globalThis.__refundFixture;f.adminClients++;return {async rpc(name,args){f.calls.push({name,args});return {data:[],error:f.rpcError?{message:f.rpcError}:null}}}}"
    :`export async function createClient(){const f=globalThis.__refundFixture;return {auth:{async getUser(){return {data:{user:f.loggedIn?{id:${JSON.stringify(owner)}}:null}}}},from(table){if(table!=='admin_users')throw new Error('unauthorized table');f.adminReads++;const q={select(){return q},eq(key,value){if(key!=='user_id'||value!==${JSON.stringify(owner)})throw new Error('must check authenticated user');return q},async maybeSingle(){return {data:f.isAdmin?{user_id:${JSON.stringify(owner)}}:null,error:null}}};return q}}}` }));
}}]});
const {handleOwnerAlimtalkRefund,handleAccountAlimtalkRefund,requireAlimtalkRefundAdmin,approveAlimtalkRefund}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/alimtalk-refund-service");
function reset(){Object.assign(fixture,{isOwner:true,loggedIn:true,isAdmin:false,enabled:false,adminReads:0,adminClients:0,rpcError:null,calls:[]});}
test("staff cannot request or cancel an owner's pooled funds",async()=>{reset();fixture.isOwner=false;
  await assert.rejects(handleOwnerAlimtalkRefund(menu,{intent:"refund-request",requestId,amount:10000,termsVersion:ALIMTALK_BILLING_TERMS_VERSION}),/사장님만/);
  await assert.rejects(handleOwnerAlimtalkRefund(menu,{intent:"refund-cancel",requestId}),/사장님만/);assert.equal(fixture.adminClients,0);
});
test("refund request binds the authenticated owner, original menu, amount, idempotency ID and current terms",async()=>{reset();
  await handleOwnerAlimtalkRefund(menu,{intent:"refund-request",requestId,amount:9988,termsVersion:ALIMTALK_BILLING_TERMS_VERSION});
  assert.deepEqual(fixture.calls,[{name:"request_alimtalk_refund",args:{p_menu_id:menu,p_actor_id:owner,p_request_id:requestId,p_expected_balance:9988,p_terms_version:ALIMTALK_BILLING_TERMS_VERSION}}]);
});
test("refunds do not require a new purchase or an active subscription write",async()=>{reset();
  // Only the read/owner guard is provided in this isolated module; a write guard
  // dependency or purchase API call would fail this test.
  await handleOwnerAlimtalkRefund(menu,{intent:"refund-cancel",requestId});
  assert.deepEqual(fixture.calls,[{name:"cancel_alimtalk_refund",args:{p_actor_id:owner,p_request_id:requestId}}]);
});
test("stale policy and invalid amounts cannot reserve funds",async()=>{reset();
  for(const amount of [-1,0,NaN,Infinity,1000000001])await assert.rejects(handleOwnerAlimtalkRefund(menu,{intent:"refund-request",requestId,amount,termsVersion:ALIMTALK_BILLING_TERMS_VERSION}));
  await assert.rejects(handleOwnerAlimtalkRefund(menu,{intent:"refund-request",requestId,amount:10000,termsVersion:"old"}));assert.equal(fixture.calls.length,0);
});
test("held funds and stale quotes return actionable errors",async()=>{reset();
  fixture.rpcError="WALLET_REFUND_HELD";await assert.rejects(handleOwnerAlimtalkRefund(menu,{intent:"refund-request",requestId,amount:10000,termsVersion:ALIMTALK_BILLING_TERMS_VERSION}),/먼저 정산/);
  fixture.rpcError="WALLET_REFUND_STALE";await assert.rejects(handleOwnerAlimtalkRefund(menu,{intent:"refund-request",requestId,amount:10000,termsVersion:ALIMTALK_BILLING_TERMS_VERSION}),/잔액이 변경/);
});
test("anonymous callers cannot reach the refund administrator query",async()=>{reset();fixture.loggedIn=false;
  await assert.rejects(requireAlimtalkRefundAdmin(),/관리자 로그인/);assert.equal(fixture.adminReads,0);assert.equal(fixture.adminClients,0);
});
test("being a merchant owner does not grant refund administration rights",async()=>{reset();
  await assert.rejects(requireAlimtalkRefundAdmin(),/관리자 권한/);assert.equal(fixture.adminClients,0);assert.equal(fixture.adminReads,1);
});
test("administrator authorization uses a verified user and the admin table",async()=>{reset();fixture.isAdmin=true;
  assert.equal(await requireAlimtalkRefundAdmin(),owner);assert.equal(fixture.adminReads,1);
});
test("account refunds remain possible without an owned menu and always bind the authenticated account",async()=>{reset();fixture.isOwner=false;
  await handleAccountAlimtalkRefund({intent:"refund-request",requestId,amount:9988,termsVersion:ALIMTALK_BILLING_TERMS_VERSION});
  assert.deepEqual(fixture.calls,[{name:"request_alimtalk_refund",args:{p_menu_id:null,p_actor_id:owner,p_request_id:requestId,p_expected_balance:9988,p_terms_version:ALIMTALK_BILLING_TERMS_VERSION}}]);
});
test("anonymous account refund requests cannot reach financial data",async()=>{reset();fixture.loggedIn=false;
  await assert.rejects(handleAccountAlimtalkRefund({intent:"refund-cancel",requestId}),/로그인이 필요/);assert.equal(fixture.adminClients,0);assert.equal(fixture.calls.length,0);
});
test("refund approval requires a real administrator even if execution is enabled",async()=>{reset();fixture.enabled=true;await assert.rejects(approveAlimtalkRefund(requestId,9988),/관리자 권한/);assert.equal(fixture.calls.length,0);assert.equal(fixture.adminClients,0);});
test("administrator cannot approve while the execution gate is off",async()=>{reset();fixture.isAdmin=true;await assert.rejects(approveAlimtalkRefund(requestId,9988),/PG 계약/);assert.equal(fixture.calls.length,0);});
test("approval binds authenticated admin and exact amount, without accepting a caller-supplied actor",async()=>{reset();fixture.isAdmin=true;fixture.enabled=true;await approveAlimtalkRefund(requestId,9988);assert.deepEqual(fixture.calls,[{name:"approve_alimtalk_refund",args:{p_admin_id:owner,p_request_id:requestId,p_expected_remaining:9988}}]);});
test("invalid approval amounts never reach the database",async()=>{reset();fixture.isAdmin=true;fixture.enabled=true;for(const amount of [NaN,0,-1,1.5,1_000_000_001])await assert.rejects(approveAlimtalkRefund(requestId,amount));assert.equal(fixture.calls.length,0);});
