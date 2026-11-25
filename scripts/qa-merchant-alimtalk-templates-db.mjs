// Isolated SQL checks. No environment files, network, NHN calls or operating data.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
if (!process.argv[2]) throw new Error("Provide an absolute PGlite package path.");
const { PGlite } = createRequire(import.meta.url)(resolve(process.argv[2]));
const db = new PGlite(), owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const menu = "33333333-3333-4333-8333-333333333333", menu2 = "44444444-4444-4444-8444-444444444444", order = "55555555-5555-4555-8555-555555555555";
let checks = 0; const pass = () => checks++;
const migration = async name => db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8"));
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema private;create schema auth;
    create table auth.users(id uuid primary key);create table public.menu_sites(id uuid primary key,user_id uuid references auth.users(id));
    create table public.menu_customer_orders(menu_site_id uuid,id uuid,status text,notification_phone text,primary key(menu_site_id,id));
    grant usage on schema public,private to service_role;grant select,update on menu_sites,menu_customer_orders to service_role;`);
  await db.query("insert into auth.users values($1),($2)", [owner, other]);
  await db.query("insert into menu_sites values($1,$2),($3,$2)", [menu, owner, menu2]);
  await db.query("insert into menu_customer_orders values($1,$2,'ready','01000000000')", [menu, order]);
  await migration("20261125041134_add_nhn_order_alimtalk_attempts.sql");
  await migration("20261125045027_add_merchant_alimtalk_channels.sql");
  await migration("20261125053650_add_existing_merchant_alimtalk_binding.sql");
  await db.query("insert into menu_order_alimtalk_attempts(menu_site_id,order_id,attempt_no,status,provider_message_id,submission_started_at,resolved_at) values($1,$2,1,'sent','legacy:1',now(),now())", [menu, order]);
  await migration("20261125065323_add_merchant_alimtalk_templates.sql");
  assert.equal((await db.query("select status from menu_order_alimtalk_attempts")).rows[0].status, "sent"); pass();
  for (const role of ["anon", "authenticated"]) {
    assert.equal((await db.query("select has_function_privilege($1,'reserve_menu_alimtalk_template(uuid,uuid)','execute') as allowed", [role])).rows[0].allowed, false); pass();
    assert.equal((await db.query("select has_table_privilege($1,'menu_alimtalk_channels','select') as allowed", [role])).rows[0].allowed, false); pass();
  }
  const reserve = async (actor = owner, target = menu) => (await db.query("select * from reserve_menu_alimtalk_template($1,$2)", [target, actor])).rows[0];
  await assert.rejects(reserve(), /TEMPLATE_CHANNEL_REQUIRED/); pass();
  await assert.rejects(reserve(other), /CHANNEL_OWNER_REQUIRED/); pass();
  await db.query("select * from link_existing_menu_alimtalk_channel($1,$2,'@샘플매장','01100040001',$3)", [menu, owner, "a".repeat(40)]);
  await db.exec("set role service_role");
  const first = await reserve(); assert.equal(first.template_status, "checking"); pass();
  await assert.rejects(reserve(), /TEMPLATE_COOLDOWN/); pass();
  await db.query("update menu_alimtalk_channels set template_check_started_at=now()-interval '20 seconds' where menu_site_id=$1", [menu]);
  await assert.rejects(reserve(), /TEMPLATE_BUSY/); pass();
  await db.query("update menu_alimtalk_channels set template_check_started_at=now()-interval '46 seconds' where menu_site_id=$1", [menu]);
  const second = await reserve(); assert.notEqual(second.template_check_id, first.template_check_id); pass();
  assert.equal((await db.query("update menu_alimtalk_channels set template_status='pending' where menu_site_id=$1 and template_check_id=$2 returning menu_site_id", [menu, first.template_check_id])).rows.length, 0); pass();
  const claim = async () => (await db.query("update menu_alimtalk_channels set template_registration_started_at=now() where menu_site_id=$1 and template_check_id=$2 and template_registration_started_at is null returning menu_site_id", [menu, second.template_check_id])).rows;
  assert.equal((await claim()).length, 1); pass(); assert.equal((await claim()).length, 0); pass();
  await db.query("update menu_alimtalk_channels set template_check_started_at=now()-interval '46 seconds' where menu_site_id=$1", [menu]);
  assert((await reserve()).template_registration_started_at); pass();
  await assert.rejects(db.query("update menu_alimtalk_channels set template_status='approved' where menu_site_id=$1", [menu]), e => e.code === "23514"); pass();
  await db.query("update menu_alimtalk_channels set template_status='approved',template_content='approved fixed copy',template_checked_at=now() where menu_site_id=$1", [menu]);
  await assert.rejects(db.query("update menu_alimtalk_channels set sending_enabled=true where menu_site_id=$1", [menu]), e => e.code === "23514"); pass();
  await assert.rejects(db.query("insert into menu_order_alimtalk_attempts(menu_site_id,order_id,attempt_no,sender_key,channel_id,template_code,channel_owner_id,provider_app_key_hash)values($1,$2,2,$3,'@샘플매장','cooking_ready_v1',$4,$5)", [menu, order, "a".repeat(40), owner, "0".repeat(64)]), /ORDER_ALIMTALK_CHANNEL_UNAVAILABLE/); pass();
  await assert.rejects(db.query("insert into menu_order_alimtalk_attempts(menu_site_id,order_id,attempt_no) values($1,$2,2)", [menu, order]), /ORDER_ALIMTALK_CHANNEL_UNAVAILABLE/); pass();
  await db.query("update menu_alimtalk_channels set sender_key=$2 where menu_site_id=$1", [menu, "b".repeat(40)]);
  const reset = (await db.query("select template_status,template_content,template_check_id,template_registration_started_at,sending_enabled from menu_alimtalk_channels where menu_site_id=$1", [menu])).rows[0];
  assert.deepEqual(reset, { template_status: "unregistered", template_content: null, template_check_id: null, template_registration_started_at: null, sending_enabled: false }); pass();
  await db.query("update menu_sites set user_id=$2 where id=$1", [menu, other]);
  await assert.rejects(reserve(), /CHANNEL_OWNER_REQUIRED/); pass();
  await assert.rejects(reserve(other), /TEMPLATE_CHANNEL_REQUIRED/); pass();
  console.log(`PASS: ${checks} SQL checks (owner, leases, stale writes, at-most-once registration, proof reset, legacy history, customer sending off)`);
} finally { await db.close(); }
