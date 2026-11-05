import * as qrRotation from "./qr-rotation-policy";
import { parseOrderPointDeletionSummary } from "./order-point-deletion";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as policy from "./order-point-policy";
import { normalizeMenuTableId } from "./menu-table-validation";
import { buildPublicOrderCallEntryConfig } from "../components/public-menu/order-call/types";

const menu = "11111111-1111-4111-8111-111111111111", point = "22222222-2222-4222-8222-222222222222";
test("같은 테이블의 QR·태블릿 주문·호출은 네 가지 독립 권한이며 키오스크는 terminal만 허용한다", () => {
  const p = { ...policy.DEFAULT_ORDER_POINT_POLICY, customerOrderEnabled: false, terminalCallEnabled: false };
  assert.equal(policy.isOrderPointChannelAllowed("table", p, "terminal", "orders"), true);
  assert.equal(policy.isOrderPointChannelAllowed("table", p, "customer", "orders"), false);
  assert.equal(policy.isOrderPointChannelAllowed("table", p, "terminal", "calls"), false);
  assert.equal(policy.isOrderPointChannelAllowed("table", p, "customer", "calls"), true);
  for (const feature of ["orders", "calls"] as const) assert.equal(policy.isOrderPointChannelAllowed("kiosk", policy.DEFAULT_ORDER_POINT_POLICY, "customer", feature), false);
  assert.deepEqual(policy.readOrderPointPolicy({}), policy.DEFAULT_ORDER_POINT_POLICY);
});

test("손님 화면의 버튼도 공통 설정과 현재 사용 방식의 허용 조건을 함께 따른다", () => {
  for (const global of [false, true]) for (const orderAllowed of [false, true]) for (const callAllowed of [false, true]) {
    const c = buildPublicOrderCallEntryConfig({ capabilityState: { supportsExperience: true, orderEnabled: global, callEnabled: global }, menuSiteId: menu, storeName: "검수", tableSession: { id: point, tableLabel: "1번 테이블", orderAllowed, callAllowed }, cartScope: "scope", orderCatalog: [] });
    assert.equal(c?.orderEnabled, global && orderAllowed);
    assert.equal(c?.orderingOpen, global && orderAllowed);
    assert.equal(c?.callEnabled, global && callAllowed);
    assert.equal(c?.hasValidTableSession, true);
  }
});

function serviceFixture({ owner = true, runtime = true, conflict = false, denied = false } = {}) {
  const writes: unknown[] = [], filters: unknown[] = [], permissions: unknown[] = [];
  const db = { from(table: string) {
    if (table === "menu_sites") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: menu, name: "검수", slug: "test", status: "published", template_key: "cafe_design_a" } }; } };
    assert.equal(table, "menu_tables");
    return { update(value: unknown) { writes.push(value); return this; }, eq(k: string, v: unknown) { filters.push([k, v]); return this; }, neq(k: string, v: unknown) { filters.push(["neq", k, v]); return this; }, select() { return this; }, async maybeSingle() { return { data: conflict ? null : { id: point }, error: null }; } };
  } };
  const access = async (...args: unknown[]) => { permissions.push(args); if (denied) throw new Error("PERMISSION_DENIED"); return { isOwner: owner, actorUserId: "owner" }; };
  const deps: Record<string, unknown> = {
    "server-only": {}, "@/lib/qr-rotation-policy": qrRotation, "@/lib/order-point-deletion": { parseOrderPointDeletionSummary }, "@/lib/order-point-policy": policy,
    "@/lib/menu-table-management": { normalizeMenuTableId },
    "@/lib/dining-product-tiers": { getDiningTemplateFeatures: () => ({ smartCall: true }) },
    "@/lib/table-management-runtime": { isTableManagementRuntimeEnabledForSite: () => runtime },
    "@/lib/supabase/admin": { createAdminClient: () => db },
    "@/lib/server/menu-site-access-service": { requireMenuSitePermission: access, getMenuSiteAccessStateForMenuSite: async () => ({ planType: "business_basic", canUseWriteActions: true, canEdit: true }), requireMenuSiteWriteAccess: async (...args: unknown[]) => ({ context: await access(...args), supabase: db }) },
  };
  const code = ts.transpileModule(readFileSync(new URL("./server/menu-table-management-service.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in deps, name); return deps[name]; }, loaded, loaded.exports);
  return { service: loaded.exports as typeof import("./server/menu-table-management-service"), writes, filters, permissions };
}

test("사장님의 개별 변경은 한 플래그만 CAS로 저장하고 매장·대상·보관 상태·QR 채널을 제한한다", async () => {
  for (const channel of ["terminal", "customer"] as const) for (const feature of ["orders", "calls"] as const) {
    const f = serviceFixture();
    await f.service.setOrderPointFeature({ menuSiteId: menu, tableId: point, channel, feature, enabled: false, expectedEnabled: true });
    const column = policy.ORDER_POINT_POLICY_COLUMNS[policy.orderPointPolicyKey(channel, feature)];
    assert.deepEqual(f.writes, [{ updated_by: "owner", [column]: false }]);
    for (const filter of [["menu_site_id", menu], ["id", point], ["neq", "status", "archived"], [column, true]]) assert.ok(f.filters.some(v => JSON.stringify(v) === JSON.stringify(filter)));
    assert.equal(f.filters.some(v => JSON.stringify(v) === JSON.stringify(["point_kind", "table"])), channel === "customer");
  }
});

test("직원·권한 없음·런타임 제한·잘못된 입력·동시 변경은 저장 성공으로 처리하지 않는다", async () => {
  const input = { menuSiteId: menu, tableId: point, channel: "terminal" as const, feature: "orders" as const, enabled: true, expectedEnabled: false };
  for (const options of [{ owner: false }, { denied: true }, { runtime: false }]) {
    const f = serviceFixture(options); await assert.rejects(f.service.setOrderPointFeature(input)); assert.deepEqual(f.writes, []);
  }
  const f = serviceFixture();
  for (const change of [{ channel: "fake" }, { feature: "prepay" }, { tableId: "bad" }, { enabled: "true" }]) await assert.rejects(f.service.setOrderPointFeature({ ...input, ...change } as never));
  assert.deepEqual(f.writes, []);
  await assert.rejects(serviceFixture({ conflict: true }).service.setOrderPointFeature(input), /설정이 변경/);
});
