import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { hasMenuSitePermission, MenuSiteAccessError, resolvePermissionsForAccessRole } from "./menu-site-permissions";
import { normalizeMenuTableId } from "./menu-table-validation";

function readSource(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}
function serverModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const output = ts.transpileModule(readSource(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)((name: string) => {
    if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports as T;
}
const menuId = "11111111-1111-4111-8111-111111111111";
const table = { id: "table-1", label: "1번 테이블", status: "active", qrPath: "/table/public-id", tokenRotatedAt: "date", displayOrder: 1, createdAt: "date", updatedAt: "date" };
function fixture({ qr = true, tables = true, runtime = true, active = true, published = true, supported = true, tableError = false, authError = false, empty = false } = {}) {
  const scopes: string[][] = [];
  const tableReads: string[] = [];
  const query = {
    select(columns: string) { assert.equal(columns, "id, name, slug, status, template_key"); return this; },
    eq(column: string, id: string) { scopes.push([column, id]); return this; },
    async maybeSingle() { return { data: { id: menuId, name: "QA", slug: "qa", status: published ? "published" : "draft", template_key: "cafe_design_a" }, error: null }; },
  };
  const service = serverModule<typeof import("./server/menu-qr-management-service")>("lib/server/menu-qr-management-service.ts", {
    "server-only": {},
    "@/lib/dining-product-tiers": { getDiningTemplateFeatures: () => ({ smartCall: supported }) },
    "@/lib/menu-table-validation": { normalizeMenuTableId },
    "@/lib/menu-site-permissions": { hasMenuSitePermission, MenuSiteAccessError },
    "@/lib/server/menu-site-access-service": {
      requireMenuSitePermission: async (id: string, permission: string) => {
        assert.equal(id, menuId); assert.equal(permission, "menu.read");
        if (authError) throw new MenuSiteAccessError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
        return { menuSiteId: menuId, actorUserId: "staff", accessRole: "viewer", isOwner: false, staffAccessAllowed: true,
          permissions: resolvePermissionsForAccessRole("viewer", { allow: [...(qr ? ["qr.manage"] : []), ...(tables ? ["table.manage"] : [])], deny: [] }) };
      },
      getMenuSiteAccessStateForMenuSite: async () => ({ planType: "business_basic", canDownloadQr: active && published, canUseWriteActions: active, canEdit: active, message: "이용 기간이 종료되었습니다." }),
    },
    "@/lib/server/menu-table-management-service": { listMenuTables: async (id: string) => { tableReads.push(id); if (tableError) throw new Error("table read failed"); return { tables: empty ? [] : [table] }; } },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from(name: string) { assert.equal(name, "menu_sites"); return query; } }) },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => runtime },
  });
  return { service, scopes, tableReads };
}

test("QR 팝업은 메뉴판별 범위로 대표 QR과 기존 테이블 QR을 조회한다", async () => {
  const f = fixture();
  const data = await f.service.getMenuQrManagementPageData(menuId);
  assert.equal(data.canDownloadRepresentativeQr, true);
  assert.equal(data.canManageTables, true);
  assert.deepEqual(f.scopes, [["id", menuId]]);
  assert.deepEqual(f.tableReads, [menuId]);
  assert.deepEqual(data.tables, [table]);
  const empty = fixture({ empty: true });
  assert.deepEqual((await empty.service.getMenuQrManagementPageData(menuId)).tables, []);
});

test("QR 권한만으로 테이블 목록을 조회하거나 runtime을 확대하지 않는다", async () => {
  for (const options of [{ tables: false }, { runtime: false }, { active: false }, { supported: false }]) {
    const f = fixture(options);
    const data = await f.service.getMenuQrManagementPageData(menuId);
    assert.equal(data.canManageTables, false);
    assert.equal(data.tables.length, 0);
    assert.ok(data.tableQrUnavailableReason);
    assert.deepEqual(f.tableReads, []);
  }
});

test("테이블 전용 직원의 기존 관리는 유지하되 대표 QR 권한은 부여하지 않는다", async () => {
  const f = fixture({ qr: false });
  const data = await f.service.getMenuQrManagementPageData(menuId);
  assert.equal(data.canManageTables, true);
  assert.equal(data.canDownloadRepresentativeQr, false);
  assert.match(data.representativeQrDisabledReason!, /권한/);
});

