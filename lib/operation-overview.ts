import type { OperationStatusCardsProps } from "../components/mypage/OperationStatusCards";
import type { StoreOperationsSite } from "./server/store-operations-context";
import { getOperationReceptionState } from "./operation-reception-state";

export type OperationSiteOverview = { site: StoreOperationsSite; status: OperationStatusCardsProps; failed: boolean };

export function operationOverviewReception(status: OperationStatusCardsProps, feature: "orders" | "calls") {
  const flag = feature === "orders" ? status.settings?.orderEnabled : status.settings?.callEnabled;
  return getOperationReceptionState({ feature, published: status.published, enabled: flag === true, settingsKnown: typeof flag === "boolean",
    runtimeEnabled: status.runtime[feature], activeTablesReady: status.activeTablesReady,
    registeredTables: status.tableCounts ? status.tableCounts.registered + (status.kioskCounts?.registered ?? 0) : null,
    canRead: status.permissions[feature] });
}

export function summarizeOperationOverviews(overviews: readonly OperationSiteOverview[]) {
  const tableOverviews = overviews.filter(item => item.status.permissions.tables);
  const knownTables = tableOverviews.filter(item => item.status.tableCounts && item.status.kioskCounts);
  return {
    total: overviews.length,
    published: overviews.filter(item => item.status.published).length,
    tables: knownTables.reduce((sum, item) => sum + item.status.tableCounts!.registered, 0),
    kiosks: knownTables.reduce((sum, item) => sum + item.status.kioskCounts!.registered, 0),
    tableSources: tableOverviews.length,
    knownTableSources: knownTables.length,
    orders: overviews.filter(item => operationOverviewReception(item.status, "orders").accepting).length,
    calls: overviews.filter(item => operationOverviewReception(item.status, "calls").accepting).length,
    unknownOrders: overviews.filter(item => operationOverviewReception(item.status, "orders").reason === "조회 실패").length,
    unknownCalls: overviews.filter(item => operationOverviewReception(item.status, "calls").reason === "조회 실패").length,
  };
}
