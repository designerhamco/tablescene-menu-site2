import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement, isValidElement, type ReactNode } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

async function renderDashboard(menuSiteId: string) {
  const CurrentTabletConnectionPanel = () => null;
  const OperationStatusCards = () => null;
  const stub = () => null;
  const site = { menuSiteId, name: "검수 매장", slug: "test-store", status: "published", templateKey: "cafe_design_a", canConfigure: true,
    tableSetupAvailable: true, activeTablesReady: true, permissions: ["table.manage", "order.read", "call.manage", "menu.edit", "menu.publish"],
    operationAccess: { orders: true, calls: true, tables: true, sales: false, pickup: false } };
  const dependencies: Record<string, unknown> = {
    "react/jsx-runtime": jsxRuntime, "next/link": { default: stub }, "lucide-react": { Bell: stub, ChevronRight: stub, LayoutGrid: stub, ShoppingBag: stub, Ticket: stub },
    "next/navigation": { redirect() { assert.fail("Authenticated dashboard must render"); } },
    "next/headers": { cookies: async () => ({ get: () => undefined }), headers: async () => ({ get: () => "test browser" }) },
    "@/app/components/ui/content-panel": { ContentPanel: stub },
    "@/app/components/ui/button": { Button: stub },
    "@/app/components/ui/badge": { Badge: stub },
    "@/lib/customer-order-history": { CUSTOMER_ORDER_STATUS_LABELS: {} },
    "@/lib/server/sales-summary-service": { getSalesSummaryDashboard: async () => { throw new Error("Sales must not be read without permission"); } },
    "@/components/mypage/StoreSalesSummary": { StoreSalesMetrics: stub },
    "@/components/mypage/OperationalSoundSettings": { default: stub },
    "@/components/mypage/OperationsDashboardRefresh": { default: stub },
    "@/app/components/ui/data-display": { AnnouncementBar: stub, MetricCard: stub },
    "@/components/mypage/StoreOperationsShell": { default: ({ children }: { children: ReactNode }) => createElement("main", null, children) },
    "@/components/mypage/OperationFeatureToggle": { default: stub }, "@/components/mypage/OperationTableSetupNotice": { default: stub },
    "@/components/mypage/CurrentTabletConnectionPanel": { default: CurrentTabletConnectionPanel },
    "@/components/mypage/OperationStatusCards": { default: OperationStatusCards },
    "@/lib/menu-url": { getConfiguredPublicMenuOrigin: () => "https://example.test", getPublicMenuPath: () => "/menu/test-store" },
    "@/lib/server/table-terminal-service": { getCurrentTableTerminalId: async () => null }, "@/lib/table-qr-session-tokens": { TABLE_VISIT_SESSION_COOKIE: "test" },
    "@/lib/operations-dashboard": { isStoreOperationsTemplate: () => true },
    "@/lib/server/menu-order-settings-service": { loadMenuOrderSettings: async () => ({ settings: { orderEnabled: false, callEnabled: false }, runtime: { orders: true, calls: true, tables: true } }) },
    "@/lib/korean-date-time": { formatKoreanDateTime: () => "" }, "@/lib/product-focus-policy": { isStoreOperationsAvailable: () => true },
    "@/lib/server/call-management-service": { listCallDashboard: async () => ({ calls: [] }) },
    "@/lib/server/order-management-service": { listOrderDashboard: async () => ({ orders: [] }) },
    "@/lib/server/menu-table-management-service": { listMenuTables: async () => ({ tables: [] }) },
    "@/lib/server/pickup-queue-service": {},
    "@/lib/server/store-operations-context": { getStoreOperationsContext: async () => ({ sites: [site], selectedSite: site }) },
    "@/lib/supabase/server": { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "operator" } } }) } }) },
  };
  const code = ts.transpileModule(readFileSync(new URL("../app/mypage/operations/page.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  const Page = (loaded.exports as typeof import("../app/mypage/operations/page")).default;
  return { tree: await Page({ searchParams: Promise.resolve({ site: menuSiteId }) }), CurrentTabletConnectionPanel, OperationStatusCards };
}

function verifyKeys(node: ReactNode, found: Map<unknown, string | null>) {
  if (Array.isArray(node)) {
    const keys = node.filter(isValidElement).map(element => element.key).filter(key => key !== null);
    assert.equal(new Set(keys).size, keys.length, `Sibling keys must be unique: ${keys.join(", ")}`);
    node.forEach(child => verifyKeys(child, found));
  } else if (isValidElement<{ children?: ReactNode }>(node)) {
    found.set(node.type, node.key);
    verifyKeys(node.props.children, found);
  }
}

test("로그인된 운영 대시보드는 단말 패널을 제거하고 메뉴판 전환 시 상태 카드를 초기화한다", async () => {
  const snapshots: string[][] = [];
  for (const menuId of ["cd9afa8f-b862-48b3-848a-dec617279c6c", "11111111-1111-4111-8111-111111111111"]) {
    const { tree, CurrentTabletConnectionPanel, OperationStatusCards } = await renderDashboard(menuId);
    const found = new Map<unknown, string | null>(); verifyKeys(tree, found);
    assert.equal(found.has(CurrentTabletConnectionPanel), false);
    const cards = found.get(OperationStatusCards); assert.ok(cards);
    snapshots.push([cards]);
  }
  assert.notEqual(snapshots[0][0], snapshots[1][0]);
});
