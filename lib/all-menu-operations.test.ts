import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TableCell } from "../app/components/ui/table";
import OperationsHistoryTable from "../components/mypage/OperationsHistoryTable";
import { allMenuOperationSites, allMenuOperationsHref, allMenuListFloor, loadAllMenuOperationSites, mergeAllMenuOrders, mergeAllMenuCalls } from "./all-menu-operations";
import { defaultOrderHistoryFilters, parseOrderCursor } from "./order-history-query";
import type { StoreOperationsSite } from "./server/store-operations-context";
import type { OrderDashboardPageData } from "./server/order-management-service";
import type { CallDashboardPageData } from "./server/call-management-service";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const permissions = { canManage: true, canCancelUnpaid: true, canMarkManualPayment: true };
const readOnly = { canManage: false, canCancelUnpaid: false, canMarkManualPayment: false };
function site(n: number, templateKey = "cafe_design_a", orders = true, calls = true) {
  return { menuSiteId: id(n), name: `메뉴판 ${n}`, templateKey, operationAccess: { orders, calls, tables: false, sales: false, pickup: false } } as StoreOperationsSite;
}
function order(n: number) {
  return { id: id(n), tableId: id(n + 1000), tableLabel: "테이블 3", orderNumber: 1, createdAt: `2026-11-18T00:${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}Z`, status: "pending", paymentStatus: "unpaid", items: [] } as unknown as OrderDashboardPageData["orders"][number];
}
function page(n: number, numbers: number[], access = permissions, history = false) {
  return { floor: allMenuListFloor, data: {
    menuSite: { id: id(n), name: `메뉴판 ${n}` }, permissions: access, orders: numbers.map(order),
    view: { kind: history ? "history" : "current", filters: defaultOrderHistoryFilters(), totalCount: numbers.length, olderCursor: null, newerCursor: null, tables: [{ id: id(n + 1000), label: "테이블 3", archived: false }] },
  } as OrderDashboardPageData };
}

test("전체 메뉴판은 기능별로 허용된 베이직·다이닝만 포함한다", () => {
  const sites = [site(1), site(2, "dining_aube_table_a", false, true), site(3, "display_menu_a"), site(4, "unknown"), site(5, "cafe_design_a", false, false)];
  assert.deepEqual(allMenuOperationSites(sites, "orders").map(site => site.menuSiteId), [id(1)]);
  assert.deepEqual(allMenuOperationSites(sites, "calls").map(site => site.menuSiteId), [id(1), id(2)]);
  assert.equal(allMenuOperationsHref("orders"), "/mypage/operations/orders");
  assert.equal(allMenuOperationsHref("call-items"), "/mypage/operations/calls");
  assert.equal(allMenuOperationsHref("tables"), "/mypage/operations?site=all");
});

test("조회 권한 없는 사이트를 호출하지 않으며 한 메뉴판 실패를 빈 결과로 숨기지 않는다", async () => {
  const requested: string[] = [];
  const result = await loadAllMenuOperationSites([site(1), site(2), site(3, "display_menu_a"), site(4, "cafe_design_a", false)], "orders", async site => {
    requested.push(site.menuSiteId);
    if (site.menuSiteId === id(2)) throw new Error("permission revoked");
    return site.menuSiteId;
  });
  assert.deepEqual(requested, [id(1), id(2)]);
  assert.deepEqual(result, { pages: [id(1)], failures: ["메뉴판 2"], siteCount: 2 });
});

test("여러 메뉴판 조회는 최대 네 개씩 진행한다", async () => {
  let active = 0, maximum = 0;
  const result = await loadAllMenuOperationSites(Array.from({ length: 11 }, (_, n) => site(n)), "orders", async () => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--; return true;
  });
  assert.equal(result.pages.length, 11);
  assert.equal(maximum, 4);
});

test("동일 테이블명과 주문번호라도 원래 메뉴판·행별 처리 권한을 유지한다", () => {
  const merged = mergeAllMenuOrders([page(1, [1]), page(2, [2], readOnly)]);
  assert.deepEqual(merged.orders.map(order => order.id), [id(2), id(1)]);
  assert.equal(merged.sources[id(1)].menuSiteId, id(1));
  assert.equal(merged.sources[id(1)].menuSiteName, "메뉴판 1");
  assert.equal(merged.sources[id(2)].permissions?.canManage, false);
  assert.equal(merged.sources[id(1)].permissions?.canManage, true);
  assert.deepEqual(merged.arrivals.map(group => group.menuSiteId), [id(1), id(2)]);
});

