// Isolated SQL checks only. No operating DB, PG cancellation or message sending.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
if(!process.argv[2])throw new Error("Provide an absolute PGlite package path.");
const {PGlite}=createRequire(import.meta.url)(resolve(process.argv[2]));
const db=new PGlite();let checks=0;const pass=()=>checks++;
const owner=randomUUID(),other=randomUUID(),admin=randomUUID(),admin2=randomUUID(),menu=randomUUID(),order=randomUUID();
const terms="alimtalk_20261125_v1",q=(sql,args=[])=>db.query(sql,args),one=async(sql,args=[])=> (await q(sql,args)).rows[0];
const migrate=async file=>db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),"utf8"));
const wallet=()=>one("select balance,reserved,frozen from alimtalk_wallets where owner_id=$1",[owner]);
const topup=async(amount=10000,version=terms,price=12)=>one("select * from create_alimtalk_topup($1,$2,$3,$4,'store','channel',$5,$6)",[menu,owner,`alimtalk_${randomUUID()}`,amount,version,price]);
const credit=t=>q("select * from credit_alimtalk_topup($1,$2,$3)",[t.payment_id,owner,t.amount]);
const request=(id,amount,actor=owner,version=terms)=>one("select * from request_alimtalk_refund($1,$2,$3,$4,$5)",[menu,actor,id,amount,version]);
const cancel=(id,actor=owner)=>q("select cancel_alimtalk_refund($1,$2)",[actor,id]);
const claim=(id,actor=admin)=>q("select claim_alimtalk_refund($1,$2)",[actor,id]);
const receipt=(payment,amount)=>one("select reconcile_alimtalk_refund($1,$2) result",[payment.payment_id,amount]);
const attempt=async number=>one(`insert into menu_order_alimtalk_attempts(menu_site_id,order_id,attempt_no,channel_owner_id,sender_key,channel_id,template_code,provider_app_key_hash)
 values($1,$2,$3,$4,$5,'@샘플매장','cooking_ready_v1',$6) returning id`,[menu,order,number,owner,"a".repeat(40),"0".repeat(64)]);
