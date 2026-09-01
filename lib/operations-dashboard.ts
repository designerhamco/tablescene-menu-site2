import { hasMenuSitePermission, type MenuSiteAccessRole } from "@/lib/menu-site-permissions";
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
};

export function isStoreOperationsTemplate(templateKey: string | null | undefined) {
  return Boolean(templateKey && getDiningTemplateFeatures(templateKey).smartCall);
}

export function getStoreOperationAccess({
  accessRole,
  templateKey,
  tableManagementEnabled,
  callManagementEnabled,
  pickupQueueEnabled,
}: {
  accessRole: MenuSiteAccessRole;
  templateKey: string | null | undefined;
  tableManagementEnabled: boolean;
  callManagementEnabled: boolean;
  pickupQueueEnabled: boolean;
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
    calls: smartCallTemplate && callManagementEnabled && hasMenuSitePermission(accessRole, "call.manage"),
    tables: smartCallTemplate && tableManagementEnabled && hasMenuSitePermission(accessRole, "table.manage"),
    sales: false,
    pickup: pickupQueueTemplate && pickupQueueEnabled && hasMenuSitePermission(accessRole, "pickup.manage"),
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

export function isCurrentPickupQueueOperationsSite({
  accessRole,
  templateKey,
  menuSiteStatus,
  lifecycleState,
  lifecycleReason,
  canPreview,
  pickupQueueEnabled,
}: StoreOperationsSiteEligibility) {
  return isPickupQueueTemplate(templateKey)
    && menuSiteStatus === "published"
    && lifecycleState === "active"
    && lifecycleReason === "active"
    && canPreview
    && pickupQueueEnabled
    && hasMenuSitePermission(accessRole, "pickup.manage");
}
