import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260806131244_add_submit_postpay_order_rpc.sql",
  import.meta.url,
);

test("atomic postpay RPC is service-role only and security-definer hardened", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create or replace function public\.submit_postpay_order/);
  assert.match(sql, /language plpgsql\s+security definer\s+set search_path = ''/);
  assert.match(sql, /revoke all on function public\.submit_postpay_order[\s\S]*from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.submit_postpay_order[\s\S]*to service_role/);
});

test("atomic postpay RPC revalidates session, menu availability, options, and idempotency", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /table_visit_session_id = p_table_visit_session_id[\s\S]*client_request_id = p_client_request_id/);
  assert.match(sql, /session_row\.revoked_at is null[\s\S]*session_row\.expires_at > pg_catalog\.now\(\)/);
  assert.match(sql, /table_row\.status = 'active'[\s\S]*site_row\.status = 'published'/);
  assert.match(sql, /item\.visible = true[\s\S]*item\.orderable = true[\s\S]*item\.is_sold_out = false/);
  assert.match(sql, /option_group\.is_required[\s\S]*option_group\.max_selections/);
  assert.match(sql, /insert into public\.menu_customer_orders[\s\S]*insert into public\.menu_customer_order_items[\s\S]*insert into public\.menu_customer_order_item_options/);
});
