import assert from "node:assert/strict";
import test from "node:test";
import {executeAlimtalkRefundJob,type RefundExecutionDependencies,type RefundJob} from "./server/alimtalk-refund-execution";
import type {AlimtalkPayment} from "./server/alimtalk-payment-verification";
const intent={payment_id:"original",owner_id:"owner",menu_site_id:"menu",amount:10000,store_id:"original-store",channel_key:"original-channel"};
const job:RefundJob={id:"11111111-1111-4111-8111-111111111111",refund_id:"refund",payment_id:"original",before_cancelled:0,target_cancelled:9988,state:"queued",submission_started_at:null};
const payment=(cancelled=0):AlimtalkPayment=>({id:intent.payment_id,storeId:intent.store_id,channel:{key:intent.channel_key,type:"LIVE"},currency:"KRW",status:cancelled?"PARTIAL_CANCELLED":"PAID",method:{type:"PaymentMethodCard"},amount:{total:10000,paid:10000,cancelled},customData:{purpose:"alimtalk_topup",owner_id:"owner",menu_site_id:"menu"}});
function setup() {
  const calls:{effect:string;value?:unknown}[]=[],statuses:unknown[]=[];
  let claimed=false,cancelled=0;
  const deps:RefundExecutionDependencies={enabled:async()=>true,read:async()=>{calls.push({effect:"read"});return payment(cancelled);},
    start:async()=>{calls.push({effect:"start"});if(claimed)return false;claimed=true;return true;},
    cancel:async value=>{calls.push({effect:"cancel",value});cancelled=9988;},
    settle:async value=>{calls.push({effect:"settle",value});return "expected";},save:async(state,code)=>{statuses.push({state,code});}};
  return {calls,statuses,deps};
}
test("off gate has no provider reads, submission claims or ledger writes",async()=>{const f=setup();f.deps.enabled=async()=>false;await executeAlimtalkRefundJob(job,intent,f.deps);assert.equal(f.calls.length,0);assert.equal(f.statuses.length,0);});
test("approval cancels exact unused amount with a fixed quoted idempotency key, then verifies fresh receipt",async()=>{
  const f=setup();await executeAlimtalkRefundJob(job,intent,f.deps);
  assert.deepEqual(f.calls.map(c=>c.effect),["read","start","cancel","read","settle"]);
  assert.deepEqual(f.calls[2].value,{amount:9988,currentCancellableAmount:10000,idempotencyKey:`"alimtalk-refund-${job.id}"`});assert.deepEqual(f.statuses,[{state:"completed",code:null}]);
});
test("a partially refunded original only cancels its fixed remaining allocation",async()=>{
  const f=setup();let c=1000;f.deps.read=async()=>payment(c);f.deps.cancel=async input=>{assert.equal(input.amount,8988);assert.equal(input.currentCancellableAmount,9000);c=9988;};
  await executeAlimtalkRefundJob({...job,before_cancelled:1000},intent,f.deps);assert.deepEqual(f.statuses,[{state:"completed",code:null}]);
});
test("two concurrent workers can submit only one cancellation",async()=>{const f=setup();await Promise.all([executeAlimtalkRefundJob(job,intent,f.deps),executeAlimtalkRefundJob(job,intent,f.deps)]);assert.equal(f.calls.filter(c=>c.effect==="cancel").length,1);});
for(const [name,mutate] of [
  ["TEST channel",(p:AlimtalkPayment)=>({...p,channel:{key:intent.channel_key,type:"TEST"}})],
  ["wrong owner",(p:AlimtalkPayment)=>({...p,customData:{purpose:"alimtalk_topup",owner_id:"other",menu_site_id:"menu"}})],
  ["wrong store",(p:AlimtalkPayment)=>({...p,storeId:"current-environment-store"})],
  ["wrong channel",(p:AlimtalkPayment)=>({...p,channel:{key:"different",type:"LIVE"}})],
  ["wrong amount",(p:AlimtalkPayment)=>({...p,amount:{total:9000,paid:9000,cancelled:0}})],
  ["virtual account",(p:AlimtalkPayment)=>({...p,method:{type:"PaymentMethodVirtualAccount"}})],
  ["unpaid",(p:AlimtalkPayment)=>({...p,status:"READY"})],
  ["invalid cancellation",(p:AlimtalkPayment)=>({...p,amount:{total:10000,paid:10000,cancelled:10001}})],
] as const)test(`${name} is blocked before submission`,async()=>{const f=setup();f.deps.read=async()=>mutate(payment());await executeAlimtalkRefundJob(job,intent,f.deps);assert.equal(f.calls.length,0);assert.deepEqual(f.statuses,[{state:"review",code:"PAYMENT_VERIFICATION_FAILED"}]);});
test("existing provider cancellation requests cannot race another POST",async()=>{const f=setup();f.deps.read=async()=>({...payment(),cancellations:[{status:"REQUESTED"}]});await executeAlimtalkRefundJob(job,intent,f.deps);assert.equal(f.calls.length,0);assert.deepEqual(f.statuses,[{state:"review",code:"EXTERNAL_CANCELLATION_PENDING"}]);});
test("lost response after successful cancellation settles only from the GET receipt",async()=>{const f=setup();let read=0;f.deps.read=async()=>payment(read++?9988:0);f.deps.cancel=async()=>{throw new Error("timeout");};await executeAlimtalkRefundJob(job,intent,f.deps);assert.deepEqual(f.calls.filter(c=>c.effect==="settle"),[{effect:"settle",value:9988}]);assert.deepEqual(f.statuses,[{state:"completed",code:null}]);});
test("HTTP success with an unchanged receipt never manufactures refunded money",async()=>{const f=setup();f.deps.cancel=async()=>{};await executeAlimtalkRefundJob(job,intent,f.deps);assert.equal(f.calls.some(c=>c.effect==="settle"),false);assert.deepEqual(f.statuses,[{state:"pending",code:"CANCELLATION_RESULT_PENDING"}]);});
test("timed-out jobs never POST again, including beyond the provider idempotency window",async()=>{const f=setup();await executeAlimtalkRefundJob({...job,state:"pending",submission_started_at:"2020-01-01T00:00:00Z"},intent,f.deps);assert.deepEqual(f.calls,[{effect:"read"}]);assert.deepEqual(f.statuses,[{state:"pending",code:"CANCELLATION_RESULT_PENDING"}]);});
test("late full receipt completes an already submitted job without another cancellation",async()=>{const f=setup();f.deps.read=async()=>payment(9988);await executeAlimtalkRefundJob({...job,state:"pending",submission_started_at:"2020-01-01T00:00:00Z"},intent,f.deps);assert.equal(f.calls.some(c=>c.effect==="cancel"),false);assert.deepEqual(f.statuses,[{state:"completed",code:null}]);});
test("a partial late receipt settles only that amount and continues holding the remainder",async()=>{const f=setup();f.deps.read=async()=>payment(4000);await executeAlimtalkRefundJob({...job,state:"pending",submission_started_at:"2020-01-01T00:00:00Z"},intent,f.deps);assert.deepEqual(f.calls,[{effect:"settle",value:4000}]);assert.deepEqual(f.statuses,[{state:"pending",code:"CANCELLATION_RESULT_PENDING"}]);});
test("network failure before submission preserves a retryable lookup, never a new financial attempt",async()=>{const f=setup();f.deps.read=async()=>{throw new Error("offline");};await executeAlimtalkRefundJob(job,intent,f.deps);assert.equal(f.calls.length,0);assert.deepEqual(f.statuses,[{state:"queued",code:"PAYMENT_LOOKUP_PENDING"}]);});
test("reconciliation failure cannot be reported as completion",async()=>{const f=setup();f.deps.settle=async()=>"review";await executeAlimtalkRefundJob(job,intent,f.deps);assert.deepEqual(f.statuses,[{state:"review",code:"LEDGER_REVIEW_REQUIRED"}]);});
test("invalid immutable allocation never reaches the provider",async()=>{const f=setup();await executeAlimtalkRefundJob({...job,target_cancelled:10001},intent,f.deps);assert.equal(f.calls.length,0);assert.deepEqual(f.statuses,[{state:"review",code:"INVALID_REFUND_SNAPSHOT"}]);});
test("a gate turned off after lookup prevents submission",async()=>{const f=setup();let n=0;f.deps.enabled=async()=>++n===1;await executeAlimtalkRefundJob(job,intent,f.deps);assert.deepEqual(f.calls,[{effect:"read"}]);});
