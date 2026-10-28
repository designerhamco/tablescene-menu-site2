import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as operationPolicy from "./operations-dashboard";
import { readMenuOrderSettings, mergeMenuOrderSettingsSection, DEFAULT_MENU_ORDER_SETTINGS } from "./menu-order-settings";
import { MenuSiteAccessError } from "./menu-site-permissions";

function source(path: string) { return readFileSync(new URL(`../${path}`, import.meta.url), "utf8"); }
function serverModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const output = ts.transpileModule(source(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", output)((name: string) => {
    if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports as T;
}
const menuId = "11111111-1111-4111-8111-111111111111";

function settingsFixture({ activeTable = true, runtime = true, tableError = false, owner = true, currentOrder = false, currentCall = false } = {}) {
  const writes: unknown[] = [];
  const tableReads: [string, unknown][] = [];
  const db = { from(name: string) {
    const query = {
      select() { return this; },
      eq(key: string, value: unknown) { if (name === "menu_tables") tableReads.push([key, value]); return this; },
      gt() { return this; }, limit(value: number) { assert.equal(value, 1); return this; },
      async single() { return { data: { id: menuId, settings: { table_order: { orderEnabled: currentOrder, callEnabled: currentCall } }, updated_at: "v1", template_key: "cafe_design_a" }, error: null }; },
      async order() { return { data: [], error: null }; },
      async maybeSingle() { return { data: activeTable ? { id: "active-table" } : null, error: tableError ? { code: "failed" } : null }; },
    };
    return query;
  } };
  const update = { eq() { return this; }, is() { return this; }, select() { return this; }, async maybeSingle() { return { data: { id: menuId }, error: null }; } };
  const service = serverModule<typeof import("./server/menu-order-settings-service")>("lib/server/menu-order-settings-service.ts", {
    "server-only": {},
    "@/lib/dining-product-tiers": { getDiningTemplateTier: () => "single" },
    "@/lib/call-runtime": { isCallRuntimeEnabledForSite: () => runtime },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => runtime },
    "@/lib/order-dashboard-runtime": { isOrderDashboardRuntimeEnabledForSite: () => runtime },
    "@/lib/postpay-order-runtime": { isPostpayOrderRuntimeEnabledForSite: () => runtime },
    "./menu-site-access-service": {
      requireMenuSitePermission: async () => ({ isOwner: owner, actorUserId: "owner" }),
      requireMenuSiteWriteAccess: async () => ({ context: { actorUserId: "owner" }, supabase: { from() { return { update(value: unknown) { writes.push(value); return update; } }; } } }),
    },
    "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/menu-site-permissions": { MenuSiteAccessError },
    "@/lib/menu-order-settings": { readMenuOrderSettings, mergeMenuOrderSettingsSection },
  });
  return { service, writes, tableReads };
}

test("활성 테이블 없이 주문·호출 ON을 저장할 수 없으며 상태 조회 실패도 차단한다", async () => {
  for (const section of ["orders", "calls"] as const) {
    for (const options of [{ activeTable: false }, { runtime: false }, { tableError: true }]) {
      const f = settingsFixture(options);
      await assert.rejects(f.service.saveMenuOrderSettings(menuId, { ...DEFAULT_MENU_ORDER_SETTINGS, orderEnabled: true, callEnabled: true }, section), /테이블/);
      assert.equal(f.writes.length, 0);
    }
  }
});

test("활성 테이블이 있으면 주문·호출을 독립 저장하며 테이블 범위를 제한한다", async () => {
  const order = settingsFixture({ currentCall: true });
  const saved = await order.service.saveMenuOrderSettings(menuId, { ...DEFAULT_MENU_ORDER_SETTINGS, orderEnabled: true, callEnabled: false }, "orders");
  assert.equal(saved.orderEnabled, true);
  assert.equal(saved.callEnabled, true);
  assert.deepEqual(order.tableReads, [["menu_site_id", menuId], ["status", "active"]]);
  assert.equal(order.writes.length, 1);
  const call = settingsFixture({ currentOrder: true });
  const savedCall = await call.service.saveMenuOrderSettings(menuId, { ...DEFAULT_MENU_ORDER_SETTINGS, callEnabled: true }, "calls");
  assert.equal(savedCall.orderEnabled, true);
  assert.equal(savedCall.callEnabled, true);
});

