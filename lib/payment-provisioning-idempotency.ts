const PURCHASE_ATTEMPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProvisioningAction = "create" | "return_existing" | "recover" | "manual_review";

export type BusinessProvisioningSnapshot = {
  status: string;
  menuSiteId: string | null;
  paymentId: string | null;
  hasOrder: boolean;
  hasPayment: boolean;
  hasEntitlement: boolean;
};

export function normalizePurchaseAttemptId(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  return PURCHASE_ATTEMPT_ID_PATTERN.test(normalized) ? normalized : null;
}

export function getInitialSubscriptionPaymentId(purchaseAttemptId: string) {
  const normalized = normalizePurchaseAttemptId(purchaseAttemptId);
  if (!normalized) {
    throw new Error("INVALID_PURCHASE_ATTEMPT_ID");
  }

  return `billing_${normalized.replaceAll("-", "")}`;
}

export function getBusinessProvisioningAction({
  expectedPaymentId,
  snapshot,
}: {
  expectedPaymentId: string;
  snapshot: BusinessProvisioningSnapshot | null;
}): ProvisioningAction {
  if (!snapshot) return "create";

  if (snapshot.paymentId && snapshot.paymentId !== expectedPaymentId) {
    return "manual_review";
  }

  if (
    snapshot.status === "active" &&
    snapshot.menuSiteId &&
    snapshot.paymentId === expectedPaymentId &&
    snapshot.hasOrder &&
    snapshot.hasPayment &&
    snapshot.hasEntitlement
  ) {
    return "return_existing";
  }

  if (["pending", "failed", "active"].includes(snapshot.status)) {
    return "recover";
  }

  return "manual_review";
}

export function getPaymentProvisioningAction({
  hasOrder,
  hasPayment,
  hasMenuSite,
  hasEntitlement,
}: {
  hasOrder: boolean;
  hasPayment: boolean;
  hasMenuSite: boolean;
  hasEntitlement: boolean;
}): ProvisioningAction {
  if (!hasOrder && !hasPayment && !hasMenuSite && !hasEntitlement) return "create";
  if (hasOrder && hasPayment && hasMenuSite && hasEntitlement) return "return_existing";
  if (hasMenuSite || hasOrder || hasPayment) return "recover";
  return "manual_review";
}
