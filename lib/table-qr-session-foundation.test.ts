import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const {
  buildTableQrPath,
  createTableAccessToken,
  createTableVisitSessionExpiry,
  hashTableAccessToken,
  isValidTableAccessToken,
  isValidTableQrIdentifier,
  isValidTableQrPublicId,
  MENU_TABLE_LIMIT,
  TABLE_VISIT_SESSION_MAX_AGE_SECONDS,
} = await import(
  new URL("./table-qr-session-tokens.ts", import.meta.url).href
) as typeof import("./table-qr-session-tokens");

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = join(
  repositoryRoot,
  "supabase/migrations/20260806105623_add_table_qr_session_foundation.sql",
);
const persistentQrMigrationPath = join(
  repositoryRoot,
  "supabase/migrations/20260901072048_add_persistent_table_qr_public_id.sql",
);

test("table and visit-session tokens are random, URL-safe, and hash-only", () => {
  const first = createTableAccessToken();
  const second = createTableAccessToken();

  assert.equal(isValidTableAccessToken(first), true);
  assert.equal(isValidTableAccessToken(second), true);
  assert.notEqual(first, second);
  assert.match(hashTableAccessToken(first), /^[0-9a-f]{64}$/);
  assert.equal(hashTableAccessToken(first), hashTableAccessToken(first));
  assert.throws(() => hashTableAccessToken("short"), /Invalid table access token/);
});

test("approved table, QR path, and 12-hour session constants stay aligned", () => {
  const now = new Date("2026-08-06T00:00:00.000Z");
  const token = createTableAccessToken();

  assert.equal(MENU_TABLE_LIMIT, 100);
  assert.equal(TABLE_VISIT_SESSION_MAX_AGE_SECONDS, 43_200);
  assert.equal(
    createTableVisitSessionExpiry(now).toISOString(),
    "2026-08-06T12:00:00.000Z",
  );
  assert.equal(buildTableQrPath(token), `/table/${token}`);
  const publicId = "bdb5d7b6-5447-4bdd-8e37-0b57ff221727";
  assert.equal(isValidTableQrPublicId(publicId), true);
  assert.equal(isValidTableQrIdentifier(publicId), true);
  assert.equal(buildTableQrPath(publicId), `/table/${publicId}`);
  assert.throws(() => buildTableQrPath("not a token"), /Invalid table QR identifier/);
});

test("migration keeps both tables server-only and enforces approved limits", () => {
  const sql = readFileSync(migrationPath, "utf8");

  assert.match(sql, /create table public\.menu_tables/);
  assert.match(sql, /create table public\.table_visit_sessions/);
  assert.match(sql, /v_table_count >= 100/);
  assert.match(sql, /expires_at <= created_at \+ interval '12 hours'/);
  assert.match(sql, /token_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(sql, /alter table public\.menu_tables enable row level security/);
  assert.match(sql, /alter table public\.table_visit_sessions enable row level security/);
  assert.match(sql, /alter table public\.menu_tables force row level security/);
  assert.match(sql, /alter table public\.table_visit_sessions force row level security/);
  assert.match(sql, /revoke all on table public\.menu_tables from public, anon, authenticated/);
  assert.match(sql, /revoke all on table public\.table_visit_sessions from public, anon, authenticated/);
  assert.match(sql, /revoke all on table public\.menu_tables from service_role/);
  assert.match(sql, /revoke all on table public\.table_visit_sessions from service_role/);
  assert.match(sql, /grant select, insert, update on table public\.menu_tables to service_role/);
  assert.match(sql, /grant select, insert, update on table public\.table_visit_sessions to service_role/);
  assert.doesNotMatch(sql, /grant .*delete.* to service_role/i);
  assert.doesNotMatch(sql, /grant .* to anon/i);
  assert.doesNotMatch(sql, /grant .* to authenticated/i);
});

test("persistent table QR migration adds a public UUID and rotates it with the legacy token", () => {
  const sql = readFileSync(persistentQrMigrationPath, "utf8");

  assert.match(sql, /add column qr_public_id uuid not null default gen_random_uuid\(\)/);
  assert.match(sql, /create unique index menu_tables_qr_public_id_idx/);
  assert.match(sql, /new\.qr_public_id := gen_random_uuid\(\)/);
  assert.match(sql, /old\.token_hash is distinct from new\.token_hash/);
  assert.match(sql, /revoke all on function private\.revoke_table_visit_sessions\(\)/);
  assert.doesNotMatch(sql, /grant .* to anon/i);
  assert.doesNotMatch(sql, /grant .* to authenticated/i);
});
