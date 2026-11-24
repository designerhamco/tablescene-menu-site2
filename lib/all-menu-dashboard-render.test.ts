import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as orderReceipt from "../components/mypage/OrderReceipt";
import * as liveOrderStatuses from "../components/mypage/useLiveOrderStatuses";
import type { OperationRecordSources } from "./all-menu-operations";

/** Render the real detail/form JSX with inert actions; no database or browser writes. */
function dashboard(kind: "orders" | "calls") {
  const stub = () => null;
  const panel = ({ as = "div", children }: { as?: string; children: React.ReactNode }) => React.createElement(as, null, children);
  const dependencies: Record<string, unknown> = {
    "react/jsx-runtime": jsxRuntime,
    react: { ...React, useState: (initial: unknown) => [initial, stub], useId: () => "qa", useMemo: (fn: () => unknown) => fn(), useEffect: stub, useTransition: () => [false, stub], useActionState: () => [{ status: "idle", message: "" }, "/qa-inert-action", false] },
    "next/navigation": { useRouter: () => ({ refresh: stub }) }, "next/link": { default: stub },
    "@/app/components/ui/button": { Button: stub }, "@/app/components/ui/content-panel": { ContentPanel: panel },
    "@/app/components/ui/badge": { Badge: panel }, "@/app/components/ui/table": { TableCell: panel },
    "@/app/components/ui/search-field": { SearchField: stub }, "@/app/components/ui/refresh-button": { RefreshButton: stub },
    "@/components/mypage/OrderHistoryFilters": { default: stub }, "@/components/mypage/OperationsHistoryTable": { default: stub },
    "@/components/mypage/OperationalArrivalAlert": { default: stub }, "@/components/ui/ActionFeedbackToast": { default: stub },
    "@/components/mypage/OperationsHistoryViews": { default: ({ records, renderDetail }: { records: { id: string }[]; renderDetail: (ids: string[]) => React.ReactNode }) => renderDetail(records.map(record => record.id)) },
    "@/components/mypage/OrderReceipt": orderReceipt, "@/components/mypage/useLiveOrderStatuses": liveOrderStatuses,
    "@/lib/dashboard-arrival-alerts": { shouldRefreshArrivalDashboard: stub }, "@/lib/korean-date-time": { formatKoreanDateTime: () => "2026. 11. 18." },
    "@/lib/order-history-query": { isCurrentOrder: () => true, orderHistoryHref: stub },
    "./actions": { mutateOrderAction: stub, mutateCallAction: stub },
    "./action-state": { initialOrderManagementActionState: {}, initialCallManagementActionState: {} },
  };
  const source = readFileSync(new URL(`../app/mypage/menus/[menuId]/${kind}/${kind === "orders" ? "Order" : "Call"}Dashboard.tsx`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const loaded = { exports: {} as { default?: React.ComponentType<Record<string, unknown>> } };
  new Function("require", "module", "exports", code)((name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, loaded, loaded.exports);
  return loaded.exports.default!;
}

const sourceA = "00000000-0000-4000-8000-000000000001", sourceB = "00000000-0000-4000-8000-000000000002";
const writable = { canManage: true, canCancelUnpaid: true, canMarkManualPayment: true };
const sources: OperationRecordSources = {
  a: { menuSiteId: sourceA, menuSiteName: "런치 메뉴판", roomName: "홀", permissions: writable },
  b: { menuSiteId: sourceB, menuSiteName: "디너 메뉴판", roomName: "홀", permissions: { canManage: false, canCancelUnpaid: false, canMarkManualPayment: false } },
};
const records = ["a", "b"].map(id => ({ id, tableId: id, tableLabel: "테이블 3", orderNumber: 1, callNumber: 1, status: "received", nextStatus: "accepted", paymentStatus: "unpaid", totalAmount: 9000, items: [], createdAt: "2026-11-18T00:00:00Z", canCancelUnpaid: true, canMarkManualPayment: true, requestLabel: "물 요청" }));

test("통합 주문 상세는 해당 메뉴판의 폼 대상과 권한만 사용한다", () => {
  const Component = dashboard("orders");
  const html = renderToStaticMarkup(React.createElement(Component, { menuSiteId: "all", menuSiteName: "전체 메뉴판", orders: records, permissions: writable, recordSources: sources }));
  const articles = html.match(/<article>[\s\S]*?<\/article>/g)!;
  assert.equal(articles.length, 2);
  assert.match(articles[0], /런치 메뉴판/);
  assert.equal(articles[0].split(`name="menuSiteId" value="${sourceA}"`).length - 1, 3);
  assert.match(articles[0], /상태 변경/);
  assert.match(articles[1], /디너 메뉴판/);
  assert.doesNotMatch(articles[1], /name="menuSiteId"|상태 변경|결제 완료 기록|주문 취소/);
  assert.doesNotMatch(html, /name="menuSiteId" value="all"/);
  const individual = renderToStaticMarkup(React.createElement(Component, { menuSiteId: sourceA, menuSiteName: "런치 메뉴판", orders: records.slice(0, 1), permissions: writable }));
  assert.doesNotMatch(individual, /런치 메뉴판/);
  assert.match(individual, new RegExp(`name="menuSiteId" value="${sourceA}"`));
});

test("통합 호출 상세의 동일 호출번호도 원래 메뉴판으로 각각 처리한다", () => {
  const Component = dashboard("calls");
  const html = renderToStaticMarkup(React.createElement(Component, { menuSiteId: "all", calls: records.map(record => ({ ...record, status: "pending", nextStatus: "acknowledged" })), recordSources: sources }));
  const articles = html.match(/<article>[\s\S]*?<\/article>/g)!;
  assert.match(articles[0], /런치 메뉴판/);
  assert.match(articles[0], new RegExp(`name="menuSiteId" value="${sourceA}"`));
  assert.match(articles[1], /디너 메뉴판/);
  assert.match(articles[1], new RegExp(`name="menuSiteId" value="${sourceB}"`));
  assert.doesNotMatch(html, /name="menuSiteId" value="all"/);
});
