import assert from "node:assert/strict";
import fs from "node:fs/promises";
const { PGlite } = await import(process.env.PGLITE_TEST_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
let checks = 0;
const check = (a, b) => { assert.deepEqual(a, b); checks++; };
const reject = async (fn, re) => { await assert.rejects(fn, re); checks++; };
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.menu_sites(id uuid primary key, user_id uuid, settings jsonb default '{}');
    grant select, update on public.menu_sites to service_role;`);
  const owner = crypto.randomUUID(), other = crypto.randomUUID(), site = crypto.randomUUID(), otherSite = crypto.randomUUID();
  await q("insert into menu_sites values($1,$2,'{\"untouched\":true}'),($3,$4,'{}')", [site, owner, otherSite, other]);
  const before = await q("select * from menu_sites order by id");
  await db.exec(await fs.readFile(new URL("../supabase/migrations/20261103093145_payment_terminal_preparation.sql", import.meta.url), "utf8"));
  const draft = { provider: "nice_apppos_ios", terminalModel: "NM-400", businessNumber: "0000000000", terminalId: "TEST000001", localPort: "" };
  const save = async (value = draft, revision = 0, actor = owner, menu = site) => (await q("select public.save_payment_terminal_preparation($1,$2,$3,$4) value", [menu, actor, value, revision]))[0].value;
  const list = async (actor = owner, menu = site) => (await q("select public.list_payment_terminal_preparations($1,$2) value", [menu, actor]))[0].value;
  await db.exec("set role service_role");
  check(await list(), []);
  const saved = await save(); check(saved.revision, 1); check(saved.draft, draft);
  await reject(() => save(draft, 0), /다른 화면/);
  check((await list())[0], saved);
  check((await save({ ...draft, terminalModel: "NM-2000N" }, 1)).revision, 2);
  await reject(() => list(other), /사장님/); await reject(() => list(owner, otherSite), /사장님/);
  await reject(() => save(draft, 2, other), /사장님/); await reject(() => save(draft, 2, owner, otherSite), /사장님/);
  await reject(() => save(draft, 2, null), /사장님/);
  for (const patch of [{ apiKey: "not-allowed" }, { chargeEnabled: true }, { provider: "unknown" }, { businessNumber: "1" }, { terminalId: "x&price=1" }, { localPort: "27098" }, { terminalModel: "bad\nmodel" }])
    await reject(() => save({ ...draft, ...patch }, 2), /설정|형식|포트/);
  check((await save({ ...draft, provider: "ksnet_kscat_windows", terminalModel: "KS1060C", localPort: "27098" })).revision, 1);
  check((await list()).length, 2);
  await db.exec("reset role");
  check(await q("select * from menu_sites order by id"), before);
  for (const role of ["anon", "authenticated"]) {
    for (const signature of ["public.list_payment_terminal_preparations(uuid,uuid)", "public.save_payment_terminal_preparation(uuid,uuid,jsonb,bigint)"])
      check((await q("select has_function_privilege($1,$2,'execute') value", [role, signature]))[0].value, false);
    await db.exec(`set role ${role}`);
    try { await reject(() => list(), /permission denied/); await reject(() => q("select * from private.menu_payment_terminal_preparations"), /permission denied/); }
    finally { await db.exec("reset role"); }
  }
  check((await q("select relrowsecurity,relforcerowsecurity from pg_class where oid='private.menu_payment_terminal_preparations'::regclass"))[0], { relrowsecurity: true, relforcerowsecurity: true });
  check((await q("select bool_and(not prosecdef) value from pg_proc where oid in ('public.list_payment_terminal_preparations(uuid,uuid)'::regprocedure,'public.save_payment_terminal_preparation(uuid,uuid,jsonb,bigint)'::regprocedure)"))[0].value, true);
  console.log(JSON.stringify({ checks, failed: 0, environment: "isolated PGlite; no Production connection" }));
} finally { await db.close(); }
