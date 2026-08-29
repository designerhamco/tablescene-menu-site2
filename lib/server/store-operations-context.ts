import "server-only";

import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import {
  getStoreOperationAccess,
  isCurrentSmartCallOperationsSite,
  type StoreOperationAccess,
} from "@/lib/operations-dashboard";
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
  const tableManagementEnabled = isTableManagementRuntimeEnabled();
  const candidates = accessibleMenuSites.filter((site) => isCallRuntimeEnabledForSite(site.menuSiteId));
  const lifecycleStates = await Promise.all(
    candidates.map((site) => getMenuSiteAccessStateForMenuSite({ menuSiteId: site.menuSiteId })),
  );

  const sites = candidates.flatMap((site, index): StoreOperationsSite[] => {
    const lifecycle = lifecycleStates[index];
    const callManagementEnabled = isCallRuntimeEnabledForSite(site.menuSiteId);

    if (
      !lifecycle
      || !isCurrentSmartCallOperationsSite({
        accessRole: site.accessRole,
        templateKey: site.templateKey,
        menuSiteStatus: site.status,
        lifecycleState: lifecycle.lifecycleState,
        lifecycleReason: lifecycle.reason,
        canPreview: lifecycle.canPreview,
        tableManagementEnabled,
        callManagementEnabled,
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
        callManagementEnabled,
      }),
    }];
  });

  return {
    sites,
    selectedSite: sites.find((site) => site.menuSiteId === requestedMenuSiteId) ?? sites[0] ?? null,
  };
}
