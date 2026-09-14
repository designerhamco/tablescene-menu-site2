import {
  hasMenuSitePermission,
  type MenuSiteAccessRole,
  type MenuSitePermission,
} from "@/lib/menu-site-permissions";
import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import { isPickupQueueTemplate } from "@/lib/pickup-queue-runtime";

export type StoreOperationKey = "orders" | "calls" | "tables" | "sales" | "pickup";

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
  pickupQueueEnabled: boolean;
  permissions?: readonly MenuSitePermission[];
};

function hasOperationPermission(
  accessRole: MenuSiteAccessRole,
  permissions: readonly MenuSitePermission[] | undefined,
  permission: MenuSitePermission,
) {
  return permissions
    ? permissions.includes(permission)
    : hasMenuSitePermission(accessRole, permission);
}

export function isStoreOperationsTemplate(templateKey: string | null | undefined) {
  return Boolean(templateKey && getDiningTemplateFeatures(templateKey).smartCall);
}

export function getStoreOperationAccess({
  accessRole,
  templateKey,
  tableManagementEnabled,
  callManagementEnabled,
  pickupQueueEnabled,
  permissions,
}: {
  accessRole: MenuSiteAccessRole;
  templateKey: string | null | undefined;
  tableManagementEnabled: boolean;
  callManagementEnabled: boolean;
  pickupQueueEnabled: boolean;
  permissions?: readonly MenuSitePermission[];
}): StoreOperationAccess {
  const smartCallTemplate = isStoreOperationsTemplate(templateKey);
  const pickupQueueTemplate = isPickupQueueTemplate(templateKey);
  if (!smartCallTemplate && !pickupQueueTemplate) {
    return {
      orders: false,
      calls: false,
      tables: false,
      sales: false,
      pickup: false,
    };
  }

  return {
    orders: false,
    calls: smartCallTemplate && callManagementEnabled && hasOperationPermission(accessRole, permissions, "call.manage"),
    tables: smartCallTemplate && tableManagementEnabled && hasOperationPermission(accessRole, permissions, "table.manage"),
    sales: false,
    pickup: pickupQueueTemplate && pickupQueueEnabled && hasOperationPermission(accessRole, permissions, "pickup.manage"),
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
  permissions,
}: StoreOperationsSiteEligibility) {
  return isStoreOperationsTemplate(templateKey)
    && menuSiteStatus === "published"
    && lifecycleState === "active"
    && lifecycleReason === "active"
    && canPreview
    && (
      hasOperationPermission(accessRole, permissions, "call.manage")
      || hasOperationPermission(accessRole, permissions, "table.manage")
    );
}

export function isCurrentPickupQueueOperationsSite({
  accessRole,
  templateKey,
  menuSiteStatus,
  lifecycleState,
  lifecycleReason,
  canPreview,
  permissions,
}: StoreOperationsSiteEligibility) {
  return isPickupQueueTemplate(templateKey)
    && menuSiteStatus === "published"
    && lifecycleState === "active"
    && lifecycleReason === "active"
    && canPreview
    && hasOperationPermission(accessRole, permissions, "pickup.manage");
}
