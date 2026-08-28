import { hasMenuSitePermission, type MenuSiteAccessRole } from "@/lib/menu-site-permissions";
import { isTemplateSupportedForService } from "@/lib/template-types";

export type StoreOperationKey = "orders" | "calls" | "tables" | "sales";

export type StoreOperationAccess = Record<StoreOperationKey, boolean>;

export type StoreOperationsSiteEligibility = {
  accessRole: MenuSiteAccessRole;
  templateKey: string | null | undefined;
  menuSiteStatus: string | null | undefined;
  lifecycleState: string | null | undefined;
  lifecycleReason: string | null | undefined;
  canPreview: boolean;
  postpayOrderEnabled: boolean;
  orderDashboardEnabled: boolean;
};

export function isStoreOperationsTemplate(templateKey: string | null | undefined) {
  return Boolean(templateKey && isTemplateSupportedForService(templateKey, "basic"));
}

export function getStoreOperationAccess({
  accessRole,
  templateKey,
  tableManagementEnabled,
  orderDashboardEnabled,
  callManagementEnabled,
}: {
  accessRole: MenuSiteAccessRole;
  templateKey: string | null | undefined;
  tableManagementEnabled: boolean;
  orderDashboardEnabled: boolean;
  callManagementEnabled: boolean;
}): StoreOperationAccess {
  if (!isStoreOperationsTemplate(templateKey)) {
    return {
      orders: false,
      calls: false,
      tables: false,
      sales: false,
    };
  }

  return {
    orders: orderDashboardEnabled && hasMenuSitePermission(accessRole, "order.read"),
    calls: callManagementEnabled && hasMenuSitePermission(accessRole, "call.manage"),
    tables: tableManagementEnabled && hasMenuSitePermission(accessRole, "table.manage"),
    sales: orderDashboardEnabled && hasMenuSitePermission(accessRole, "sales.read"),
  };
}

export function hasAvailableStoreOperation(access: StoreOperationAccess) {
  return Object.values(access).some(Boolean);
}

export function isCurrentOrderOperationsSite({
  accessRole,
  templateKey,
  menuSiteStatus,
  lifecycleState,
  lifecycleReason,
  canPreview,
  postpayOrderEnabled,
  orderDashboardEnabled,
}: StoreOperationsSiteEligibility) {
  return isStoreOperationsTemplate(templateKey)
    && menuSiteStatus === "published"
    && lifecycleState === "active"
    && lifecycleReason === "active"
    && canPreview
    && postpayOrderEnabled
    && orderDashboardEnabled
    && hasMenuSitePermission(accessRole, "order.read");
}
