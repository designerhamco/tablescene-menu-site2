import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260806142627_add_call_mvp_foundation.sql",
  import.meta.url,
);

const callManagement = await import(
  new URL("./call-management.ts", import.meta.url).href
) as typeof import("./call-management");
const callRuntime = await import(
  new URL("./call-runtime.ts", import.meta.url).href
) as typeof import("./call-runtime");

test("Call MVP schema is server-only, RLS-forced, and service-role scoped", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /alter table public\.menu_customer_calls enable row level security;/);
  assert.match(sql, /alter table public\.menu_customer_calls force row level security;/);
  assert.match(sql, /revoke all on table public\.menu_customer_calls from public, anon, authenticated, service_role;/);
  assert.match(sql, /grant select, insert, update on table public\.menu_customer_calls to service_role;/);
  assert.match(sql, /revoke all on sequence public\.menu_customer_calls_call_number_seq from public, anon, authenticated, service_role;/);
  assert.doesNotMatch(sql, /grant .* to anon|grant .* to authenticated|grant delete/i);
});

test("Call MVP RPC enforces preset, dedupe, cooldown, hourly cap, and pending-only customer cancellation", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /call_type = 'staff'/);
  assert.match(sql, /unique index menu_customer_calls_unresolved_session_type_idx[\s\S]*pending', 'acknowledged'/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /interval '2 minutes'/);
  assert.match(sql, />= 10/);
  assert.match(sql, /interval '1 hour'/);
  assert.match(sql, /and status = 'pending'/);
  assert.match(sql, /CALL_NOT_CANCELLABLE/);
});

test("Call MVP functions use an empty search path and execute only through service role", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /submit_staff_call[\s\S]*security invoker\s+set search_path = ''/);
  assert.match(sql, /cancel_pending_staff_call[\s\S]*security invoker\s+set search_path = ''/);
  assert.match(sql, /revoke all on function public\.submit_staff_call[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.submit_staff_call[\s\S]*to service_role/);
  assert.match(sql, /revoke all on function public\.cancel_pending_staff_call[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.cancel_pending_staff_call[\s\S]*to service_role/);
});

test("Call runtime fails closed and requires a site allowlist", () => {
  const siteId = "11111111-1111-4111-8111-111111111111";
  assert.equal(callRuntime.isCallRuntimeEnabled(undefined), false);
  assert.equal(callRuntime.isCallRuntimeEnabledForSite(siteId, {
    enabled: true,
    allowedSiteIds: new Set([siteId]),
  }), true);
  assert.equal(callRuntime.isCallRuntimeEnabledForSite(siteId, {
    enabled: false,
    allowedSiteIds: new Set([siteId]),
  }), false);
  assert.equal(callRuntime.isCallRuntimeEnabledForSite(siteId, {
    enabled: true,
    allowedSiteIds: new Set(),
  }), false);
});

test("staff calls move only pending to acknowledged to completed", () => {
  assert.equal(callManagement.assertStaffCallTransition("pending", "acknowledged"), "acknowledged");
  assert.equal(callManagement.assertStaffCallTransition("acknowledged", "completed"), "completed");
  assert.equal(callManagement.getNextStaffCallStatus("completed"), null);
  assert.equal(callManagement.getNextStaffCallStatus("cancelled"), null);
  assert.throws(() => callManagement.assertStaffCallTransition("pending", "completed"), /순서로만/);
  assert.throws(() => callManagement.assertStaffCallTransition("cancelled", "acknowledged"), /순서로만/);
});
