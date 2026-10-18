// Run with PGLITE_MODULE pointing to an isolated @electric-sql/pglite installation.
import assert from "node:assert/strict";
import fs from "node:fs";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const foundation = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260806124512_add_postpay_order_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
await db.exec(`
create role anon; create role authenticated; create role service_role;
create table public.menu_sites(id uuid primary key,user_id uuid,template_key text);
create table public.menu_items(id uuid primary key,menu_site_id uuid references public.menu_sites(id),price integer,orderable boolean,updated_at timestamptz not null default now(),unique(menu_site_id,id));
create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=clock_timestamp();return new;end$$;
create trigger set_item_updated before update on public.menu_items for each row execute function public.set_updated_at();
`);
await db.exec(
  foundation.slice(
    foundation.indexOf("create table public.menu_order_option_groups"),
    foundation.indexOf("create table public.menu_customer_orders"),
  ),
);
await db.exec(
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20261018085245_add_menu_order_configuration.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const site = "11111111-1111-4111-8111-111111111111",
  owner = "22222222-2222-4222-8222-222222222222",
  item = "33333333-3333-4333-8333-333333333333",
  group = "44444444-4444-4444-8444-444444444444",
  value = "55555555-5555-4555-8555-555555555555";
await db.query("insert into public.menu_sites values($1,$2,'cafe_design_a')", [
  site,
  owner,
]);
await db.query(
  "insert into public.menu_items(id,menu_site_id,price,orderable) values($1,$2,5000,false)",
  [item, site],
);
const timestamp = async () =>
  (
    await db.query(
      "select updated_at::text as stamp from menu_items where id=$1",
      [item],
    )
  ).rows[0].stamp;
const options = [
  {
    id: group,
    name: "온도",
    required: true,
    multiple: false,
    values: [{ id: value, name: "ICE", priceDelta: 500 }],
  },
];
const save = (groups, stamp, actor = owner) =>
  db.query(
    "select public.replace_menu_item_order_options($1,$2,$3,$4,true,5000,$5::jsonb)",
    [site, item, actor, stamp, JSON.stringify(groups)],
  );
const initial = await timestamp();
await assert.rejects(
  save(options, initial, "66666666-6666-4666-8666-666666666666"),
  /OWNER_REQUIRED/,
);
await save(options, initial);
assert.equal(
  (await db.query("select orderable from menu_items where id=$1", [item]))
    .rows[0].orderable,
  true,
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from menu_order_option_values where status='active'",
    )
  ).rows[0].count,
  1,
);
await assert.rejects(save(options, initial), /ORDER_CONFIGURATION_CONFLICT/);
const current = await timestamp();
await assert.rejects(
  save(
    [
      ...options,
      {
        ...options[0],
        id: "77777777-7777-4777-8777-777777777777",
        name: "bad",
        values: [{ ...options[0].values[0], priceDelta: -10 }],
      },
    ],
    current,
  ),
  /INVALID_OPTION_VALUE/,
);
assert.equal(
  await timestamp(),
  current,
  "failed multi-group save rolls back item and earlier groups",
);
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from menu_order_option_groups",
    )
  ).rows[0].count,
  1,
);
await save([], current);
assert.equal(
  (
    await db.query("select status from menu_order_option_groups where id=$1", [
      group,
    ])
  ).rows[0].status,
  "archived",
);
assert.equal(
  (
    await db.query("select status from menu_order_option_values where id=$1", [
      value,
    ])
  ).rows[0].status,
  "archived",
);
for (const role of ["anon", "authenticated"]) {
  const result = await db.query(
    "select has_function_privilege($1,'public.replace_menu_item_order_options(uuid,uuid,uuid,timestamptz,boolean,integer,jsonb)','EXECUTE') as allowed",
    [role],
  );
  assert.equal(result.rows[0].allowed, false);
}
assert.equal(
  (
    await db.query(
      "select has_function_privilege('service_role','public.replace_menu_item_order_options(uuid,uuid,uuid,timestamptz,boolean,integer,jsonb)','EXECUTE') as allowed",
    )
  ).rows[0].allowed,
  true,
);
console.log(
  "PASS: owner scope, stale-write rejection, atomic rollback, archival and role grants (isolated PostgreSQL/WASM)",
);

