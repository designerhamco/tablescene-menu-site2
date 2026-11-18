import "server-only";
import { isStoreOperationsTemplate } from "@/lib/operations-dashboard";
import type { OperationSiteOverview } from "@/lib/operation-overview";
import type { StoreOperationsSite } from "./store-operations-context";
import { listMenuTables } from "./menu-table-management-service";
import { loadMenuOrderSettings, loadOperationReceptionSummary } from "./menu-order-settings-service";

async function optional<T>(enabled: boolean, load: () => Promise<T>, failures: boolean[]) {
  if (!enabled) return null;
  try { return await load(); } catch { failures.push(true); return null; }
}

/** Same read boundaries and state inputs as the existing individual dashboard. */
export async function loadOperationSiteOverview(site: StoreOperationsSite): Promise<OperationSiteOverview> {
  const failures: boolean[] = [];
  const canReadTables = site.tableSetupAvailable && site.permissions.includes("table.manage");
  const [tables, settings, reception] = await Promise.all([
    optional(canReadTables, () => listMenuTables(site.menuSiteId), failures),
    optional(site.canConfigure, () => loadMenuOrderSettings(site.menuSiteId), failures),
    optional(!site.canConfigure && (site.operationAccess.orders || site.operationAccess.calls), () => loadOperationReceptionSummary(site.menuSiteId), failures),
  ]);
  return { site, failed: failures.length > 0, status: {
    menuId: site.menuSiteId, published: site.status === "published", canPublish: site.permissions.includes("menu.publish"), canConfigure: site.canConfigure,
    permissions: { orders: site.permissions.includes("order.read"), calls: site.permissions.includes("call.manage"), tables: canReadTables, edit: site.permissions.includes("menu.edit") },
    historyAccess: site.operationAccess, settings: settings?.settings ?? reception,
    runtime: settings?.runtime ?? { orders: reception?.runtime.orders ?? false, calls: reception?.runtime.calls ?? false, tables: site.tableSetupAvailable },
    activeTablesReady: site.activeTablesReady,
    tableCounts: tables ? { registered: tables.tables.filter(table => table.kind !== "kiosk").length, active: tables.tables.filter(table => table.kind !== "kiosk" && table.status === "active").length, disabled: tables.tables.filter(table => table.kind !== "kiosk" && table.status === "disabled").length } : null,
    kioskCounts: tables ? { registered: tables.tables.filter(table => table.kind === "kiosk").length, active: tables.tables.filter(table => table.kind === "kiosk" && table.status === "active").length } : null,
  } };
}

export async function loadAllMenuOperationOverviews(sites: readonly StoreOperationsSite[]) {
  const supported = sites.filter(site => isStoreOperationsTemplate(site.templateKey));
  const overviews: OperationSiteOverview[] = [];
  for (let offset = 0; offset < supported.length; offset += 4) overviews.push(...await Promise.all(supported.slice(offset, offset + 4).map(loadOperationSiteOverview)));
  return overviews;
}
