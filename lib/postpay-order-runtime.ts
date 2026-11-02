const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Runtime gates are global emergency switches. Services separately enforce
// paid access, supported templates, table sessions and owner settings.
export const POSTPAY_ORDER_PRODUCT_POLICY_ENABLED = true;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isPostpayOrderRuntimeEnabled(value = process.env.POSTPAY_ORDER_ENABLED) {
  return POSTPAY_ORDER_PRODUCT_POLICY_ENABLED && value?.trim().toLowerCase() === "true";
}

export function isPostpayOrderRuntimeEnabledForSite(
  menuSiteId: string,
  {
    enabled = isPostpayOrderRuntimeEnabled(),
  }: {
    enabled?: boolean;
  } = {},
) {
  return POSTPAY_ORDER_PRODUCT_POLICY_ENABLED
    && enabled
    && isUuid(menuSiteId);
}
