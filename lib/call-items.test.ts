import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const callItems = await import(
  new URL("./call-items.ts", import.meta.url).href
) as typeof import("./call-items");

const migrationUrl = new URL(
  "../supabase/migrations/20260828143000_add_store_call_items.sql",
  import.meta.url,
);

test("default call items are independent copies in the expected order", () => {
  const first = callItems.getDefaultStaffCallItems();
  const second = callItems.getDefaultStaffCallItems();
  assert.deepEqual(first.map((item) => item.key), [
    "water",
    "tableware",
    "table_cleanup",
    "staff",
  ]);
  first[0].label = "변경";
  assert.equal(second[0].label, "물 요청");
});

test("legacy six-item virtual defaults collapse to the refined four-item starter set", () => {
  const legacy = callItems.replaceLegacyDefaultStaffCallItems([
    { key: "staff", label: "직원 호출", sortOrder: 0, active: true },
    { key: "water", label: "물 요청", sortOrder: 1, active: true },
    { key: "apron", label: "앞치마 요청", sortOrder: 2, active: true },
    { key: "tableware", label: "식기 요청", sortOrder: 3, active: true },
    { key: "table_cleanup", label: "테이블 정리", sortOrder: 4, active: true },
    { key: "order_help", label: "주문 도움", sortOrder: 5, active: true },
  ]);
  assert.deepEqual(legacy.map((item) => item.key), ["water", "tableware", "table_cleanup", "staff"]);

  const custom = [{ key: "staff", label: "직원 불러주세요", sortOrder: 0, active: true }];
  assert.equal(callItems.replaceLegacyDefaultStaffCallItems(custom), custom);
});

test("guest call choices keep the generic staff fallback last without changing other configured order", () => {
  const configured = [
    { key: "staff", label: "직원 호출", sortOrder: 0, active: true },
    { key: "water", label: "물 요청", sortOrder: 1, active: true },
    { key: "custom_napkin", label: "냅킨 요청", sortOrder: 2, active: true },
  ];
  const ordered = callItems.orderStaffCallItemsForGuest(configured);

  assert.deepEqual(ordered.map((item) => item.key), ["water", "custom_napkin", "staff"]);
  assert.deepEqual(configured.map((item) => item.key), ["staff", "water", "custom_napkin"]);
});

test("call item input normalization constrains count, labels, duplicates, order, and active state", () => {
  const normalized = callItems.normalizeStaffCallItems([
    { key: "water", label: " 물 요청 ", sortOrder: 8, active: true },
    { key: "staff", label: "직원 호출", sortOrder: 4, active: false },
  ]);
  assert.deepEqual(normalized, [
    { key: "water", label: "물 요청", sortOrder: 0, active: true },
    { key: "staff", label: "직원 호출", sortOrder: 1, active: false },
  ]);
  assert.throws(() => callItems.normalizeStaffCallItems([]), /1개 이상/);
  assert.throws(() => callItems.normalizeStaffCallItems([
    { key: "staff", label: "직원 호출", active: false },
  ]), /1개 이상 남겨/);
  assert.throws(() => callItems.normalizeStaffCallItems([
    { key: "staff", label: "직원 호출", active: true },
    { key: "staff", label: "물 요청", active: true },
  ]), /중복된/);
  assert.throws(() => callItems.normalizeStaffCallItems([
    { key: "staff", label: "직원 호출", active: true },
    { key: "water", label: "직원 호출", active: true },
  ]), /같은 이름/);
});

test("call item schema is server-only, forced-RLS, and never hard-deletes configuration", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create table public\.menu_call_items/);
  assert.match(sql, /alter table public\.menu_call_items enable row level security;/);
  assert.match(sql, /alter table public\.menu_call_items force row level security;/);
  assert.match(sql, /revoke all on table public\.menu_call_items from public, anon, authenticated, service_role;/);
  assert.match(sql, /grant select, insert, update on table public\.menu_call_items to service_role;/);
  assert.doesNotMatch(sql, /grant delete|delete from public\.menu_call_items/i);
  assert.match(sql, /set is_active = false,[\s\S]*archived_at = pg_catalog\.now\(\)/);
});

test("call item RPC provides virtual defaults and validates an atomic per-store replacement", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /list_menu_call_items[\s\S]*'staff'::text, '직원 호출'/);
  assert.match(sql, /replace_menu_call_items[\s\S]*pg_advisory_xact_lock/);
  assert.match(sql, /v_item_count < 1 or v_item_count > 12/);
  assert.match(sql, /At least one call item must be active/);
  assert.match(sql, /on conflict \(menu_site_id, item_key\) do update/);
  assert.match(sql, /revoke all on function public\.replace_menu_call_items\(uuid, jsonb\)[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.replace_menu_call_items\(uuid, jsonb\) to service_role/);
  assert.doesNotMatch(sql, /insert into public\.menu_call_items[\s\S]*select[\s\S]*from public\.menu_sites/i);
});

test("selected call item is validated and snapshotted without weakening existing call limits", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /add column request_key text not null default 'staff'/);
  assert.match(sql, /add column request_label text not null default '직원 호출'/);
  assert.match(sql, /submit_staff_call\([\s\S]*p_call_item_key text[\s\S]*list_menu_call_items\(p_menu_site_id, false\)/);
  assert.match(sql, /CALL_ITEM_UNAVAILABLE/);
  assert.match(sql, /v_item\.item_key,[\s\S]*v_item\.label/);
  assert.match(sql, /status in \('pending', 'acknowledged'\)/);
  assert.match(sql, /interval '2 minutes'/);
  assert.match(sql, />= 10/);
  assert.match(sql, /interval '1 hour'/);
  assert.match(sql, /revoke all on function public\.submit_staff_call\(uuid, uuid, text\)[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.submit_staff_call\(uuid, uuid, text\) to service_role/);
});