test("테이블이 없어지거나 runtime이 꺼져도 OFF 저장과 다른 기능의 기존 설정은 유지한다", async () => {
  for (const section of ["orders", "calls"] as const) {
    const f = settingsFixture({ activeTable: false, runtime: false, tableError: true, currentOrder: true, currentCall: true });
    const saved = await f.service.saveMenuOrderSettings(menuId, DEFAULT_MENU_ORDER_SETTINGS, section);
    assert.equal(saved.orderEnabled, section === "calls");
    assert.equal(saved.callEnabled, section === "orders");
    assert.equal(f.writes.length, 1);
    assert.deepEqual(f.tableReads, []);
  }
  const staff = settingsFixture({ owner: false });
  await assert.rejects(staff.service.saveMenuOrderSettings(menuId, DEFAULT_MENU_ORDER_SETTINGS, "orders"), MenuSiteAccessError);
  assert.equal(staff.writes.length, 0);
});

function contextFixture({ ready = true, error = false, runtime = true } = {}) {
  const sites = [
    { menuSiteId: "current", status: "published" },
    { menuSiteId: "draft", status: "draft" },
    { menuSiteId: "expired", status: "published" },
    { menuSiteId: "cancelled", status: "cancelled" },
    { menuSiteId: "cancel-at-period-end", status: "published" },
  ].map(site => ({ ...site, isOwner: true, templateKey: "cafe_design_a", accessRole: "owner", permissions: ["menu.read", "qr.manage", "table.manage", "order.read", "call.manage"] }));
  const queried: string[] = [];
  const service = serverModule<typeof import("./server/store-operations-context")>("lib/server/store-operations-context.ts", {
    "server-only": {},
    "@/lib/operations-dashboard": operationPolicy,
    "@/lib/server/menu-site-access-service": {
      getAccessibleMenuSiteList: async () => sites,
      getMenuSiteAccessStateForMenuSite: async ({ menuSiteId }: { menuSiteId: string }) => ({
        lifecycleState: menuSiteId === "expired" ? "expired_holding" : "active", reason: "active", canPreview: menuSiteId !== "expired",
        planType: "business_basic", canEdit: true, canUseWriteActions: true,
      }),
    },
    "@/lib/supabase/admin": { createAdminClient: () => ({ from() {
      let id = "";
      return { select(value: string) { assert.equal(value, "menu_site_id"); return this; }, eq(key: string, value: string) { if (key === "menu_site_id") { id = value; queried.push(value); } else assert.deepEqual([key, value], ["status", "active"]); return this; }, limit(value: number) { assert.equal(value, 1); return this; }, async maybeSingle() { return { data: ready ? { menu_site_id: id } : null, error: error ? { code: "error" } : null }; } };
    } }) },
    "@/lib/order-dashboard-runtime": { isOrderDashboardRuntimeEnabledForSite: () => runtime },
    "@/lib/call-runtime": { isCallRuntimeEnabledForSite: () => runtime },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => runtime },
    "@/lib/pickup-queue-runtime": { isPickupQueueRuntimeEnabledForSite: () => false, isPickupQueueTemplate: () => false },
  });
  return { service, queried };
}

test("설정용 사장 메뉴판도 이용기간 필터를 적용하고 기간이 남은 해지 예약은 보존한다", async () => {
  const f = contextFixture();
  const data = await f.service.getStoreOperationsContext("expired");
  assert.deepEqual(data.sites.map(site => site.menuSiteId), ["current", "draft", "cancel-at-period-end"]);
  assert.equal(data.selectedSite?.menuSiteId, "current");
  assert.deepEqual(f.queried, ["current", "draft", "cancel-at-period-end"]);
  assert.ok(data.sites.every(site => site.activeTablesReady));
});

test("활성 테이블 0개·조회 실패·runtime 미연결을 구분하며 내역 접근은 유지한다", async () => {
  for (const [options, expected] of [[{ ready: false }, false], [{ error: true }, null], [{ runtime: false }, false]] as const) {
    const f = contextFixture(options);
    const data = await f.service.getStoreOperationsContext("current");
    assert.equal(data.selectedSite?.activeTablesReady, expected);
    if ("runtime" in options && options.runtime === false) assert.deepEqual(f.queried, []);
    else assert.equal(data.selectedSite?.operationAccess.orders, true);
  }
});

test("운영 메뉴판 선택은 왼쪽 셀렉트이며 테이블·QR 관리를 먼저 제공한다", () => {
  const shell = source("components/mypage/StoreOperationsShell.tsx");
  assert.doesNotMatch(shell, /<NavigationTabs/);
  assert.match(shell, /<OperationSiteSelector/);
  assert.ok(shell.indexOf('{ key: "tables"') < shell.indexOf('{ key: "orders"'));
  const selector = source("components/mypage/OperationSiteSelector.tsx");
  assert.match(selector, /<select/);
  assert.match(selector, /router.push\(item.href\)/);
  const form = source("app/mypage/menus/[menuId]/order-settings/OrderSettingsForm.tsx");
  assert.match(form, /disabled: !activeTablesReady && !featureEnabled/);
});
