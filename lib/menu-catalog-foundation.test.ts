import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260828040033_add_shared_menu_catalog.sql", import.meta.url),
  "utf8",
);

test("shared menu catalog migration is additive for existing menu rows", () => {
  const schemaPreamble = migration.split("create or replace function private.sync_linked_menu_category_core")[0] ?? "";
  assert.match(migration, /add column if not exists catalog_category_id uuid/i);
  assert.match(migration, /add column if not exists catalog_item_id uuid/i);
  assert.match(migration, /create table if not exists public\.menu_site_content_links/i);
  assert.doesNotMatch(schemaPreamble, /update public\.menu_(?:items|categories)/i);
});

test("catalog import is owner-only, atomic, and draft-target only", () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /v_source_owner_id <> v_actor_user_id/i);
  assert.match(migration, /v_target_owner_id <> v_actor_user_id/i);
  assert.match(migration, /v_target_status <> 'draft'/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /source and target menu sites must differ/i);
});

test("linked sync preserves channel-specific placement and settings", () => {
  assert.match(migration, /sync_linked_menu_item_core/i);
  assert.match(migration, /sync_linked_menu_category_core/i);
  assert.match(migration, /sync_linked_menu_item_translation/i);
  assert.doesNotMatch(
    migration.match(/create or replace function private\.sync_linked_menu_item_core[\s\S]*?\$\$;/i)?.[0] ?? "",
    /category_id = new\.category_id|visible = new\.visible|sort_order = new\.sort_order|orderable = new\.orderable/i,
  );
  assert.match(migration, /delete from public\.menu_promotions\s+where menu_site_id = p_target_menu_site_id/i);
});

test("catalog sync cannot cross account ownership boundaries", () => {
  assert.match(migration, /target_site\.user_id = v_owner_user_id/g);
  assert.match(migration, /owner_user_id = auth\.uid\(\)/g);
  assert.match(migration, /revoke all on schema private from public, anon, authenticated/i);
});

test("active link participants cannot be hard-deleted while shared assets may depend on them", () => {
  assert.match(migration, /protect_active_linked_menu_delete/i);
  assert.match(migration, /old\.id in \(content_link\.source_menu_site_id, content_link\.target_menu_site_id\)/i);
  assert.match(migration, /content_link\.status = 'active'/i);
  assert.match(migration, /active linked menu content must be disconnected before deleting menu site/i);
});
