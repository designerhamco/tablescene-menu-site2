// Isolated PostgreSQL execution. No operating credentials, NHN sends or PG charges.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
if (!process.argv[2]) throw new Error("Provide an absolute PGlite package path.");
const { PGlite } = createRequire(import.meta.url)(resolve(process.argv[2]));
const db = new PGlite(); let checks = 0; const pass = () => checks++;
const owner = randomUUID(), other = randomUUID(), menu = randomUUID(), menu2 = randomUUID(), menu3 = randomUUID();
const order = randomUUID(), order2 = randomUUID(), order3 = randomUUID(), otherOrder = randomUUID();
const query = (sql, args = []) => db.query(sql, args);
const one = async (sql, args = []) => (await query(sql, args)).rows[0];
const migration = async name => db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
const topup = (actor = owner, site = menu, amount = 10000) => query("select * from create_alimtalk_topup($1,$2,$3,$4,'store','channel')", [site, actor, `alimtalk_${randomUUID()}`, amount]);
const wallet = (actor = owner) => one("select balance,reserved,frozen from alimtalk_wallets where owner_id=$1", [actor]);
const attempt = async (site = menu, o = order, actor = owner, key = "a", number = 1) => one(`insert into menu_order_alimtalk_attempts(menu_site_id,order_id,attempt_no,channel_owner_id,sender_key,channel_id,template_code,provider_app_key_hash)
  values($1,$2,$3,$4,$5,$6,'cooking_ready_v1',$7) returning id`, [site,o,number,actor,key.repeat(40),`@${site.slice(0,8)}`,"0".repeat(64)]);
