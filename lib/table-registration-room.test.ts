import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as validation from "./menu-table-validation";
import * as policy from "./order-point-policy";
import * as qrRotation from "./qr-rotation-policy";
import { parseOrderPointDeletionSummary } from "./order-point-deletion";

const siteId = "11111111-1111-4111-8111-111111111111";
const roomId = "22222222-2222-4222-8222-222222222222";
const tableId = "33333333-3333-4333-8333-333333333333";
const document = { rooms: [{ id: roomId, name: "룸 1", aspectRatio: 4 / 3 }], placements: [] };
function fixture({ stored = document as unknown, readError = false, denied = false, conflict = false } = {}) {
  const writes: Record<string, unknown>[] = [], roomScopes: unknown[] = [], permissions: unknown[] = [];
  let tokens = 0, roomReads = 0;
  const db = { from(table: string) {
    if (table === "menu_sites") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: siteId, slug: "test", template_key: "cafe_design_a" }, error: null }; } };
    if (table === "menu_floor_plans") return { select() { return this; }, eq(key: string, value: unknown) { roomScopes.push([key, value]); return this; }, async maybeSingle() { roomReads++; return { data: stored === null ? null : { document: stored }, error: readError ? { code: "PGRST205" } : null }; } };
    assert.equal(table, "menu_tables");
    return { insert(value: Record<string, unknown>) { writes.push(value); return this; }, select() { return this; }, async maybeSingle() { return { data: { id: tableId, label: "1번 테이블", qr_public_id: roomId, status: "active", display_order: 0, created_at: "2026-11-06", updated_at: "2026-11-06", token_rotated_at: "2026-11-06" }, error: conflict ? { code: "23505" } : null }; } };
  } };
  const deps: Record<string, unknown> = {
    "server-only": {}, "@/lib/qr-rotation-policy": qrRotation, "@/lib/order-point-deletion": { parseOrderPointDeletionSummary }, "@/lib/order-point-policy": policy,
    "@/lib/menu-table-management": { ...validation, createMenuTableTokenMaterial() { tokens++; return { tokenHash: "test-token-hash" }; } },
    "@/lib/dining-product-tiers": { getDiningTemplateFeatures: () => ({ smartCall: true }) },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => true },
    "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/server/menu-site-access-service": {
      requireMenuSitePermission: async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("permission denied"); return { actorUserId: "owner" }; },
      getMenuSiteAccessStateForMenuSite: async () => ({ planType: "business_basic", canUseWriteActions: true, canEdit: true }),
      requireMenuSiteWriteAccess: async (...args: unknown[]) => { permissions.push(args); return { context: { actorUserId: "owner" }, supabase: db }; },
    },
  };
  const code = ts.transpileModule(readFileSync(new URL("./server/menu-table-management-service.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in deps, name); return deps[name]; }, loaded, loaded.exports);
  return { service: loaded.exports as typeof import("./server/menu-table-management-service"), writes, roomScopes, permissions, tokens: () => tokens, roomReads: () => roomReads };
}

test("룸 없음·비정상 문서·조회 실패는 토큰 생성과 테이블/키오스크 쓰기 전에 차단한다", async () => {
  for (const stored of [null, {}, { rooms: [] }, { rooms: [{ id: "invalid", name: "룸 1" }] }, { rooms: [null] }]) {
    for (const kind of ["table", "kiosk"] as const) {
      const f = fixture({ stored });
      await assert.rejects(f.service.createMenuTable({ menuSiteId: siteId, label: "1번 테이블", kind }), { code: "ROOM_REQUIRED" });
      assert.equal(f.writes.length, 0); assert.equal(f.tokens(), 0);
      assert.deepEqual(f.roomScopes, [["menu_site_id", siteId]]);
    }
  }
  const failed = fixture({ readError: true });
  await assert.rejects(failed.service.createMenuTable({ menuSiteId: siteId, label: "1번 테이블" }), /룸 정보를 확인하지 못했습니다/);
  assert.equal(failed.writes.length, 0); assert.equal(failed.tokens(), 0);
});

test("룸이 있으면 기존 권한·등록·QR와 키오스크 채널 초기화를 유지한다", async () => {
  for (const kind of ["table", "kiosk"] as const) {
    const f = fixture();
    const created = await f.service.createMenuTable({ menuSiteId: siteId, label: "1번 테이블", kind });
    assert.equal(created.table.id, tableId); assert.equal(created.qrPath, `/table/${roomId}`);
    assert.equal(f.writes.length, 1); assert.equal(f.tokens(), 1);
    assert.equal(f.writes[0].menu_site_id, siteId);
    if (kind === "kiosk") assert.equal(f.writes[0].customer_order_enabled, false);
    assert.deepEqual(f.permissions[0], [siteId, "table.manage"]);
    assert.deepEqual(f.permissions[1], [siteId, "table.manage", "menu_table_management"]);
  }
  const denied = fixture({ denied: true });
  await assert.rejects(denied.service.createMenuTable({ menuSiteId: siteId, label: "1번 테이블" }), /permission denied/);
  assert.equal(denied.roomReads(), 0); assert.equal(denied.writes.length, 0);
  const duplicate = fixture({ conflict: true });
  await assert.rejects(duplicate.service.createMenuTable({ menuSiteId: siteId, label: "1번 테이블" }), { code: "TABLE_CONFLICT" });
});
