import "server-only";
import { loadAllMenuOperationSites, mergeAllMenuOrders, mergeAllMenuCalls } from "@/lib/all-menu-operations";
import type { OrderHistorySearch } from "@/lib/order-history-query";
import type { StoreOperationsSite } from "./store-operations-context";
import { listOrderDashboard } from "./order-management-service";
import { listCallDashboard } from "./call-management-service";
import { loadOperationsFloorPlan } from "./operations-floor-plan-service";

export async function listAllMenuOrders(sites: readonly StoreOperationsSite[], search: OrderHistorySearch = {}) {
  const result = await loadAllMenuOperationSites(sites, "orders", async site => {
    const [data, floor] = await Promise.all([listOrderDashboard(site.menuSiteId, search), loadOperationsFloorPlan(site.menuSiteId, "orders")]);
    return { data, floor };
  });
  return { ...mergeAllMenuOrders(result.pages, search), failures: result.failures, siteCount: result.siteCount };
}

export async function listAllMenuCalls(sites: readonly StoreOperationsSite[]) {
  const result = await loadAllMenuOperationSites(sites, "calls", async site => {
    const [data, floor] = await Promise.all([listCallDashboard(site.menuSiteId), loadOperationsFloorPlan(site.menuSiteId, "calls")]);
    return { data, floor };
  });
  return { ...mergeAllMenuCalls(result.pages), failures: result.failures, siteCount: result.siteCount };
}
