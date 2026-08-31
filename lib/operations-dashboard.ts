import { hasMenuSitePermission, type MenuSiteAccessRole } from "@/lib/menu-site-permissions";
import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";

export type StoreOperationKey = "orders" | "calls" | "tables" | "sales";

export type StoreOperationAccess = Record<StoreOperationKey, boolean>;

export type StoreOperationsSiteEligibility = {
  accessRole: MenuSiteAccessRole;
  templateKey: string | null | undefined;
  menuSiteStatus: string | null | undefined;
  lifecycleState: string | null | undefined;
  lifecycleReason: string | null | undefined;
  canPreview: boolean;
  tableManagementEnabled: boolean;
  callManagementEnabled: boolean;
};

export function isStoreOperationsTemplate(templateKey: string | null | undefined) {
  return Boolean(templateKey && getDiningTemplateFeatures(templateKey).smartCall);
}

export function getStoreOperationAccess({
  accessRole,
  templateKey,
  tableManagementEnabled,
  callManagementEnabled,
}: {
  accessRole: MenuSiteAccessRole;
  templateKey: string | null | undefined;
  tableManagementEnabled: boolean;
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
    orders: false,
    calls: callManagementEnabled && hasMenuSitePermission(accessRole, "call.manage"),
    tables: tableManagementEnabled && hasMenuSitePermission(accessRole, "table.manage"),
    sales: false,
  };
}

export function hasAvailableStoreOperation(access: StoreOperationAccess) {
  return Object.values(access).some(Boolean);
}

export function isCurrentSmartCallOperationsSite({
  accessRole,
  templateKey,
  menuSiteStatus,
  lifecycleState,
  lifecycleReason,
  canPreview,
  tableManagementEnabled,
  callManagementEnabled,
}: StoreOperationsSiteEligibility) {
  return isStoreOperationsTemplate(templateKey)
    && menuSiteStatus === "published"
    && lifecycleState === "active"
    && lifecycleReason === "active"
    && canPreview
    && tableManagementEnabled
    && callManagementEnabled
    && hasMenuSitePermission(accessRole, "call.manage");
}
