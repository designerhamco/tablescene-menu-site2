import { hasMenuSitePermission, type MenuSiteAccessRole } from "@/lib/menu-site-permissions";
import { isTemplateSupportedForService } from "@/lib/template-types";

export type StoreOperationKey = "orders" | "calls" | "tables" | "sales";

export type StoreOperationAccess = Record<StoreOperationKey, boolean>;

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
