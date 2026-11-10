import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { MenuSiteAccessError } from "./menu-site-permissions";
import { parseMenuItemOrderConfiguration } from "./menu-order-configuration";
import { DEFAULT_MENU_ORDER_SETTINGS } from "./menu-order-settings";
import { isStoreOperationsTemplate } from "./operations-dashboard";

// Execute the real server modules with isolated auth/database adapters. No network or customer writes.
function serverModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", output)((name: string) => {
    if (!(name in dependencies)) throw new Error(`Unmocked server dependency: ${name}`);
    return dependencies[name];
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports as T;
}

const menuId = "11111111-1111-4111-8111-111111111111";
const itemId = "22222222-2222-4222-8222-222222222222";
const updatedAt = "2026-10-26T01:00:00+00:00";

function catalogService({ owner = true, price = 6500 as number | null, timestamp = updatedAt, rpcError = null as { code: string } | null } = {}) {
  const rpcCalls: Record<string, unknown>[] = [];
  const scopes: [string, unknown][] = [];
  let writeChecks = 0;
  const query = {
    select() { return this; },
    eq(key: string, value: unknown) { scopes.push([key, value]); return this; },
    async single() { return { data: { price, updated_at: timestamp }, error: null }; },
  };
  const service = serverModule<typeof import("./server/menu-order-catalog-settings-service")>("lib/server/menu-order-catalog-settings-service.ts", {
    "server-only": {},
    "./menu-site-access-service": {
      requireMenuSitePermission: async () => ({ isOwner: owner, actorUserId: "owner-1" }),
      requireMenuSiteWriteAccess: async () => {
        writeChecks++;
        return { supabase: {
          from: () => query,
          rpc: async (_name: string, args: Record<string, unknown>) => { rpcCalls.push(args); return { data: "next-version", error: rpcError }; },
        } };
      },
    },
    "@/lib/supabase/admin": { createAdminClient: () => { throw new Error("Unexpected admin read"); } },
    "@/lib/menu-site-permissions": { MenuSiteAccessError },
    "@/lib/menu-order-configuration": { parseMenuItemOrderConfiguration },
  });
  return { service, rpcCalls, scopes, get writeChecks() { return writeChecks; } };
}

const configuration = { id: itemId, updatedAt, price: 1, orderable: true, groups: [] };

test("옵션 저장은 브라우저가 보낸 가격 대신 현재 DB 가격을 사용하고 메뉴판·버전을 제한한다", async () => {
  const fixture = catalogService();
  assert.equal(await fixture.service.saveMenuItemOrderConfiguration(menuId, configuration), "next-version");
  assert.deepEqual(fixture.scopes, [["id", itemId], ["menu_site_id", menuId]]);
  assert.equal(fixture.rpcCalls[0].p_price, 6500);
  assert.equal(fixture.rpcCalls[0].p_expected_updated_at, updatedAt);
});

test("다른 창의 상품 변경, 미설정 가격, 직원 권한은 옵션 저장 전에 차단한다", async () => {
  for (const fixture of [catalogService({ timestamp: "new-version" }), catalogService({ price: null }), catalogService({ owner: false })]) {
    await assert.rejects(fixture.service.saveMenuItemOrderConfiguration(menuId, configuration));
    assert.equal(fixture.rpcCalls.length, 0);
  }
  const staff = catalogService({ owner: false });
  await assert.rejects(staff.service.saveMenuItemOrderConfiguration(menuId, configuration), MenuSiteAccessError);
  assert.equal(staff.writeChecks, 0);
  const raced = catalogService({ rpcError: { code: "40001" } });
  await assert.rejects(raced.service.saveMenuItemOrderConfiguration(menuId, configuration), /다른 창/);
});

