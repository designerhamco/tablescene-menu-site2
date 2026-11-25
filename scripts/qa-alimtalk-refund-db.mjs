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
  for(const file of ["20261125041134_add_nhn_order_alimtalk_attempts.sql","20261125045027_add_merchant_alimtalk_channels.sql","20261125053650_add_existing_merchant_alimtalk_binding.sql","20261125065323_add_merchant_alimtalk_templates.sql","20261125072555_add_alimtalk_prepaid_wallet.sql","20261125080151_add_alimtalk_refund_requests.sql"])await migrate(file);
  assert.equal((await one("select topup_enabled from alimtalk_billing_policy")).topup_enabled,false);pass();
  assert.match((await one("select pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.alimtalk_wallet_entries'::regclass and conname='alimtalk_wallet_entries_check'")).definition,/reserved_after.*balance_after/);pass();
  await assert.rejects(db.exec("update alimtalk_billing_policy set topup_enabled=true"),e=>e.code==='23514');pass();
  await assert.rejects(request(randomUUID(),10000),/WALLET_REFUND_EMPTY/);pass();
  for(const role of ["anon","authenticated"]){
    for(const table of ["alimtalk_refund_requests","alimtalk_refund_payments"]){
      assert.equal((await one("select has_table_privilege($1,$2,'select,insert,update,delete') allowed",[role,table])).allowed,false);pass();
    }
    for(const fn of ["request_alimtalk_refund(uuid,uuid,uuid,integer,text)","cancel_alimtalk_refund(uuid,uuid)","claim_alimtalk_refund(uuid,uuid)","reconcile_alimtalk_refund(text,integer)","create_alimtalk_topup(uuid,uuid,text,integer,text,text,text,integer)"]){
      assert.equal((await one("select has_function_privilege($1,$2,'execute') allowed",[role,fn])).allowed,false);pass();
    }
  }
  await assert.rejects(q("select * from create_alimtalk_topup($1,$2,$3,10000,'store','channel')",[menu,owner,`alimtalk_${randomUUID()}`]),e=>e.code==='42883');pass();
  // Activation and provider approval below exist ONLY in this isolated memory DB.
  await db.exec("update alimtalk_billing_policy set pg_reviewed_at=now(),approved_store_id='store',approved_channel_key='channel',topup_enabled=true;set role service_role");
  await assert.rejects(topup(10000,"stale-policy"),/WALLET_TERMS_CHANGED/);pass();
  await assert.rejects(topup(10000,terms,13),/WALLET_TERMS_CHANGED/);pass();
  const older=await topup(50000);await q("update alimtalk_topups set created_at=now()-interval '1 day' where payment_id=$1",[older.payment_id]);
  const newer=await topup(10000),late=await topup(10000);
  assert.equal(older.terms_version,terms);assert.equal(older.agreed_unit_price,12);assert(older.terms_accepted_at);pass();
  await Promise.all([credit(older),credit(older),credit(newer)]);
  assert.deepEqual(await wallet(),{balance:60000,reserved:0,frozen:false});pass();
  await q("select * from link_existing_menu_alimtalk_channel($1,$2,'@샘플매장','01100040001',$3)",[menu,owner,"a".repeat(40)]);
  await q("update menu_alimtalk_channels set template_status='approved',template_content='fixed',template_checked_at=now() where menu_site_id=$1",[menu]);
  await db.exec("reset role;alter table menu_alimtalk_channels drop constraint menu_alimtalk_channels_sending_enabled_check;update menu_alimtalk_channels set sending_enabled=true;update alimtalk_billing_policy set metering_enabled=true;set role service_role");
  const held=await attempt(1);await assert.rejects(request(randomUUID(),59988),/WALLET_REFUND_HELD/);pass();
  await settle(held.id,"failed");const used=await attempt(2);await settle(used.id,"sent");
  assert.deepEqual(await wallet(),{balance:59988,reserved:0,frozen:false});pass();
  await assert.rejects(request(randomUUID(),60000),/WALLET_REFUND_STALE/);pass();
  await assert.rejects(request(randomUUID(),59988,other),/WALLET_OWNER_REQUIRED/);pass();
  await assert.rejects(request(randomUUID(),59988,owner,"old"),/WALLET_TERMS_CHANGED/);pass();
  const id=randomUUID();await request(id,59988);
  assert.deepEqual(await wallet(),{balance:59988,reserved:59988,frozen:false});pass();
  assert.equal((await request(id,59988)).id,id);assert.equal((await request(randomUUID(),59988)).id,id);pass();
  assert.equal((await wallet()).reserved,59988);pass();
  const lines=(await q("select payment_id,amount from alimtalk_refund_payments where refund_id=$1",[id])).rows;
  assert.equal(lines.find(row=>row.payment_id===newer.payment_id).amount,10000);pass();
  assert.equal(lines.find(row=>row.payment_id===older.payment_id).amount,49988);pass();
  await assert.rejects(topup(),/WALLET_REFUND_PENDING/);pass();
  await assert.rejects(attempt(3),/WALLET_INSUFFICIENT/);pass();
  await assert.rejects(cancel(id,other),/WALLET_OWNER_REQUIRED/);pass();
  await cancel(id);await cancel(id);
  assert.deepEqual(await wallet(),{balance:59988,reserved:0,frozen:false});pass();
  assert.equal((await request(id,59988)).state,"cancelled");assert.equal((await wallet()).reserved,0);pass();
  assert.equal((await one("select count(*)::int n from alimtalk_wallet_entries where refund_id=$1 and kind='refund_release'",[id])).n,1);pass();
  const id2=randomUUID();await request(id2,59988);
  await assert.rejects(claim(id2,owner),/WALLET_ADMIN_REQUIRED/);pass();
  await claim(id2);await claim(id2);
  assert.equal((await one("select state from alimtalk_refund_requests where id=$1",[id2])).state,"processing");pass();
  await assert.rejects(claim(id2,admin2),/WALLET_REFUND_ASSIGNED/);pass();
  await assert.rejects(cancel(id2),/WALLET_REFUND_PROCESSING/);pass();
  assert.equal((await receipt(newer,7000)).result,"expected");pass();
  assert.deepEqual(await wallet(),{balance:52988,reserved:52988,frozen:false});pass();
  await Promise.all([receipt(newer,7000),receipt(newer,7000)]);
  assert.equal((await wallet()).balance,52988);pass();
  assert.equal((await receipt(newer,6000)).result,"unchanged");pass();
  // An already-open payment may finish while the refund is being processed.
  await credit(late);assert.deepEqual(await wallet(),{balance:62988,reserved:52988,frozen:false});pass();
  await receipt(newer,10000);await receipt(older,20000);
  assert.equal((await one("select refunded_amount from alimtalk_refund_requests where id=$1",[id2])).refunded_amount,30000);pass();
  await receipt(older,49988);
  assert.deepEqual(await wallet(),{balance:10000,reserved:0,frozen:false});pass();
  assert.equal((await one("select state from alimtalk_refund_requests where id=$1",[id2])).state,"completed");pass();
  await credit(older);await credit(newer);assert.equal((await wallet()).balance,10000);pass();
  assert.equal((await one("select sum(amount)::int amount from alimtalk_wallet_entries where kind='refund' and refund_id=$1",[id2])).amount,59988);pass();
  await assert.rejects(receipt(newer,10001),/WALLET_PAYMENT_MISMATCH/);pass();
  await db.exec("reset role");await q("delete from menu_sites where id=$1",[menu]);await db.exec("set role service_role");
  await assert.rejects(request(randomUUID(),10000),/WALLET_OWNER_REQUIRED/);pass();
  const id3=randomUUID();
  const accountRequest=await one("select * from request_alimtalk_refund(null,$1,$2,10000,$3)",[owner,id3,terms]);
  assert.equal(accountRequest.amount,10000);assert.equal(accountRequest.menu_site_id,menu);pass();
  await cancel(id3);assert.equal((await wallet()).reserved,0);pass();
  // A cancellation not belonging to an operator-claimed allocation freezes use.
  assert.equal((await receipt(late,100)).result,"review");pass();
  assert.deepEqual(await wallet(),{balance:10000,reserved:0,frozen:true});pass();
  await assert.rejects(q("select * from request_alimtalk_refund(null,$1,$2,10000,$3)",[owner,randomUUID(),terms]),/WALLET_FROZEN/);pass();
  await assert.rejects(credit(late),/WALLET_PAYMENT_REVIEW/);pass();
  assert.equal((await one("select has_table_privilege('service_role','alimtalk_wallet_entries','update,delete') allowed")).allowed,false);pass();
  console.log(`PASS: ${checks} refund SQL checks (consent, PG gate, owner/admin access, pending holds, duplicate requests, allocation, cancel/claim race, partial/multi-payment refunds, idempotent receipts, late payment, unexpected refund freeze)`);
}catch(error){console.error({code:error.code,message:error.message,where:error.where});process.exitCode=1;}finally{await db.close();}
