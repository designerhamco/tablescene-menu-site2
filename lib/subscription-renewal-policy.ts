export type SubscriptionRenewalDisposition =
  | "expire_at_period_end"
  | "skip_missing_billing_key"
  | "charge";

export function getSubscriptionRenewalDisposition({
  cancelAtPeriodEnd,
  billingKeyRef,
}: {
  cancelAtPeriodEnd: boolean | null | undefined;
  billingKeyRef: string | null | undefined;
}): SubscriptionRenewalDisposition {
  if (cancelAtPeriodEnd === true) {
    return "expire_at_period_end";
  }

  if (!billingKeyRef?.trim()) {
    return "skip_missing_billing_key";
  }

  return "charge";
}
