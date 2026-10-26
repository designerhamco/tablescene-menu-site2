import "server-only";

import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import {
  getStoreOperationAccess,
  canConfigureStoreOperationsSite,
  isCurrentPickupQueueOperationsSite,
  isCurrentSmartCallOperationsSite,
  isStoreOperationsTemplate,
  type StoreOperationAccess,
} from "@/lib/operations-dashboard";
import {
  getAccessibleMenuSiteList,
  getMenuSiteAccessStateForMenuSite,
  type AccessibleMenuSiteListItem,
} from "@/lib/server/menu-site-access-service";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";
import { isPickupQueueRuntimeEnabledForSite, isPickupQueueTemplate } from "@/lib/pickup-queue-runtime";

export type StoreOperationsSite = AccessibleMenuSiteListItem & {
  operationAccess: StoreOperationAccess;
  canConfigure: boolean;
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
    (site) => isStoreOperationsTemplate(site.templateKey) || isPickupQueueTemplate(site.templateKey),
  );
  const lifecycleStates = await Promise.all(
    candidates.map((site) => getMenuSiteAccessStateForMenuSite({ menuSiteId: site.menuSiteId })),
  );

  const sites = candidates.flatMap((site, index): StoreOperationsSite[] => {
    const lifecycle = lifecycleStates[index];
    const orderDashboardEnabled = isOrderDashboardRuntimeEnabledForSite(site.menuSiteId);
    const tableManagementEnabled = isTableManagementRuntimeEnabledForSite(site.menuSiteId);
    const callManagementEnabled = isCallRuntimeEnabledForSite(site.menuSiteId);
    const pickupQueueEnabled = isPickupQueueRuntimeEnabledForSite(site.menuSiteId);

    const canConfigure = canConfigureStoreOperationsSite(site);
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
    if (!liveEligible && !canConfigure) {
      return [];
    }

    return [{
      ...site,
      canConfigure,
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

  return {
    sites,
    selectedSite: sites.find((site) => site.menuSiteId === requestedMenuSiteId) ?? sites[0] ?? null,
  };
}