await db.exec(`
create schema auth; create schema private; create table auth.users(id uuid primary key);
alter table public.menu_sites add column status text default 'published',add column settings jsonb default '{}';
create table public.menu_pages(id uuid primary key,menu_site_id uuid,visible boolean default true);
create table public.menu_categories(id uuid primary key,menu_site_id uuid,menu_page_id uuid,name text,course_price integer,course_price_visible boolean default true,visible boolean default true);
alter table public.menu_items add column name text default '테스트 라떼',add column price_label text,add column visible boolean default true,add column price_visible boolean default true,add column is_sold_out boolean default false,add column category_id uuid,add column menu_page_id uuid,add column sort_order integer default 0;
create table public.menu_tables(id uuid primary key,menu_site_id uuid,status text,unique(menu_site_id,id));
create table public.table_visit_sessions(id uuid primary key,menu_site_id uuid,menu_table_id uuid,expires_at timestamptz,revoked_at timestamptz,unique(menu_site_id,menu_table_id,id));
create table public.menu_promotions(id uuid primary key,menu_site_id uuid,type text,active boolean,starts_at timestamptz,ends_at timestamptz,schedule_type text,daily_start_time time,daily_end_time time,timezone text);
create table public.menu_promotion_items(id uuid primary key,promotion_id uuid,menu_item_id uuid,price_column_id uuid,visible boolean,sale_price integer);
`);
await db.exec(
  foundation.slice(
    foundation.indexOf("create table public.menu_customer_orders"),
  ),
);
const daily = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260713130607_add_time_sale_daily_windows.sql",
    import.meta.url,
  ),
  "utf8",
);
const activeFunction = daily.slice(
  daily.indexOf(
    "create or replace function public.is_menu_promotion_active_now",
  ),
);
await db.exec(activeFunction.slice(0, activeFunction.indexOf("$;") + 3));
await db.exec(
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20261018090357_add_course_postpay_orders.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const course = "88888888-8888-4888-8888-888888888888",
  session = "99999999-9999-4999-8999-999999999999",
  table = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
await db.query(
  "insert into menu_categories(id,menu_site_id,name,course_price) values($1,$2,'Aube signature',185000)",
  [course, site],
);
await db.query("insert into menu_tables values($1,$2,'active')", [table, site]);
await db.query(
  "insert into table_visit_sessions values($1,$2,$3,now()+interval '1 hour',null)",
  [session, site, table],
);
await db.query("update menu_sites set settings=$1 where id=$2", [
  JSON.stringify({
    table_order: {
      orderEnabled: true,
      postpayEnabled: true,
      orderableCourseIds: [course],
    },
  }),
  site,
]);
const submit = (lines, request = crypto.randomUUID(), sessionId = session) =>
  db.query(
    "select * from public.submit_postpay_order_v2($1,$2,$3,null,$4::jsonb)",
    [site, sessionId, request, JSON.stringify(lines)],
  );
const request = crypto.randomUUID();
const lines = [
  { menuCategoryId: course, quantity: 2, optionValueIds: [] },
  { menuItemId: item, quantity: 1, optionValueIds: [] },
];
const created = (await submit(lines, request)).rows[0];
assert.equal(created.total_amount, 375000);
assert.equal(created.payment_status, "unpaid");
assert.equal(created.is_duplicate, false);
assert.equal((await submit(lines, request)).rows[0].is_duplicate, true);
assert.equal(
  (
    await db.query(
      "select count(*)::int as count from menu_customer_order_items where menu_item_id is null",
    )
  ).rows[0].count,
  1,
);
const ordersBefore = async () =>
  (await db.query("select count(*)::int as count from menu_customer_orders"))
    .rows[0].count;
const before = await ordersBefore();
await assert.rejects(
  submit([{ menuCategoryId: course, quantity: 1, optionValueIds: [value] }]),
  /Course options/,
);
await assert.rejects(
  submit(lines, crypto.randomUUID(), "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
  /session is not active/,
);
await db.query("update menu_categories set visible=false where id=$1", [
  course,
]);
await assert.rejects(submit(lines), /not orderable/);
await db.query("update menu_categories set visible=true where id=$1", [course]);
await db.query(
  "update menu_sites set settings=jsonb_set(settings,'{table_order,orderableCourseIds}','[]') where id=$1",
  [site],
);
await assert.rejects(submit(lines), /not orderable/);
assert.equal(
  await ordersBefore(),
  before,
  "rejected course/session/selection requests create no orders",
);
await save(options, await timestamp());
await assert.rejects(
  submit([{ menuItemId: item, quantity: 1, optionValueIds: [] }]),
  /selection limits/,
);
const promotion = crypto.randomUUID();
await db.query(
  "insert into menu_promotions(id,menu_site_id,type,active,starts_at,ends_at,schedule_type,timezone) values($1,$2,'time_sale',true,now()-interval '1 hour',now()+interval '1 hour','once','Asia/Seoul')",
  [promotion, site],
);
await db.query(
  "insert into menu_promotion_items values($1,$2,$3,null,true,4000)",
  [crypto.randomUUID(), promotion, item],
);
assert.equal(
  (await submit([{ menuItemId: item, quantity: 2, optionValueIds: [value] }]))
    .rows[0].total_amount,
  9000,
  "server snapshots active base time sale and current option prices",
);
for (const role of ["anon", "authenticated"])
  assert.equal(
    (
      await db.query(
        "select has_function_privilege($1,'public.submit_postpay_order_v2(uuid,uuid,uuid,text,jsonb)','EXECUTE') as allowed",
        [role],
      )
    ).rows[0].allowed,
    false,
  );
console.log(
  "PASS: item/course postpay, immutable snapshots, required options, base time sales, idempotency, revoked/missing session and hidden/unselected course rollback",
);

await db.close();