test("전체 주문 이력은 메뉴판별 50건을 합친 뒤 전역 50건을 선택한다", () => {
  const odd = Array.from({ length: 50 }, (_, n) => n * 2 + 1), even = odd.map(n => n + 1);
  const merged = mergeAllMenuOrders([page(1, odd, permissions, true), page(2, even, readOnly, true)], { tab: "history" });
  assert.equal(merged.orders.length, 50);
  assert.equal(merged.orders[0].id, id(100));
  assert.equal(merged.orders[49].id, id(51));
  assert.equal(merged.view?.totalCount, 100);
  assert.equal(parseOrderCursor(merged.view!.olderCursor!).id, id(51));
  assert.equal(merged.view?.newerCursor, null);
  assert.equal(Object.keys(merged.sources).length, 50);
  assert.deepEqual(merged.view?.tables.map(table => table.label), ["메뉴판 1 · 테이블 3", "메뉴판 2 · 테이블 3"]);
});

test("통합 순서는 소수점 없는 시각·마이크로초·다른 표기 시간대도 정확하게 비교한다", () => {
  const first = page(1, [1, 3]), second = page(2, [2, 4]);
  first.data.orders[0].createdAt = "2026-11-18T12:00:00+00:00";
  second.data.orders[0].createdAt = "2026-11-18T12:00:00.000001+00:00";
  first.data.orders[1].createdAt = "2026-11-18T12:00:00.000002+00:00";
  second.data.orders[1].createdAt = "2026-11-18T21:00:00.000002+09:00";
  assert.deepEqual(mergeAllMenuOrders([first, second]).orders.map(order => order.id), [id(4), id(3), id(2), id(1)]);
});

test("이전 페이지는 커서 바로 다음 50건을 선택해서 이력을 건너뛰지 않는다", () => {
  const numbers = Array.from({ length: 50 }, (_, n) => n + 51);
  const merged = mergeAllMenuOrders([page(1, numbers.filter(n => n % 2), permissions, true), page(2, numbers.filter(n => !(n % 2)), permissions, true)], { tab: "history", cursor: `${order(50).createdAt}|${id(50)}`, direction: "newer" });
  assert.equal(merged.orders[0].id, id(100));
  assert.equal(merged.orders[49].id, id(51));
  assert.equal(merged.view?.newerCursor, null);
  assert.equal(parseOrderCursor(merged.view!.olderCursor!).id, id(51));
});

test("이전 페이지 후보가 50건을 넘으면 커서에 가까운 50건을 선택한다", () => {
  const merged = mergeAllMenuOrders([page(1, Array.from({ length: 50 }, (_, n) => n + 51), permissions, true), page(2, Array.from({ length: 50 }, (_, n) => n + 101), permissions, true)], { tab: "history", cursor: `${order(50).createdAt}|${id(50)}`, direction: "newer" });
  assert.equal(merged.orders[0].id, id(100));
  assert.equal(merged.orders[49].id, id(51));
  assert.equal(parseOrderCursor(merged.view!.newerCursor!).id, id(100));
});

test("호출도 이름이나 번호로 합치지 않고 시간순·출처·알림 대상을 유지한다", () => {
  const pages = [1, 2].map(n => ({ floor: allMenuListFloor, data: { menuSite: { id: id(n), name: `메뉴판 ${n}` }, calls: [{ ...order(n), callNumber: 1, requestLabel: "물 요청", status: "pending" }], callItems: [], callService: "basic" } as unknown as CallDashboardPageData }));
  const merged = mergeAllMenuCalls(pages);
  assert.deepEqual(merged.calls.map(call => call.id), [id(2), id(1)]);
  assert.equal(merged.sources[id(2)].menuSiteName, "메뉴판 2");
  assert.deepEqual(merged.arrivals[0].arrivalIds, [id(1)]);
});

test("메뉴판 이름 열은 통합 테이블에만 표시하고 개별 테이블은 일곱 열을 유지한다", () => {
  const merged = mergeAllMenuOrders([page(1, [1])]);
  const props = { noun: "주문" as const, floorPlan: allMenuListFloor, records: merged.orders, renderRecord: () => createElement(TableCell, null, "내역") };
  const individual = renderToStaticMarkup(createElement(OperationsHistoryTable, props));
  const aggregate = renderToStaticMarkup(createElement(OperationsHistoryTable, { ...props, recordSources: merged.sources }));
  assert.doesNotMatch(individual, /메뉴판 이름|메뉴판 1/);
  assert.match(aggregate, /메뉴판 이름/);
  assert.match(aggregate, /메뉴판 1/);
});
