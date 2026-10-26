import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { MenuSiteAccessError } from "./menu-site-permissions";
import { parseMenuItemOrderConfiguration } from "./menu-order-configuration";
import { isStoreOperationsTemplate } from "./operations-dashboard";

// Execute the real server modules with isolated auth/database adapters. No network or customer writes.
function serverModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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

function settingsPage({ owner = true, live = false, authError = null as Error | null } = {}) {
  const ownerReads: string[] = [];
  const requiredPermissions: string[] = [];
  const service = serverModule<typeof import("./server/operation-settings-page")>("lib/server/operation-settings-page.ts", {
    "server-only": {},
    "next/navigation": { redirect: (path: string) => { throw new Error(`redirect:${path}`); }, notFound: () => { throw new Error("not-found"); } },
    "@/lib/menu-site-permissions": { MenuSiteAccessError },
    "@/lib/product-focus-policy": { isStoreOperationsAvailable: () => true },
    "@/lib/operations-dashboard": { isStoreOperationsTemplate },
    "./menu-site-access-service": { requireMenuSitePermission: async (_id: string, permission: string) => { requiredPermissions.push(permission); if (authError) throw authError; return { isOwner: owner }; } },
    "./menu-order-settings-service": { loadMenuOrderSettings: async (id: string) => { ownerReads.push(id); return { settings: {} }; } },
    "./store-operations-context": { getStoreOperationsContext: async () => ({ sites: [{ menuSiteId: menuId, isOwner: owner, templateKey: "cafe_design_a", operationAccess: { orders: live, calls: live } }] }) },
  });
  return { service, ownerReads, requiredPermissions };
}

test("사장은 운영 연결 전에도 주문·호출을 준비하고 call.manage 직원은 기존 호출 항목만 관리한다", async () => {
  const owner = settingsPage();
  assert.ok((await owner.service.loadOperationSettingsPage(menuId, "orders")).data);
  assert.ok((await owner.service.loadOperationSettingsPage(menuId, "calls")).data);
  const staff = settingsPage({ owner: false, live: true });
  assert.equal((await staff.service.loadOperationSettingsPage(menuId, "calls")).data, null);
  assert.deepEqual(staff.requiredPermissions, ["call.manage"]);
  assert.deepEqual(staff.ownerReads, []);
  await assert.rejects(staff.service.loadOperationSettingsPage(menuId, "orders"), /permission-denied/);
  assert.deepEqual(staff.ownerReads, []);
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