function settingsPage({ owner = true, live = false, authError = null as Error | null, pointFailure = false, tablesReady = true, devicePermission = false, orderReadPermission = false } = {}) {
  const ownerReads: string[] = [];
  const pointReads: string[] = [];
  const requiredPermissions: string[] = [];
  const service = serverModule<typeof import("./server/operation-settings-page")>("lib/server/operation-settings-page.ts", {
    "server-only": {},
    "next/navigation": { redirect: (path: string) => { throw new Error(`redirect:${path}`); }, notFound: () => { throw new Error("not-found"); } },
    "@/lib/menu-site-permissions": { MenuSiteAccessError },
    "@/lib/product-focus-policy": { isStoreOperationsAvailable: () => true },
    "@/lib/operations-dashboard": { isStoreOperationsTemplate },
    "./menu-site-access-service": { requireMenuSitePermission: async (_id: string, permission: string) => { requiredPermissions.push(permission); if (authError) throw authError; return { isOwner: owner }; } },
    "@/lib/menu-order-settings": { DEFAULT_MENU_ORDER_SETTINGS },
    "./menu-order-settings-service": { loadOperationReceptionSummary: async () => ({ callEnabled: true, orderEnabled: null, runtime: { calls: true, orders: false } }), loadMenuOrderSettings: async (id: string) => { ownerReads.push(id); return { settings: {} }; } },
    "./order-point-device-settings": { loadOrderPointDeviceSettings: async () => null },
    "./menu-table-management-service": { listMenuTables: async (id: string) => {
      pointReads.push(id);
      if (pointFailure) throw new Error("Database unavailable");
      return { tables: [{ id: itemId, label: "1번 테이블", status: "active", kind: "table", policyAvailable: true, policy: { terminalOrderEnabled: false }, qrPath: "/private-qr-url", access_token_hash: "must-not-leak" }] };
    } },
    "./store-operations-context": { getStoreOperationsContext: async () => ({ sites: [{ menuSiteId: menuId, isOwner: owner, permissions: devicePermission ? ["menu.read", "table.manage"] : orderReadPermission ? ["menu.read", "order.read"] : [], tableSetupAvailable: tablesReady, templateKey: "cafe_design_a", operationAccess: { orders: live, calls: live } }] }) },
  });
  return { service, ownerReads, pointReads, requiredPermissions };
}

test("사장은 운영 연결 전에도 주문·호출을 준비하고 call.manage 직원은 기존 호출 항목만 관리한다", async () => {
  const owner = settingsPage();
  assert.ok((await owner.service.loadOperationSettingsPage(menuId, "orders")).data);
  assert.ok((await owner.service.loadOperationSettingsPage(menuId, "calls")).data);
  const staff = settingsPage({ owner: false, live: true });
  assert.equal((await staff.service.loadOperationSettingsPage(menuId, "calls")).data, null);
  assert.deepEqual(staff.requiredPermissions, ["call.manage"]);
  assert.deepEqual(staff.ownerReads, []);
  assert.deepEqual(staff.pointReads, []);
  await assert.rejects(staff.service.loadOperationSettingsPage(menuId, "orders"), /permission-denied/);
  assert.deepEqual(staff.ownerReads, []);
});

test("두 기능 설정은 같은 등록 정보를 읽되 QR 주소·원본 자격 정보는 전달하지 않는다", async () => {
  const owner = settingsPage();
  const orders = await owner.service.loadOperationSettingsPage(menuId, "orders");
  const calls = await owner.service.loadOperationSettingsPage(menuId, "calls");
  assert.deepEqual(orders.points, calls.points);
  assert.equal(orders.points?.[0].id, itemId);
  assert.deepEqual(orders.points?.[0].policy, { terminalOrderEnabled: false });
  assert.deepEqual(owner.pointReads, [menuId, menuId]);
  assert.doesNotMatch(JSON.stringify(orders.points), /qrPath|access_token|must-not-leak/);
});

test("개별 설정 조회 실패·테이블 관리 제한은 빈 목록이나 기본 허용 상태로 표시하지 않는다", async () => {
  for (const options of [{ pointFailure: true }, { tablesReady: false }]) {
    const f = settingsPage(options);
    const page = await f.service.loadOperationSettingsPage(menuId, "orders");
    assert.ok(page.data);
    assert.equal(page.points, null);
    if (options.tablesReady === false) assert.deepEqual(f.pointReads, []);
  }
});