const settle=(id,status)=>q("update menu_order_alimtalk_attempts set submission_started_at=now(),provider_message_id=$3,status=$2,resolved_at=now() where id=$1",[id,status,`receipt:${id}`]);
try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema private;create schema auth;
    create table auth.users(id uuid primary key);create table public.admin_users(user_id uuid primary key references auth.users(id));
    create table public.menu_sites(id uuid primary key,user_id uuid references auth.users(id));
    create table public.menu_customer_orders(menu_site_id uuid,id uuid,status text,notification_phone text,primary key(menu_site_id,id));
    grant usage on schema public,private to service_role;grant select,update on menu_sites,menu_customer_orders to service_role;`);
  await q("insert into auth.users values($1),($2),($3),($4)",[owner,other,admin,admin2]);
  await q("insert into admin_users values($1),($2)",[admin,admin2]);
  await q("insert into menu_sites values($1,$2)",[menu,owner]);
  await q("insert into menu_customer_orders values($1,$2,'ready','01000000000')",[menu,order]);
  for(const file of ["20261125041134_add_nhn_order_alimtalk_attempts.sql","20261125045027_add_merchant_alimtalk_channels.sql","20261125053650_add_existing_merchant_alimtalk_binding.sql","20261125065323_add_merchant_alimtalk_templates.sql","20261125072555_add_alimtalk_prepaid_wallet.sql","20261125080151_add_alimtalk_refund_requests.sql","20261125114235_add_alimtalk_refund_approval_jobs.sql"])await migrate(file);
  const approve=(id,amount,actor=admin)=>q("select approve_alimtalk_refund($1,$2,$3)",[actor,id,amount]);
  const start=(job,amount)=>one("select start_alimtalk_refund_job($1,$2) started",[job.id,amount]);
  const jobs=id=>q("select * from alimtalk_refund_jobs where refund_id=$1 order by payment_id",[id]);
  assert.equal((await one("select refund_execution_enabled from alimtalk_billing_policy")).refund_execution_enabled,false);pass();
  await assert.rejects(db.exec("update alimtalk_billing_policy set refund_execution_enabled=true"),e=>e.code==='23514');pass();
  for(const role of ["anon","authenticated"]){
    assert.equal((await one("select has_table_privilege($1,'alimtalk_refund_jobs','select,insert,update,delete') allowed",[role])).allowed,false);pass();
    for(const fn of ["public.approve_alimtalk_refund(uuid,uuid,integer)","public.start_alimtalk_refund_job(uuid,integer)","private.start_alimtalk_refund_job(uuid,integer)"]){
      assert.equal((await one("select has_function_privilege($1,$2,'execute') allowed",[role,fn])).allowed,false);pass();
    }
  }
  assert.equal((await one("select relrowsecurity enabled from pg_class where oid='public.alimtalk_refund_jobs'::regclass")).enabled,true);pass();
  assert.equal((await one("select prosecdef definer from pg_proc where oid='public.start_alimtalk_refund_job(uuid,integer)'::regprocedure")).definer,false);pass();
  assert.equal((await one("select proconfig config from pg_proc where oid='private.start_alimtalk_refund_job(uuid,integer)'::regprocedure")).config.includes('search_path=""'),true);pass();
  await db.exec("update alimtalk_billing_policy set pg_reviewed_at=now(),approved_store_id='store',approved_channel_key='channel',topup_enabled=true;set role service_role");
  const a=await topup(10000),b=await topup(30000);await credit(a);await credit(b);
  const id=randomUUID();await request(id,40000);
  await assert.rejects(approve(id,40000,owner),/WALLET_ADMIN_REQUIRED/);pass();
  await assert.rejects(approve(id,40000),/WALLET_REFUND_DISABLED/);pass();
  assert.equal((await jobs(id)).rows.length,0);pass();
  await db.exec("reset role;update alimtalk_billing_policy set refund_execution_enabled=true;set role service_role");
  await assert.rejects(approve(id,39999),/WALLET_REFUND_STALE/);pass();
  assert.equal((await jobs(id)).rows.length,0);pass();
  await Promise.all([approve(id,40000),approve(id,40000)]);
  const r=await one("select * from alimtalk_refund_requests where id=$1",[id]);
  assert.equal(r.approved_by,admin);assert(r.approved_at);assert.equal(r.state,'processing');pass();
  const firstJobs=(await jobs(id)).rows;assert.equal(firstJobs.length,2);pass();
  assert.equal(firstJobs.reduce((sum,j)=>sum+j.target_cancelled-j.before_cancelled,0),40000);pass();
  await assert.rejects(approve(id,40000,admin2),/WALLET_REFUND_ASSIGNED/);pass();
  await assert.rejects(cancel(id),/WALLET_REFUND_PROCESSING/);pass();
  assert.equal((await start(firstJobs[0],1)).started,false);pass();
  await db.exec("reset role;update alimtalk_billing_policy set refund_execution_enabled=false;set role service_role");
  assert.equal((await start(firstJobs[0],0)).started,false);pass();
  await db.exec("reset role;update alimtalk_billing_policy set refund_execution_enabled=true;set role service_role");
  const claims=await Promise.all([start(firstJobs[0],0),start(firstJobs[0],0)]);
  assert.equal(claims.filter(c=>c.started).length,1);pass();
  assert.equal((await one("select state from alimtalk_refund_jobs where id=$1",[firstJobs[0].id])).state,'submitting');pass();
  assert.equal((await start(firstJobs[0],0)).started,false);pass();
  // Durable submission cannot be reset or have its money/idempotency snapshot changed.
  for(const sql of ["update alimtalk_refund_jobs set submission_started_at=null","update alimtalk_refund_jobs set target_cancelled=1","delete from alimtalk_refund_jobs"]){
    await assert.rejects(db.exec(sql),e=>e.code==='42501');pass();
  }
  await q("update alimtalk_refund_jobs set state='pending',last_error_code='CANCELLATION_RESULT_PENDING' where id=$1",[firstJobs[0].id]);
  assert.equal((await start(firstJobs[0],0)).started,false);pass();
  const t0=firstJobs[0].payment_id===a.payment_id?a:b,t1=firstJobs[1].payment_id===a.payment_id?a:b;
  await receipt(t0,5000);await receipt(t0,5000);
  assert.deepEqual(await wallet(),{balance:35000,reserved:35000,frozen:false});pass();
  await receipt(t0,t0.amount);await receipt(t1,t1.amount);
  assert.deepEqual(await wallet(),{balance:0,reserved:0,frozen:false});pass();
  assert.equal((await one("select state from alimtalk_refund_requests where id=$1",[id])).state,'completed');pass();
  assert.equal((await start(firstJobs[1],0)).started,false);pass();
  await approve(id,40000);assert.equal((await jobs(id)).rows.length,2);pass();
  assert.equal((await one("select sum(amount)::int amount from alimtalk_wallet_entries where kind='refund' and refund_id=$1",[id])).amount,40000);pass();
  // Approval must enqueue every original, beyond the admin table's 50-row page.
  await db.exec("reset role");
  for(let i=0;i<51;i++){const t=await topup(10000);await credit(t);await q("update alimtalk_topups set created_at=now()-interval '2 hours' where payment_id=$1",[t.payment_id]);}
  await db.exec("set role service_role");
  const many=randomUUID();await request(many,510000);await approve(many,510000);
  assert.equal((await jobs(many)).rows.length,51);pass();
  // Revoking the approving administrator blocks unsent jobs.
  await db.exec("reset role");await q("delete from admin_users where user_id=$1",[admin]);await db.exec("set role service_role");
  assert.equal((await start((await jobs(many)).rows[0],0)).started,false);pass();
  assert.equal((await one("select has_table_privilege('service_role','alimtalk_wallet_entries','update,delete') allowed")).allowed,false);pass();
  console.log(`PASS: ${checks} approval SQL checks (OFF by default, admin authorization, immutable allocations, approval audit, duplicate claims, original funding, held unknown outcomes, partial receipts, 51-payment queue, revoked administrator)`);
}catch(error){console.error({code:error.code,message:error.message,where:error.where});process.exitCode=1;}finally{await db.close();}
