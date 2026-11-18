import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { isValidElement, type ReactNode } from "react";
import { operationMenuTargets } from "./operation-menu-targets";
import { operationOverviewReception, summarizeOperationOverviews, type OperationSiteOverview } from "./operation-overview";
import { isStoreOperationsTemplate } from "./operations-dashboard";
import type { StoreOperationsSite } from "./server/store-operations-context";

function site(n = 1, changes: Partial<StoreOperationsSite> = {}): StoreOperationsSite {
  return { menuSiteId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, name: `메뉴판 ${n}`, status: "published", templateKey: "cafe_design_a",
    permissions: ["menu.read", "menu.edit", "menu.publish", "table.manage", "qr.manage", "order.read", "call.manage", "sales.read"],
    operationAccess: { orders: true, calls: true, tables: true, sales: true, pickup: false },
    canConfigure: true, canManageQr: true, tableSetupAvailable: true, activeTablesReady: true, ...changes } as StoreOperationsSite;
}
function overview(n = 1): OperationSiteOverview {
  return { site: site(n), failed: false, status: { menuId: site(n).menuSiteId, published: true, canPublish: true, canConfigure: true,
    permissions: { orders: true, calls: true, tables: true, edit: true }, historyAccess: { orders: true, calls: true },
    settings: { orderEnabled: true, callEnabled: false }, runtime: { orders: true, calls: true, tables: true }, activeTablesReady: true,
    tableCounts: { registered: 3, active: 2, disabled: 1 }, kioskCounts: { registered: 1, active: 1 } } };
}
function loadModule(path: string, dependencies: Record<string, unknown>) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return loaded.exports;
}

test("전체 화면의 메뉴판 선택은 권한·연결을 함께 확인하고 원래 메뉴판 경로를 보존한다", () => {
  const owner = site(), staff = site(2, { canConfigure: false, permissions: ["menu.read", "order.read"], tableSetupAvailable: false, canManageQr: false,
    operationAccess: { orders: true, calls: false, tables: false, sales: false, pickup: false } });
  assert.deepEqual(operationMenuTargets([owner, staff], "tables").map(item => item.id), [owner.menuSiteId]);
  assert.deepEqual(operationMenuTargets([owner, staff], "qr").map(item => item.id), [owner.menuSiteId]);
  assert.deepEqual(operationMenuTargets([owner, staff], "sales").map(item => item.id), [owner.menuSiteId]);
  assert.deepEqual(operationMenuTargets([owner, staff], "pickup"), []);
  assert.equal(operationMenuTargets([staff], "order-settings")[0].href, `/mypage/menus/${staff.menuSiteId}/orders/settings`);
  assert.deepEqual(operationMenuTargets([staff], "call-settings"), []);
  assert.deepEqual(operationMenuTargets([staff], "call-items"), []);
  assert.deepEqual(operationMenuTargets([staff], "publication"), []);
  assert.equal(operationMenuTargets([owner], "publication")[0].href, `/mypage/menus/${owner.menuSiteId}/edit?tab=publish`);
});

test("사장님의 준비 중 메뉴판과 직원의 기기 연결 권한은 기존 설정 진입을 유지한다", () => {
  const draft = site(1, { status: "draft", operationAccess: { orders: false, calls: false, tables: false, sales: false, pickup: false } });
  const devices = site(2, { canConfigure: false, permissions: ["menu.read", "table.manage"], operationAccess: draft.operationAccess });
  assert.equal(operationMenuTargets([draft], "order-settings").length, 1);
  assert.equal(operationMenuTargets([draft], "call-items").length, 1);
  assert.equal(operationMenuTargets([devices], "call-settings").length, 1);
  assert.equal(operationMenuTargets([devices], "call-items").length, 0);
  assert.equal(operationMenuTargets([site(3, { canConfigure: false, permissions: ["table.manage"], tableSetupAvailable: false, operationAccess: draft.operationAccess })], "tables").length, 0);
});

test("통합 현황은 실제 접수 상태를 집계하며 읽기 실패와 권한 없는 등록 수를 합치지 않는다", () => {
  const accepting = overview(), stopped = overview(2), unknown = overview(3), hidden = overview(4);
  stopped.status.published = false;
  unknown.status.settings = null; unknown.status.tableCounts = null; unknown.status.kioskCounts = null; unknown.failed = true;
  hidden.status.permissions = { orders: false, calls: false, tables: false, edit: false };
  assert.equal(operationOverviewReception(accepting.status, "orders").accepting, true);
  assert.equal(operationOverviewReception(stopped.status, "orders").accepting, false);
  assert.deepEqual(summarizeOperationOverviews([accepting, stopped, unknown, hidden]), {
    total: 4, published: 3, tables: 6, kiosks: 2, tableSources: 3, knownTableSources: 2,
    orders: 1, calls: 0, unknownOrders: 1, unknownCalls: 1,
  });
});

