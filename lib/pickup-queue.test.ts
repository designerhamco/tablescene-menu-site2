import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertPickupQueueTransition,
  getPickupQueueNextStatus,
  normalizePickupQueueNumber,
  PickupQueueInputError,
} from "./pickup-queue";
import {
  getPickupQueueAllowedSiteIds,
  isPickupQueueRuntimeEnabledForSite,
  isPickupQueueTemplate,
} from "./pickup-queue-runtime";

const SITE_ID = "11111111-1111-4111-8111-111111111111";

test("수동 대기번호는 1부터 9999까지만 허용한다", () => {
  assert.equal(normalizePickupQueueNumber("1"), 1);
  assert.equal(normalizePickupQueueNumber(9999), 9999);
  for (const value of [0, 10000, 1.5, "", "1번"]) {
    assert.throws(() => normalizePickupQueueNumber(value), PickupQueueInputError);
  }
});

test("대기번호 상태는 waiting에서 ready, ready에서 completed로만 전진한다", () => {
  assert.equal(assertPickupQueueTransition("waiting", "ready"), "ready");
  assert.equal(assertPickupQueueTransition("ready", "completed"), "completed");
  assert.equal(assertPickupQueueTransition("waiting", "cancelled"), "cancelled");
  assert.equal(getPickupQueueNextStatus("waiting"), "ready");
  assert.equal(getPickupQueueNextStatus("ready"), "completed");
  assert.equal(getPickupQueueNextStatus("completed"), null);
  assert.throws(() => assertPickupQueueTransition("completed", "ready"), PickupQueueInputError);
});

test("대기번호 runtime은 Display 메뉴판과 명시적 site allowlist에서만 열린다", () => {
  assert.equal(isPickupQueueTemplate("display_menu_a"), true);
  assert.equal(isPickupQueueTemplate("dining_aube_table_a"), false);
  assert.deepEqual([...getPickupQueueAllowedSiteIds(`bad,${SITE_ID}`)], [SITE_ID]);
  assert.equal(isPickupQueueRuntimeEnabledForSite(SITE_ID), false);
  assert.equal(isPickupQueueRuntimeEnabledForSite(SITE_ID, {
    enabled: true,
    allowedSiteIds: new Set([SITE_ID]),
  }), true);
});

test("대기번호 migration은 server-only, RLS 강제, hard delete 금지 계약을 유지한다", () => {
  const sql = readFileSync(
    new URL("../supabase/migrations/20260901030618_add_manual_pickup_queue.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /create table public\.menu_pickup_queue_entries/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /force row level security/);
  assert.match(sql, /revoke all on table public\.menu_pickup_queue_entries from public, anon, authenticated, service_role/);
  assert.match(sql, /grant select, insert, update on table public\.menu_pickup_queue_entries to service_role/);
  assert.doesNotMatch(sql, /grant delete|delete from public\.menu_pickup_queue_entries/i);
  assert.match(sql, /source in \('manual', 'external'\)/);
});