test("비연결 직원과 미로그인·권한 없는 직접 URL은 설정 조회 전에 차단한다", async () => {
  const inactive = settingsPage({ owner: false });
  await assert.rejects(inactive.service.loadOperationSettingsPage(menuId, "calls"), /permission-denied/);
  for (const code of ["AUTH_REQUIRED", "MENU_SITE_PERMISSION_DENIED"] as const) {
    const fixture = settingsPage({ authError: new MenuSiteAccessError(code, "blocked", code === "AUTH_REQUIRED" ? 401 : 403) });
    await assert.rejects(fixture.service.loadOperationSettingsPage(menuId, "orders"), code === "AUTH_REQUIRED" ? /redirect:\/sign-in\?next=/ : /permission-denied/);
    assert.deepEqual(fixture.ownerReads, []);
  }
});

test("테이블 관리 권한이 있는 직원은 이동한 기기 연결을 유지하되 사장 전용 설정은 읽지 않는다", async () => {
  const staff = settingsPage({ owner: false, live: false, devicePermission: true });
  for (const feature of ["orders", "calls"] as const) {
    const page = await staff.service.loadOperationSettingsPage(menuId, feature);
    assert.equal(page.data, null); assert.equal(page.canManageDevices, true); assert.equal(page.points?.[0].id, itemId);
    assert.equal(page.pointSettings.orderEnabled, null); assert.equal(page.pointSettings.callEnabled, true);
  }
  assert.deepEqual(staff.ownerReads, []); assert.deepEqual(staff.pointReads, [menuId, menuId]);
});


test("호출 항목 탭은 전체 설정과 기기 목록을 읽지 않는다", async () => {
  const owner = settingsPage();
  const result = await owner.service.loadOperationSettingsPage(menuId, "calls", { includeConfiguration: false });
  assert.equal(result.data, null);
  assert.equal(result.points, null);
  assert.equal(result.deviceSetup, null);
  assert.deepEqual(owner.ownerReads, []);
  assert.deepEqual(owner.pointReads, []);
});

test("주문 내역 직원은 자기 브라우저 알림 설정에 접근하되 사장 설정은 읽지 않는다", async () => {
  const staff = settingsPage({ owner: false, live: true, orderReadPermission: true });
  const page = await staff.service.loadOperationSettingsPage(menuId, "orders");
  assert.equal(page.data, null);
  assert.equal(page.points, null);
  assert.equal(page.canManageDevices, false);
  assert.deepEqual(staff.ownerReads, []);
  assert.deepEqual(staff.pointReads, []);
});


test("일반 주문 설정은 기기별 목록·연결을 조회하지 않는다", async () => {
  const owner = settingsPage();
  const page = await owner.service.loadOperationSettingsPage(menuId, "orders", { includeDevices: false });
  assert.ok(page.data); assert.equal(page.points, null); assert.equal(page.deviceSetup, null);
  assert.deepEqual(owner.pointReads, []);
});


test("이전 기기별 설정 주소는 설정 데이터를 읽기 전에 테이블 관리로 이동한다", async () => {
  let settingsReads = 0;
  const page = serverModule<typeof import("../app/mypage/menus/[menuId]/orders/settings/page")>("app/mypage/menus/[menuId]/orders/settings/page.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "next/navigation": { redirect: (path: string) => { throw new Error(`redirect:${path}`); } },
    "@/components/mypage/PaymentTerminalSettings": {},
    "@/lib/server/payment-terminal-preparation-service": {loadPaymentTerminalPreparations:async()=>{settingsReads++;throw new Error("Unexpected payment read");}},
    "@/components/mypage/OrderSettingsCategories": {},
    "@/components/mypage/OrderReadyNotificationSettings": {},
    "@/components/mypage/StoreOperationsShell": {},
    "@/app/components/ui/section-header": {SectionHeader:()=>null},
    "@/app/components/ui/content-panel": {},
    "@/components/mypage/OperationalSoundSettings": {},
    "@/components/mypage/OperationFeatureNavigation": {},
    "../../order-settings/OrderSettingsForm": {},
    "@/lib/server/operation-settings-page": { loadOperationSettingsPage: async () => { settingsReads++; throw new Error("Unexpected settings read"); } },
  });
  for (const tab of ["devices", ["devices"], ["devices", "settings"]]) {
    await assert.rejects(page.default({ params: Promise.resolve({ menuId }), searchParams: Promise.resolve({ tab }) }),
      { message: `redirect:/mypage/menus/${menuId}/tables` });
  }
  assert.equal(settingsReads, 0);
});
