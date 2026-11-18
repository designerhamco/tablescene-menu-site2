import { isStoreOperationsTemplate } from "./operations-dashboard";
import { ORDER_HISTORY_PAGE_SIZE, normalizeOrderHistory, type OrderHistorySearch } from "./order-history-query";
import { getOperationHistoryRows, type OperationsFloorPlan } from "./operations-history";
import type { OrderDashboardPageData } from "./server/order-management-service";
import type { CallDashboardPageData } from "./server/call-management-service";
import type { StoreOperationsSite } from "./server/store-operations-context";

export const ALL_MENU_SITE_ID = "all";
export type AllMenuFeature = "orders" | "calls";
export type OperationRecordSource = {
  menuSiteId: string;
  menuSiteName: string;
  roomName: string;
  permissions?: OrderDashboardPageData["permissions"];
};
export type OperationRecordSources = Record<string, OperationRecordSource>;
export type OperationArrivalGroup = { menuSiteId: string; menuSiteName: string; arrivalIds: string[] };

export function allMenuOperationsHref(section: string) {
  if (section === "orders" || section.startsWith("order-")) return "/mypage/operations/orders";
  if (section === "calls" || section.startsWith("call-")) return "/mypage/operations/calls";
  return "/mypage/operations?site=all";
}

/** Aggregation never adds a capability or an employee permission to a site. */
export function allMenuOperationSites(sites: readonly StoreOperationsSite[], feature: AllMenuFeature) {
  return sites.filter(site => isStoreOperationsTemplate(site.templateKey) && site.operationAccess[feature]);
}

export async function loadAllMenuOperationSites<T>(sites: readonly StoreOperationsSite[], feature: AllMenuFeature, load: (site: StoreOperationsSite) => Promise<T>) {
  const eligible = allMenuOperationSites(sites, feature);
  const pages: T[] = [], failures: string[] = [];
  // Bound fan-out while retaining each loader's independent server-side checks.
  for (let offset = 0; offset < eligible.length; offset += 4) {
    const batch = eligible.slice(offset, offset + 4);
    const results = await Promise.allSettled(batch.map(load));
    results.forEach((result, index) => {
      if (result.status === "fulfilled") pages.push(result.value);
      else failures.push(batch[index].name || "이름 없는 메뉴판");
    });
  }
  return { pages, failures, siteCount: eligible.length };
}

export const allMenuListFloor: OperationsFloorPlan = {
  available: true, revision: 0, document: { rooms: [], placements: [] }, points: [],
};

type OrderPage = { data: OrderDashboardPageData; floor: OperationsFloorPlan };
type CallPage = { data: CallDashboardPageData; floor: OperationsFloorPlan };
function recordSources<T extends { id: string; tableId: string; tableLabel: string }>(
  records: readonly T[], floor: OperationsFloorPlan, site: { id: string; name: string }, permissions?: OrderDashboardPageData["permissions"],
): OperationRecordSources {
  return Object.fromEntries(getOperationHistoryRows(floor, records).flatMap(row => row.record ? [[row.record.id, {
    menuSiteId: site.id, menuSiteName: site.name || "이름 없는 메뉴판", roomName: row.roomName, permissions,
  }]] : []));
}

const microsecondsWithinMillisecond = (value: string) => Number((value.match(/\.(\d+)(?:Z|[+-]\d{2}:\d{2})$/)?.[1] ?? "").padEnd(6, "0").slice(3, 6));
const newestFirst = (a: { createdAt: string; id: string }, b: { createdAt: string; id: string }) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt)
  || microsecondsWithinMillisecond(b.createdAt) - microsecondsWithinMillisecond(a.createdAt)
  || b.id.localeCompare(a.id);
const cursorFor = (row: { createdAt: string; id: string }) => `${row.createdAt}|${row.id}`;

/** Each authorized site's page uses the same global keyset cursor. Merge before slicing. */
export function mergeAllMenuOrders(pages: readonly OrderPage[], search: OrderHistorySearch = {}) {
  const sources = Object.assign({}, ...pages.map(({ data, floor }) => recordSources(data.orders, floor, data.menuSite, data.permissions))) as OperationRecordSources;
  const candidates = pages.flatMap(page => page.data.orders).sort(newestFirst);
  const firstView = pages[0]?.data.view;
  let view = firstView ? { ...firstView } : undefined;
  let orders = candidates;
  if (view?.kind === "history") {
    if (!view.error) {
      const { cursor, direction } = normalizeOrderHistory(search);
      const extra = candidates.length > ORDER_HISTORY_PAGE_SIZE || pages.some(page => Boolean(direction === "newer" ? page.data.view?.newerCursor : page.data.view?.olderCursor));
      orders = direction === "newer" ? candidates.slice(-ORDER_HISTORY_PAGE_SIZE) : candidates.slice(0, ORDER_HISTORY_PAGE_SIZE);
      view.olderCursor = orders.length && (direction === "older" ? extra : Boolean(cursor)) ? cursorFor(orders[orders.length - 1]) : null;
      view.newerCursor = orders.length && (direction === "newer" ? extra : Boolean(cursor)) ? cursorFor(orders[0]) : null;
    }
    view = {
      ...view,
      totalCount: pages.reduce((sum, page) => sum + (page.data.view?.totalCount ?? 0), 0),
      tables: pages.flatMap(({ data }) => (data.view?.tables ?? []).map(table => ({ ...table, label: `${data.menuSite.name || "이름 없는 메뉴판"} · ${table.label}` }))),
    };
  }
  // Only expose metadata for the rendered page, never for records hidden by pagination.
  const renderedSources = Object.fromEntries(orders.map(order => [order.id, sources[order.id]]));
  return { orders, view, sources: renderedSources, arrivals: pages.map(({ data }) => ({
    menuSiteId: data.menuSite.id, menuSiteName: data.menuSite.name,
    arrivalIds: data.orders.filter(order => order.status !== "cancelled").map(order => order.id),
  })) };
}

export function mergeAllMenuCalls(pages: readonly CallPage[]) {
  return {
    calls: pages.flatMap(page => page.data.calls).sort(newestFirst),
    sources: Object.assign({}, ...pages.map(({ data, floor }) => recordSources(data.calls, floor, data.menuSite))) as OperationRecordSources,
    arrivals: pages.map(({ data }) => ({ menuSiteId: data.menuSite.id, menuSiteName: data.menuSite.name,
      arrivalIds: data.calls.filter(call => call.status === "pending").map(call => call.id),
    })),
  };
}