test("미로그인·관리 권한 없음·잘못된 ID는 조회 전에 거부한다", async () => {
  for (const [options, status] of [[{ authError: true }, 401], [{ qr: false, tables: false }, 403]] as const) {
    const f = fixture(options);
    await assert.rejects(f.service.getMenuQrManagementPageData(menuId), (error: unknown) => error instanceof MenuSiteAccessError && error.status === status);
    assert.deepEqual(f.scopes, []);
    assert.deepEqual(f.tableReads, []);
  }
  const invalid = fixture();
  await assert.rejects(invalid.service.getMenuQrManagementPageData("not-a-uuid"), (error: unknown) => error instanceof MenuSiteAccessError && error.status === 404);
  assert.deepEqual(invalid.scopes, []);
});

test("비공개·종료 메뉴판의 대표 QR은 비활성이고 테이블 조회 실패를 빈 목록으로 숨기지 않는다", async () => {
  for (const options of [{ published: false }, { active: false }]) {
    const data = await fixture(options).service.getMenuQrManagementPageData(menuId);
    assert.equal(data.canDownloadRepresentativeQr, false);
    assert.ok(data.representativeQrDisabledReason);
  }
  await assert.rejects(fixture({ tableError: true }).service.getMenuQrManagementPageData(menuId), /table read failed/);
});

test("다운로드 API는 관리 메타데이터 없이 비공개·무캐시 DTO만 반환한다", async () => {
  class TableError extends Error {}
  const route = serverModule<typeof import("../app/api/menu-sites/[menuId]/qr/route")>("app/api/menu-sites/[menuId]/qr/route.ts", {
    "@/lib/menu-site-permissions": { MenuSiteAccessError },
    "@/lib/server/menu-table-management-service": { MenuTableManagementError: TableError },
    "@/lib/server/menu-qr-management-service": { getMenuQrManagementPageData: async () => ({ menuSite: { id: menuId }, tables: [table] }) },
  });
  const response = await route.GET(new Request("https://example.test"), { params: Promise.resolve({ menuId }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual((await response.json()).tables, [{ id: table.id, label: table.label, status: table.status, qrPath: table.qrPath }]);
});

test("내 메뉴판은 다운로드 전용 Dialog를 열고 기존 QR URL은 통합 관리로 이동한다", () => {
  const source = readSource("app/mypage/page.tsx");
  const modal = readSource("components/mypage/MenuQrDownloadModal.tsx");
  const legacy = readSource("app/mypage/menus/[menuId]/qr/page.tsx");
  assert.equal((source.match(/<MenuQrDownloadModal/g) ?? []).length, 2);
  assert.doesNotMatch(source, /<QrDownloadButton/);
  assert.match(modal, /<DialogContent/);
  assert.match(modal, /등록된 테이블이 없습니다/);
  assert.match(modal, /다시 시도/);
  assert.match(modal, /테이블\/QR 관리로 이동/);
  assert.doesNotMatch(modal, /createMenuTable|mutateMenuTable/);
  assert.match(legacy, /redirect\(`\/mypage\/menus\/\$\{encodeURIComponent\(menuId\)\}\/tables`\)/);
  assert.doesNotMatch(legacy, /return \(/);
  const canonical = readSource("app/mypage/menus/[menuId]/tables/page.tsx");
  assert.match(canonical, /<RepresentativeQrCard/);
  assert.match(canonical, /data.canManageTables \? \(/);
});

test("대표 QR만 허용된 메뉴판도 같은 관리 메뉴를 사용하지만 주문·호출·테이블 운영 권한은 확대하지 않는다", async () => {
  const operations = await import("./operations-dashboard");
  const service = serverModule<typeof import("./server/store-operations-context")>("lib/server/store-operations-context.ts", {
    "server-only": {},
    "@/lib/operations-dashboard": operations,
    "@/lib/server/menu-site-access-service": {
      getAccessibleMenuSiteList: async () => [{ menuSiteId: menuId, templateKey: "display_menu_a", accessRole: "viewer", isOwner: false, status: "published", permissions: ["menu.read", "qr.manage"] }],
      getMenuSiteAccessStateForMenuSite: async () => ({ canPreview: true, planType: "business_display" }),
    },
    "@/lib/order-dashboard-runtime": { isOrderDashboardRuntimeEnabledForSite: () => false },
    "@/lib/call-runtime": { isCallRuntimeEnabledForSite: () => false },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => false },
    "@/lib/pickup-queue-runtime": { isPickupQueueRuntimeEnabledForSite: () => false, isPickupQueueTemplate: () => true },
  });
  const data = await service.getStoreOperationsContext(menuId);
  assert.equal(data.selectedSite?.canManageQr, true);
  assert.equal(data.selectedSite?.canConfigure, false);
  assert.deepEqual(data.selectedSite?.operationAccess, { orders: false, calls: false, tables: false, sales: false, pickup: false });
});
