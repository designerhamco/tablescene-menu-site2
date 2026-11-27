import assert from "node:assert/strict";
import test,{type TestContext} from "node:test";
import {build} from "esbuild";
import {fileURLToPath} from "node:url";
const intent={payment_id:"original",owner_id:"owner",menu_site_id:"menu",amount:10000,store_id:"saved-original-store",channel_key:"saved-original-channel",state:"credited",credited_at:"2026-01-01T00:00:00Z"};
const fixture={db:null as unknown};(globalThis as unknown as {__refundWorker:typeof fixture}).__refundWorker=fixture;
const bundle=await build({entryPoints:[fileURLToPath(new URL("./server/alimtalk-refund-worker.ts",import.meta.url))],bundle:true,platform:"node",format:"esm",write:false,plugins:[{name:"isolated",setup(b){
  b.onResolve({filter:/^(server-only|.*supabase\/admin|.*lib\/portone)$/},a=>({path:a.path,namespace:"test"}));
  b.onLoad({filter:/.*/,namespace:"test"},a=>({contents:a.path==="server-only"?"export {};":a.path.endsWith("supabase/admin")?"export function createAdminClient(){return globalThis.__refundWorker.db}":"export const portOneStoreId='different-current-store',portOneChannelKey='different-current-channel';export function requirePortOneApiSecret(){return 'mock-secret'}"}));
}}]});
const {processAlimtalkRefundJobs}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/alimtalk-refund-worker");
function setup(t:TestContext,policyEnabled=true){
  const oldFetch=globalThis.fetch,oldFlag=process.env.ALIMTALK_REFUND_EXECUTION_ENABLED;
  t.after(()=>{globalThis.fetch=oldFetch;if(oldFlag===undefined)delete process.env.ALIMTALK_REFUND_EXECUTION_ENABLED;else process.env.ALIMTALK_REFUND_EXECUTION_ENABLED=oldFlag;});
  process.env.ALIMTALK_REFUND_EXECUTION_ENABLED="true";
  let cancelled=0,starts=0,posts=0,gets=0;
  const job={id:"11111111-1111-4111-8111-111111111111",refund_id:"refund",payment_id:"original",before_cancelled:0,target_cancelled:9988,state:"queued",submission_started_at:null as string|null};
  const writes:{state?:string;last_error_code?:string|null}[]=[],receipts:number[]=[];
  fixture.db={from(table:string){let update:typeof writes[number]|undefined;const q={select(){return q;},eq(){return q;},in(){return q;},or(){return q;},order(){return q;},limit(n:number){assert.equal(n,4);return q;},not(){return q;},is(){return q;},update(value:typeof writes[number]){update=value;return q;},
    async single(){return {error:null,data:table==="alimtalk_billing_policy"?{refund_execution_enabled:policyEnabled,pg_reviewed_at:"reviewed",approved_store_id:"approved-store",approved_channel_key:"approved-channel"}:intent};},
    then(resolve:(v:unknown)=>unknown){if(update){writes.push(update);Object.assign(job,update);return Promise.resolve(resolve({error:null,data:[]}));}return Promise.resolve(resolve({error:null,data:[{...job}]}));}};return q;},
    async rpc(name:string,args:Record<string,unknown>){if(name==="start_alimtalk_refund_job"){starts++;assert.equal(args.p_verified_cancelled,0);if(job.submission_started_at)return {data:false,error:null};job.submission_started_at="2026-01-01T00:00:00Z";job.state="submitting";return {data:true,error:null};}assert.equal(name,"reconcile_alimtalk_refund");assert.equal(args.p_payment_id,"original");receipts.push(args.p_verified_cancelled as number);return {data:"expected",error:null};}};
  globalThis.fetch=async(url,options)=>{
    assert.equal((options?.headers as Record<string,string>).Authorization,"PortOne mock-secret");
    if(options?.method==="POST"){
      posts++;assert.equal(String(url),"https://api.portone.io/payments/original/cancel");
      assert.deepEqual(JSON.parse(options.body as string),{storeId:intent.store_id,amount:9988,currentCancellableAmount:10000,reason:"아티메뉴 알림톡 미사용 충전금 환불",requester:"ADMIN"});
      assert.equal((options.headers as Record<string,string>)["Idempotency-Key"],`"alimtalk-refund-${job.id}"`);cancelled=9988;return Response.json({cancellation:{status:"SUCCEEDED"}});
    }
    gets++;assert.equal(String(url),`https://api.portone.io/payments/original?storeId=${intent.store_id}`);
    return Response.json({id:"original",storeId:intent.store_id,channel:{key:intent.channel_key,type:"LIVE"},currency:"KRW",status:cancelled?"PARTIAL_CANCELLED":"PAID",method:{type:"PaymentMethodCard"},amount:{total:10000,paid:10000,cancelled},customData:{purpose:"alimtalk_topup",owner_id:"owner",menu_site_id:"menu"}});
  };
  return {job,writes,receipts,counters:()=>({starts,posts,gets})};
}
test("server refund flag OFF performs no database/provider work",async t=>{setup(t);fixture.db=null;delete process.env.ALIMTALK_REFUND_EXECUTION_ENABLED;assert.deepEqual(await processAlimtalkRefundJobs(),{processed:0});});
test("database refund gate OFF performs no provider request",async t=>{const f=setup(t,false);assert.deepEqual(await processAlimtalkRefundJobs(),{processed:0});assert.deepEqual(f.counters(),{starts:0,posts:0,gets:0});});
test("worker uses saved original store/channel even if current PG configuration changed",async t=>{const f=setup(t);assert.equal((await processAlimtalkRefundJobs("refund")).processed,1);assert.deepEqual(f.counters(),{starts:1,posts:1,gets:2});assert.deepEqual(f.receipts,[9988]);assert.equal(f.job.state,"completed");});
test("lost POST response is followed by receipt lookup, never an automatic retry",async t=>{const f=setup(t),real=globalThis.fetch;globalThis.fetch=async(url,options)=>{const r=await real(url,options);if(options?.method==="POST")throw new Error("response lost");return r;};await processAlimtalkRefundJobs();assert.equal(f.job.state,"completed");assert.equal(f.counters().posts,1);});
test("existing submitting jobs are GET-only and retain the held amount until a receipt arrives",async t=>{const f=setup(t);f.job.state="submitting";f.job.submission_started_at="2020-01-01T00:00:00Z";await processAlimtalkRefundJobs();assert.deepEqual(f.counters(),{starts:0,posts:0,gets:1});assert.equal(f.job.state,"pending");});
