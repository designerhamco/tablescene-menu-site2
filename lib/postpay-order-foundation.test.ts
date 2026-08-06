import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260806124512_add_postpay_order_foundation.sql",
  import.meta.url,
);

test("postpay order schema keeps public tables server-only and RLS-forced", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  const tables = [
    "menu_order_option_groups",
    "menu_order_option_values",
    "menu_customer_orders",
    "menu_customer_order_items",
    "menu_customer_order_item_options",
  ];

  for (const table of tables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security;`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role;`));
  }
  assert.doesNotMatch(sql, /grant .* to anon|grant .* to authenticated/i);
  assert.doesNotMatch(sql, /grant delete|grant all/i);
});

test("approved cart limits, snapshots, and idempotency are database constraints", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /add column orderable boolean not null default false/);
  assert.match(sql, /char_length\(request_text\) between 1 and 300/);
  assert.match(sql, /quantity between 1 and 20/);
  assert.match(sql, /display_order between 0 and 19/);
  assert.match(sql, /v_line_count >= 20/);
  assert.match(sql, /v_total_quantity \+ new\.quantity > 50/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /unique \(table_visit_session_id, client_request_id\)/);
  assert.match(sql, /item_name_snapshot text not null/);
  assert.match(sql, /line_total_snapshot = unit_price_snapshot \* quantity/);
  assert.match(sql, /payment_status text not null default 'unpaid'/);
  assert.match(sql, /total_amount = subtotal_amount/);
});

test("order options are separate from display price structures and tenant-bound", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /create table public\.menu_order_option_groups/);
  assert.match(sql, /create table public\.menu_order_option_values/);
  assert.match(sql, /foreign key \(menu_site_id, menu_item_id\)/);
  assert.match(sql, /foreign key \(menu_site_id, option_group_id\)/);
  assert.doesNotMatch(sql, /menu_item_price_options|menu_category_price_columns/);
});

test("customer submission history has no runtime update or delete path", async () => {
  const sql = await readFile(migrationUrl, "utf8");

  assert.match(sql, /grant select, insert on table public\.menu_customer_order_items to service_role/);
  assert.match(sql, /grant select, insert on table public\.menu_customer_order_item_options to service_role/);
  assert.doesNotMatch(sql, /grant select, insert, update on table public\.menu_customer_order_items/);
  assert.doesNotMatch(sql, /grant select, insert, update on table public\.menu_customer_order_item_options/);
});