const settle = (id, status) => query(`update menu_order_alimtalk_attempts set status=$2,resolved_at=now(),submission_started_at=coalesce(submission_started_at,now()),provider_message_id=coalesce(provider_message_id,$3) where id=$1`, [id,status,`receipt:${id}`]);
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema private;create schema auth;
    create table auth.users(id uuid primary key);create table public.menu_sites(id uuid primary key,user_id uuid references auth.users(id));
    create table public.menu_customer_orders(menu_site_id uuid,id uuid,status text,notification_phone text,primary key(menu_site_id,id));
    grant usage on schema public,private to service_role;grant select,update on menu_sites,menu_customer_orders to service_role;`);
  await query("insert into auth.users values($1),($2)", [owner,other]);
  await query("insert into menu_sites values($1,$2),($3,$4),($5,$2)", [menu,owner,menu2,other,menu3]);
  await query("insert into menu_customer_orders values($1,$2,'ready','01000000000'),($1,$3,'ready','01000000000'),($4,$5,'ready','01000000000'),($6,$7,'ready','01000000000')", [menu,order,order2,menu3,order3,menu2,otherOrder]);
  for (const file of ["20261125041134_add_nhn_order_alimtalk_attempts.sql","20261125045027_add_merchant_alimtalk_channels.sql","20261125053650_add_existing_merchant_alimtalk_binding.sql","20261125065323_add_merchant_alimtalk_templates.sql"]) await migration(file);
  // Legacy successful history must remain uncharged after deployment.
  await db.exec("alter table menu_order_alimtalk_attempts disable trigger validate_order_alimtalk_attempt");
  const legacy = await one("insert into menu_order_alimtalk_attempts(menu_site_id,order_id,attempt_no,status,provider_message_id,submission_started_at,resolved_at) values($1,$2,8,'sent','old-receipt',now(),now()) returning id", [menu,order]);
  await db.exec("alter table menu_order_alimtalk_attempts enable trigger validate_order_alimtalk_attempt");
  await migration("20261125072555_add_alimtalk_prepaid_wallet.sql");
  assert.equal((await one("select count(*)::int n from alimtalk_wallet_entries")).n,0); pass();
  assert.equal((await one("select unit_price,topup_enabled,metering_enabled from alimtalk_billing_policy")).unit_price,12); pass();
  for (const role of ["anon","authenticated"]) {
    for (const table of ["alimtalk_wallets","alimtalk_topups","alimtalk_wallet_entries","alimtalk_wallet_holds","alimtalk_billing_policy"]) {
      assert.equal((await one("select has_table_privilege($1,$2,'select,insert,update,delete') allowed",[role,table])).allowed,false); pass();
    }
    for (const fn of ["create_alimtalk_topup(uuid,uuid,text,integer,text,text)","credit_alimtalk_topup(text,uuid,integer)","flag_alimtalk_topup_review(text)"]) {
      assert.equal((await one("select has_function_privilege($1,$2,'execute') allowed",[role,fn])).allowed,false); pass();
    }
  }
  assert.equal((await one("select has_table_privilege('service_role','alimtalk_wallet_entries','update,delete') allowed")).allowed,false); pass();
  await assert.rejects(topup(), /WALLET_TOPUP_DISABLED/); pass();
  await assert.rejects(topup(other), /WALLET_OWNER_REQUIRED/); pass();
  await db.exec("update alimtalk_billing_policy set topup_enabled=true");
  await db.exec("set role service_role");
  await assert.rejects(topup(owner,menu,9999), e => e.code==='23514'); pass();
  const payment = (await topup()).rows[0], credit = (id = payment.payment_id, actor = owner, amount = 10000) => query("select * from credit_alimtalk_topup($1,$2,$3)",[id,actor,amount]);
  await assert.rejects(credit(payment.payment_id,other), /WALLET_PAYMENT_MISMATCH/); pass();
  await assert.rejects(credit(payment.payment_id,owner,50000), /WALLET_PAYMENT_MISMATCH/); pass();
  await Promise.all([credit(),credit(),credit()]);
  assert.deepEqual(await wallet(),{balance:10000,reserved:0,frozen:false}); pass();
  assert.equal((await one("select count(*)::int n from alimtalk_wallet_entries where kind='topup'")).n,1); pass();
  assert.equal(await wallet(other),undefined); pass();
  for (const [site, actor, key] of [[menu,owner,"a"],[menu2,other,"b"],[menu3,owner,"c"]]) {
    await query("select * from link_existing_menu_alimtalk_channel($1,$2,$3,'01100040001',$4)",[site,actor,`@${site.slice(0,8)}`,key.repeat(40)]);
    await query("update menu_alimtalk_channels set template_status='approved',template_content='fixed copy',template_checked_at=now() where menu_site_id=$1",[site]);
  }
  await assert.rejects(query("update menu_alimtalk_channels set sending_enabled=true"), e=>e.code==='23514'); pass();
  // Enable ONLY this isolated database to exercise future billing activation.
  await db.exec("reset role;alter table menu_alimtalk_channels drop constraint menu_alimtalk_channels_sending_enabled_check;update menu_alimtalk_channels set sending_enabled=true;set role service_role");
  await assert.rejects(attempt(), /WALLET_METERING_DISABLED/); pass();
  assert.equal((await one("select count(*)::int n from menu_order_alimtalk_attempts")).n,1); pass();
  await db.exec("reset role;update alimtalk_billing_policy set metering_enabled=true;set role service_role");
  const first = await attempt();
  assert.deepEqual(await wallet(),{balance:10000,reserved:12,frozen:false}); pass();
  await assert.rejects(attempt(),e=>e.code==='23505'); pass();
  assert.equal((await wallet()).reserved,12); pass();
  await settle(first.id,"sent");
  assert.deepEqual(await wallet(),{balance:9988,reserved:0,frozen:false}); pass();
  await settle(first.id,"sent"); assert.equal((await wallet()).balance,9988); pass();
  await assert.rejects(settle(first.id,"failed"),/WALLET_RESULT_FINAL/); pass();
  const failed = await attempt(menu,order,owner,"a",2);
  await settle(failed.id,"failed"); assert.deepEqual(await wallet(),{balance:9988,reserved:0,frozen:false}); pass();
  const shared = await attempt(menu3,order3,owner,"c"); assert.equal((await wallet()).reserved,12); pass();
  await settle(shared.id,"failed");
  await assert.rejects(attempt(menu2,otherOrder,other,"b"),/WALLET_INSUFFICIENT/); pass();
  // Two distinct orders race for one remaining message. Only one reservation fits.
  await query("update alimtalk_wallets set balance=12 where owner_id=$1",[owner]);
  const race = await Promise.allSettled([attempt(menu,order,owner,"a",3),attempt(menu,order2,owner,"a",1)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1); pass();
  assert.equal(race.filter(r=>r.status==='rejected' && /WALLET_INSUFFICIENT/.test(r.reason.message)).length,1); pass();
  assert.deepEqual(await wallet(),{balance:12,reserved:12,frozen:false}); pass();
  // Ambiguous provider outcome stays held across settings/price changes.
  await db.exec("reset role;update alimtalk_billing_policy set unit_price=15,metering_enabled=false;set role service_role");
  await credit(); assert.equal((await wallet()).balance,12); pass();
  await query("select flag_alimtalk_topup_review($1)",[payment.payment_id]);
  assert.equal((await wallet()).frozen,true); pass();
  await assert.rejects(topup(),/WALLET_FROZEN/); pass();
  await assert.rejects(credit(),/WALLET_PAYMENT_REVIEW/); pass();
  const heldId = race.find(r=>r.status==='fulfilled').value.id;
  await db.exec("reset role");
  await assert.rejects(query("delete from menu_order_alimtalk_attempts where id=$1",[heldId]),e=>e.code==='23514'); pass();
  await db.exec("set role service_role");
  await settle(heldId,"sent"); // Receipt settlement still works while sending/charging is off.
  assert.deepEqual(await wallet(),{balance:0,reserved:0,frozen:true}); pass();
  assert.equal((await one("select amount from alimtalk_wallet_holds where attempt_id=$1",[heldId])).amount,12); pass();
  assert.equal((await one("select count(*)::int n from alimtalk_wallet_holds where attempt_id=$1",[legacy.id])).n,0); pass();
  assert.equal((await one("select count(*)::int n from alimtalk_wallet_entries where attempt_id=$1 and kind='charge'",[first.id])).n,1); pass();
  await db.exec("reset role");
  const ledgerBefore = (await one("select count(*)::int n from alimtalk_wallet_entries")).n;
  await query("delete from menu_customer_orders where menu_site_id=$1 and id=$2",[menu,order]);
  assert.equal((await one("select count(*)::int n from alimtalk_wallet_entries")).n,ledgerBefore); pass();
  assert.equal((await wallet()).balance,0); pass();
  assert.equal((await one("select count(*)::int n from alimtalk_wallet_holds where attempt_id is null and state='charged'")).n>=1,true); pass();
  console.log(`PASS: ${checks} SQL checks (access isolation, duplicate topups, shared wallet, one final charge, failure release, bounded reservations, legacy history, cancellation freeze, OFF gates)`);
} finally { await db.close(); }
