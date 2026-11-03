import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as validation from "./menu-table-validation";

const siteId = "11111111-1111-4111-8111-111111111111";
const tableId = "22222222-2222-4222-8222-222222222222";
const row = { id: tableId, label: "창가", qr_public_id: "33333333-3333-4333-8333-333333333333", display_order: 0, status: "disabled", archived_at: null, token_rotated_at: "2026-11-01T00:00:00Z", created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" };

function fixture({ error = null as null | { code: string; message?: string }, missing = false, denied = false } = {}) {
  const filters: unknown[] = [];
  const writes: Record<string, unknown>[] = [];
  const permissions: unknown[] = [];
  let listStatuses: string[] = [];
  const query = {
    select() { return this; },
    eq(key: string, value: unknown) { filters.push([key, value]); return this; },
    in(_key: string, values: string[]) { listStatuses = values; return this; },
    order() { return this; },
    then(resolve: (value: unknown) => void) {
      resolve({ data: [row, { ...row, id: "44444444-4444-4444-8444-444444444444", status: "archived", archived_at: "2026-11-02T00:00:00Z" }].filter(r => listStatuses.includes(r.status)), error: null });
    },
    update(value: Record<string, unknown>) { writes.push(value); return this; },
    async maybeSingle() { return { data: missing ? null : row, error }; },
  };
  const db = { from(name: string) {
    if (name === "menu_sites") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: siteId, name: "매장", slug: "store", status: "published", template_key: "cafe_design_a" }, error: null }; } };
    assert.equal(name, "menu_tables");
    return query;
  } };
  const dependencies: Record<string, unknown> = {
    "server-only": {},
    "@/lib/menu-table-management": { ...validation, createMenuTableTokenMaterial() { throw new Error("Tokens must not rotate on restore"); } },
    "@/lib/dining-product-tiers": { getDiningTemplateFeatures: () => ({ smartCall: true }) },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => true },
    "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/server/menu-site-access-service": {
      requireMenuSitePermission: async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("permission denied"); },
      getMenuSiteAccessStateForMenuSite: async () => ({ planType: "business_basic", canUseWriteActions: true, canEdit: true }),
      requireMenuSiteWriteAccess: async (...args: unknown[]) => { permissions.push(args); return { context: { actorUserId: "owner" }, supabase: db }; },
    },
  };
  const source = readFileSync(new URL("./server/menu-table-management-service.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return { service: loaded.exports as typeof import("./server/menu-table-management-service"), filters, writes, permissions };
}

test("보관 테이블은 관리 화면에서만 명시적으로 조회하며 QR·대시보드의 운영 목록에는 섞이지 않는다", async () => {
  const f = fixture();
  const current = await f.service.listMenuTables(siteId);
  assert.equal(current.tables.length, 1);
  assert.deepEqual(current.archivedTables, []);
  const all = await f.service.listMenuTables(siteId, { includeArchived: true });
  assert.equal(all.tables.length, 1);
  assert.deepEqual(all.archivedTables, [{ id: "44444444-4444-4444-8444-444444444444", label: "창가", archivedAt: "2026-11-02T00:00:00Z" }]);
});

test("복원은 대상 매장·보관 상태로 제한하고 비활성으로 복원하며 QR과 종료된 방문 세션을 변경하지 않는다", async () => {
  const f = fixture();
  await f.service.restoreMenuTable({ menuSiteId: siteId, tableId, label: " 창가 2 " });
  assert.deepEqual(f.writes, [{ label: "창가 2", status: "disabled", archived_at: null, updated_by: "owner" }]);
  assert.deepEqual(f.filters, [["menu_site_id", siteId], ["id", tableId], ["status", "archived"]]);
  assert.deepEqual(f.permissions, [[siteId, "table.manage"], [siteId, "table.manage", "menu_table_management"]]);
});

test("복원 권한·입력 검증과 이름 충돌·테이블 제한·이미 복원된 상태 오류를 보존한다", async () => {
  for (const [options, message] of [
    [{ denied: true }, /permission denied/],
    [{ error: { code: "23505" } }, /같은 이름/],
    [{ error: { code: "23514", message: "menu table limit exceeded" } }, /최대 100개/],
    [{ missing: true }, /보관된 테이블을 찾을/],
  ] as const) {
    const f = fixture(options);
    await assert.rejects(f.service.restoreMenuTable({ menuSiteId: siteId, tableId, label: "창가" }), message);
    if (options.denied) assert.deepEqual(f.writes, []);
  }
  const f = fixture();
  await assert.rejects(f.service.restoreMenuTable({ menuSiteId: siteId, tableId, label: " " }), /1자 이상/);
  assert.deepEqual(f.writes, []);
});
