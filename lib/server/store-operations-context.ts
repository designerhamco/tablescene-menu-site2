import "server-only";

import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import {
  getStoreOperationAccess,
  isCurrentOrderOperationsSite,
  type StoreOperationAccess,
} from "@/lib/operations-dashboard";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import {
  getAccessibleMenuSiteList,
  getMenuSiteAccessStateForMenuSite,
  type AccessibleMenuSiteListItem,
} from "@/lib/server/menu-site-access-service";
import { isTableManagementRuntimeEnabled } from "@/lib/table-management-runtime";

export type StoreOperationsSite = AccessibleMenuSiteListItem & {
  operationAccess: StoreOperationAccess;
};

export type StoreOperationsContext = {
  sites: StoreOperationsSite[];
  selectedSite: StoreOperationsSite | null;
};

export async function getStoreOperationsContext(
  requestedMenuSiteId?: string | null,
): Promise<StoreOperationsContext> {
  const accessibleMenuSites = await getAccessibleMenuSiteList();
  const candidates = accessibleMenuSites.filter((site) =>
    isOrderDashboardRuntimeEnabledForSite(site.menuSiteId)
    && isPostpayOrderRuntimeEnabledForSite(site.menuSiteId),
  );
  const lifecycleStates = await Promise.all(
    candidates.map((site) => getMenuSiteAccessStateForMenuSite({ menuSiteId: site.menuSiteId })),
  );
  const tableManagementEnabled = isTableManagementRuntimeEnabled();

  const sites = candidates.flatMap((site, index): StoreOperationsSite[] => {
    const lifecycle = lifecycleStates[index];
    const orderDashboardEnabled = isOrderDashboardRuntimeEnabledForSite(site.menuSiteId);

    if (
      !lifecycle
      || !isCurrentOrderOperationsSite({
        accessRole: site.accessRole,
        templateKey: site.templateKey,
        menuSiteStatus: site.status,
        lifecycleState: lifecycle.lifecycleState,
        lifecycleReason: lifecycle.reason,
        canPreview: lifecycle.canPreview,
        postpayOrderEnabled: isPostpayOrderRuntimeEnabledForSite(site.menuSiteId),
        orderDashboardEnabled,
      })
    ) {
      return [];
    }

    return [{
      ...site,
      operationAccess: getStoreOperationAccess({
        accessRole: site.accessRole,
        templateKey: site.templateKey,
        tableManagementEnabled,
        orderDashboardEnabled,
        callManagementEnabled: isCallRuntimeEnabledForSite(site.menuSiteId),
      }),
    }];
  });

  return {
    sites,
    selectedSite: sites.find((site) => site.menuSiteId === requestedMenuSiteId) ?? sites[0] ?? null,
  };
}
