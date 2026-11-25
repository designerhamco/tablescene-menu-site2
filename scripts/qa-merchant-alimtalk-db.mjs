// Run against an isolated in-memory Postgres engine; never loads project env or Production credentials.
// node scripts/qa-merchant-alimtalk-db.mjs /absolute/path/to/node_modules/@electric-sql/pglite
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const engine = process.argv[2];
if (!engine) throw new Error("Provide the absolute PGlite package path. See docs/runbooks/nhn-order-alimtalk.md.");
const { PGlite } = createRequire(import.meta.url)(resolve(engine));
const db = new PGlite();
const actor = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const menu = "33333333-3333-4333-8333-333333333333";
const menu2 = "44444444-4444-4444-8444-444444444444";
const menu3 = "55555555-5555-4555-8555-555555555555";
let checks = 0;
function pass() { checks++; }
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key);
    create table public.menu_sites(id uuid primary key, user_id uuid references auth.users(id));
    grant usage on schema public,private to service_role;
    grant select,update on public.menu_sites to service_role;`);
  await db.query("insert into auth.users values($1),($2)", [actor, other]);
  await db.query("insert into menu_sites values($1,$2),($3,$2),($4,$5)", [menu, actor, menu2, menu3, other]);
  await db.exec(await readFile(new URL("../supabase/migrations/20261125045027_add_merchant_alimtalk_channels.sql", import.meta.url), "utf8"));
  assert.equal((await db.query("select relrowsecurity as enabled from pg_class where relname='menu_alimtalk_channels'")).rows[0].enabled, true); pass();
  for (const role of ["anon", "authenticated"]) {
    for (const permission of ["select", "insert", "update", "delete"]) {
      assert.equal((await db.query("select has_table_privilege($1,'menu_alimtalk_channels',$2) as allowed", [role, permission])).rows[0].allowed, false);
    }
    for (const fn of ["reserve_menu_alimtalk_request(uuid,uuid,text,text,text)", "reserve_menu_alimtalk_verification(uuid,uuid,uuid)"]) {
      assert.equal((await db.query("select has_function_privilege($1,$2,'execute') as allowed", [role, fn])).rows[0].allowed, false);
    }
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query("select * from menu_alimtalk_channels"), e => e.code === "42501");
    await db.exec("reset role"); pass();
  }
  await db.exec("set role service_role");
  const request = async (id = menu, user = actor, channel = "@샘플매장") => (await db.query(
    "select * from reserve_menu_alimtalk_request($1,$2,$3,'01100040001','010-****-0000')", [id, user, channel])).rows[0];
  const verify = async (id, user, challenge) => (await db.query("select * from reserve_menu_alimtalk_verification($1,$2,$3)", [id, user, challenge])).rows[0];
  await assert.rejects(request(menu, other), /CHANNEL_OWNER_REQUIRED/); pass();
  const first = await request();
  assert.equal(first.state, "requesting");
  assert.equal(first.sender_key, null);
  assert.equal(first.sending_enabled, false); pass();
  await assert.rejects(request(), /CHANNEL_COOLDOWN/); pass();
  await assert.rejects(request(menu3, other), /CHANNEL_IN_USE/); pass();
  await db.query("update menu_alimtalk_channels set state='pending' where menu_site_id=$1", [menu]);
  await assert.rejects(verify(menu, actor, menu2), /CHANNEL_STALE/); pass();
  await assert.rejects(verify(menu, other, first.challenge_id), /CHANNEL_OWNER_REQUIRED/); pass();
  const reserved = await verify(menu, actor, first.challenge_id);
  assert.equal(reserved.verify_attempts, 1);
  await assert.rejects(verify(menu, actor, first.challenge_id), /CHANNEL_NOT_PENDING/); pass();
  await db.query("update menu_alimtalk_channels set state='pending',verify_attempts=5 where menu_site_id=$1", [menu]);
  await assert.rejects(verify(menu, actor, first.challenge_id), /CHANNEL_VERIFY_LIMIT/); pass();
  await db.query("update menu_alimtalk_channels set verify_attempts=0,expires_at=now()-interval '1 second' where menu_site_id=$1", [menu]);
  await assert.rejects(verify(menu, actor, first.challenge_id), /CHANNEL_EXPIRED/); pass();
  const secondStore = await request(menu3, other);
  assert.equal(secondStore.state, "requesting");
  assert.equal((await db.query("select state from menu_alimtalk_channels where menu_site_id=$1", [menu])).rows[0].state, "failed"); pass();
  await db.query("update menu_alimtalk_channels set requested_at=now()-interval '61 seconds' where menu_site_id=$1", [menu]);
  const retry = await request(menu, actor, "@새매장");
  assert.notEqual(retry.challenge_id, first.challenge_id);
  assert.equal(retry.request_count, 2);
  assert.equal(retry.verify_attempts, 0); pass();
  await db.query("update menu_alimtalk_channels set request_count=10 where menu_site_id=$1", [menu]);
  await assert.rejects(request(menu2, actor, "@세번째매장"), /CHANNEL_REQUEST_LIMIT/); pass();
  await db.query("update menu_alimtalk_channels set state='pending' where menu_site_id=$1", [menu3]);
  await verify(menu3, other, secondStore.challenge_id);
  await db.query("update menu_alimtalk_channels set state='connected',sender_key=$1,verified_at=now() where menu_site_id=$2", ["a".repeat(40), menu3]);
  await assert.rejects(request(menu3, other), /CHANNEL_ALREADY_CONNECTED/); pass();
  await assert.rejects(db.query("update menu_alimtalk_channels set sending_enabled=true where menu_site_id=$1", [menu3]), e => e.code === "23514"); pass();
  await assert.rejects(db.query("update menu_alimtalk_channels set state='connected' where menu_site_id=$1", [menu]), e => e.code === "23514"); pass();
  await db.query("update menu_sites set user_id=$1 where id=$2", [actor, menu3]);
  await assert.rejects(db.query("update menu_alimtalk_channels set sending_enabled=false where menu_site_id=$1", [menu3]), /CHANNEL_OWNER_REQUIRED/); pass();
  const columns = (await db.query("select column_name from information_schema.columns where table_name='menu_alimtalk_channels'")).rows.map(r => r.column_name);
  assert(!columns.includes("phone_no") && !columns.includes("token") && !columns.includes("admin_phone")); pass();
  console.log(`PASS: ${checks} database checks (RLS, owner, duplicate channel, cooldown, stale/expired proof, attempt/rate limits, key constraints, sending off, ownership transfer, masked storage)`);
} finally { await db.close(); }
