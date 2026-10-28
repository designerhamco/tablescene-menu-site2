import "server-only";

import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import {
  getStoreOperationAccess,
  canConfigureStoreOperationsSite,
  isCurrentPickupQueueOperationsSite,
  isCurrentSmartCallOperationsSite,
  isStoreOperationsTemplate,
  isCurrentStoreOperationsMenu,
  type StoreOperationAccess,
} from "@/lib/operations-dashboard";
import {
  getAccessibleMenuSiteList,
  getMenuSiteAccessStateForMenuSite,
  type AccessibleMenuSiteListItem,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";
import { isPickupQueueRuntimeEnabledForSite, isPickupQueueTemplate } from "@/lib/pickup-queue-runtime";

export type StoreOperationsSite = AccessibleMenuSiteListItem & {
  operationAccess: StoreOperationAccess;
  canConfigure: boolean;
  canManageQr: boolean;
  tableSetupAvailable: boolean;
  activeTablesReady: boolean | null;
};

export type StoreOperationsContext = {
  sites: StoreOperationsSite[];
  selectedSite: StoreOperationsSite | null;
};

export async function getStoreOperationsContext(
  requestedMenuSiteId?: string | null,
): Promise<StoreOperationsContext> {
  const accessibleMenuSites = await getAccessibleMenuSiteList();
  const candidates = accessibleMenuSites.filter(
    (site) => isStoreOperationsTemplate(site.templateKey) || isPickupQueueTemplate(site.templateKey) || site.permissions.includes("qr.manage"),
  );
  const lifecycleStates = await Promise.all(
    candidates.map((site) => getMenuSiteAccessStateForMenuSite({ menuSiteId: site.menuSiteId })),
  );

  const sites = candidates.flatMap((site, index): StoreOperationsSite[] => {
    const lifecycle = lifecycleStates[index];
    if (!lifecycle || !isCurrentStoreOperationsMenu({ status: site.status, lifecycleState: lifecycle.lifecycleState, canPreview: lifecycle.canPreview })) return [];
    const orderDashboardEnabled = isOrderDashboardRuntimeEnabledForSite(site.menuSiteId);
    const tableManagementEnabled = isTableManagementRuntimeEnabledForSite(site.menuSiteId);
    const callManagementEnabled = isCallRuntimeEnabledForSite(site.menuSiteId);
    const pickupQueueEnabled = isPickupQueueRuntimeEnabledForSite(site.menuSiteId);

    const canConfigure = canConfigureStoreOperationsSite(site);
    const canManageQr = Boolean(lifecycle?.canPreview && site.permissions.includes("qr.manage"));
    const liveEligible = Boolean(lifecycle && lifecycle.planType === "business_basic"
      && (isCurrentSmartCallOperationsSite({
        accessRole: site.accessRole,
        templateKey: site.templateKey,
        menuSiteStatus: site.status,
        lifecycleState: lifecycle.lifecycleState,
        lifecycleReason: lifecycle.reason,
        canPreview: lifecycle.canPreview,
        orderDashboardEnabled,
        tableManagementEnabled,
        callManagementEnabled,
        pickupQueueEnabled,
        permissions: site.permissions,
      }) || isCurrentPickupQueueOperationsSite({
        accessRole: site.accessRole,
        templateKey: site.templateKey,
        menuSiteStatus: site.status,
        lifecycleState: lifecycle.lifecycleState,
        lifecycleReason: lifecycle.reason,
        canPreview: lifecycle.canPreview,
        orderDashboardEnabled,
        tableManagementEnabled,
        callManagementEnabled,
        pickupQueueEnabled,
        permissions: site.permissions,
      })));
    if (!liveEligible && !canConfigure && !canManageQr) {
      return [];
    }

    return [{
      ...site,
      canConfigure,
      canManageQr,
      tableSetupAvailable: isStoreOperationsTemplate(site.templateKey) && tableManagementEnabled
        && lifecycle.planType === "business_basic" && lifecycle.canEdit && lifecycle.canUseWriteActions
        && (site.isOwner || site.permissions.some(permission => ["table.manage", "order.read", "call.manage"].includes(permission))),
      activeTablesReady: false,
      operationAccess: liveEligible ? getStoreOperationAccess({
        accessRole: site.accessRole,
        templateKey: site.templateKey,
        orderDashboardEnabled,
        tableManagementEnabled,
        callManagementEnabled,
        pickupQueueEnabled,
        permissions: site.permissions,
      }) : { orders: false, calls: false, tables: false, sales: false, pickup: false },
    }];
  });

  // Only authenticated, currently usable sites and existing runtime targets reach this query.
  // Return readiness only; staff without table.manage never receive table identifiers or QR paths.
  const tableSites = sites.filter(site => site.tableSetupAvailable);
  await Promise.all(tableSites.map(async site => {
    const { data, error } = await createAdminClient().from("menu_tables")
      .select("menu_site_id").eq("menu_site_id", site.menuSiteId).eq("status", "active").limit(1).maybeSingle();
    if (error) console.warn("[store-operations] table readiness unavailable");
    site.activeTablesReady = error ? null : Boolean(data);
  }));

  return {
    sites,
    selectedSite: sites.find((site) => site.menuSiteId === requestedMenuSiteId) ?? sites[0] ?? null,
  };
}