test("메뉴판별 상태 로더는 사장 설정·직원 요약·테이블 조회의 기존 접근 경계를 지킨다", async () => {
  const requests: string[] = [];
  const service = loadModule("./server/operation-overview-service.ts", {
    "server-only": {}, "@/lib/operations-dashboard": { isStoreOperationsTemplate },
    "./menu-table-management-service": { listMenuTables: async (id: string) => { requests.push(`tables:${id}`); return { tables: [{ kind: "table", status: "active" }, { kind: "kiosk", status: "active" }] }; } },
    "./menu-order-settings-service": {
      loadMenuOrderSettings: async (id: string) => { requests.push(`settings:${id}`); return { settings: { orderEnabled: true, callEnabled: false }, runtime: { orders: true, calls: true, tables: true } }; },
      loadOperationReceptionSummary: async (id: string) => { requests.push(`summary:${id}`); return { orderEnabled: true, callEnabled: false, runtime: { orders: true, calls: true } }; },
    },
  }) as typeof import("./server/operation-overview-service");
  const owner = site(), staff = site(2, { canConfigure: false, permissions: ["menu.read", "order.read"] });
  const readOnly = site(3, { canConfigure: false, permissions: ["menu.read"], operationAccess: { orders: false, calls: false, tables: false, sales: false, pickup: false } });
  const results = await service.loadAllMenuOperationOverviews([owner, staff, readOnly, site(4, { templateKey: "display_menu_a" })]);
  assert.equal(results.length, 3);
  assert.deepEqual(requests.sort(), [`tables:${owner.menuSiteId}`, `settings:${owner.menuSiteId}`, `summary:${staff.menuSiteId}`].sort());
  assert.equal(results[0].status.tableCounts?.registered, 1);
  assert.equal(results[0].status.kioskCounts?.registered, 1);
  assert.equal(results[1].status.tableCounts, null);
  assert.equal(results[2].status.settings, null);
});

test("메뉴판별 조회 실패는 0개·미사용으로 바뀌지 않으며 다른 정보는 유지한다", async () => {
  const service = loadModule("./server/operation-overview-service.ts", {
    "server-only": {}, "@/lib/operations-dashboard": { isStoreOperationsTemplate },
    "./menu-table-management-service": { listMenuTables: async () => { throw new Error("access revoked"); } },
    "./menu-order-settings-service": { loadMenuOrderSettings: async () => { throw new Error("unavailable"); }, loadOperationReceptionSummary: async () => assert.fail("Owner must not use staff summary") },
  }) as typeof import("./server/operation-overview-service");
  const result = await service.loadOperationSiteOverview(site());
  assert.equal(result.failed, true); assert.equal(result.status.published, true);
  assert.equal(result.status.tableCounts, null); assert.equal(result.status.settings, null);
  assert.equal(operationOverviewReception(result.status, "orders").reason, "조회 실패");
});

function elements(node: ReactNode): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [{ type: node.type, props: node.props }, ...elements(node.props.children)];
}
test("통합 대시보드는 개별 화면과 같은 네 카드 순서이며 스위치는 메뉴판별로만 제공한다", () => {
  const stub = () => null, card = () => null, toggle = () => null;
  const overviewModule = loadModule("../components/mypage/AllMenuStatusOverview.tsx", {
    "react/jsx-runtime": jsxRuntime, "next/link": { default: stub },
    "@/app/components/ui/site-icon": { Globe: stub, LayoutGrid: stub, ShoppingBag: stub, Bell: stub }, "@/app/components/ui/site-arrow": { ArrowRight: stub },
    "@/app/components/ui/button": { Button: stub }, "@/app/components/ui/badge": { Badge: stub }, "@/app/components/ui/content-panel": { ContentPanel: stub },
    "@/app/components/ui/overview-card": { OverviewCard: card, OverviewCardGroup: stub, OverviewCardResponsiveLabel: stub },
    "@/components/ui/InfoTooltip": { default: stub }, "./OperationMenuTarget": { default: stub }, "./OperationFeatureToggle": { default: toggle },
    "@/lib/operation-menu-targets": { operationMenuTargets }, "@/lib/operation-overview": { operationOverviewReception, summarizeOperationOverviews },
  }) as typeof import("../components/mypage/AllMenuStatusOverview");
  const data = overview(), tree = overviewModule.default({ overviews: [data] });
  const nodes = elements(tree);
  assert.deepEqual(nodes.filter(node => node.type === card).map(node => node.props.label), ["메뉴판 공개 상태", "테이블·키오스크 등록", "전체 주문 상태", "전체 호출 상태"]);
  assert.equal(nodes.some(node => node.type === toggle), false);
  const receptionNodes = nodes.filter(node => typeof node.type === "function" && (node.type as { name: string }).name === "Reception");
  assert.equal(receptionNodes.length, 2);
  for (const node of receptionNodes) {
    const rendered = (node.type as (props: unknown) => ReactNode)(node.props);
    const controls = elements(rendered).filter(item => item.type === toggle);
    assert.equal(controls.length, 1); assert.equal(controls[0].props.menuId, data.site.menuSiteId); assert.equal(controls[0].props.menuName, data.site.name);
  }
  data.status.canConfigure = false;
  for (const node of receptionNodes) assert.equal(elements((node.type as (props: unknown) => ReactNode)(node.props)).some(item => item.type === toggle), false);
});
