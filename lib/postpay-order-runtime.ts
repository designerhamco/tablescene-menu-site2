const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Product support is restored; runtime enablement, an explicit site allowlist,
// a valid table session and owner settings are still required by submission.
export const POSTPAY_ORDER_PRODUCT_POLICY_ENABLED = true;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isPostpayOrderRuntimeEnabled(value = process.env.POSTPAY_ORDER_ENABLED) {
  return POSTPAY_ORDER_PRODUCT_POLICY_ENABLED && value?.trim().toLowerCase() === "true";
}

export function getPostpayOrderAllowedSiteIds(value = process.env.POSTPAY_ORDER_ALLOWED_SITE_IDS) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((siteId) => siteId.trim().toLowerCase())
      .filter(isUuid),
  );
}

export function isPostpayOrderRuntimeEnabledForSite(
  menuSiteId: string,
  {
    enabled = isPostpayOrderRuntimeEnabled(),
    allowedSiteIds = getPostpayOrderAllowedSiteIds(),
  }: {
    enabled?: boolean;
    allowedSiteIds?: ReadonlySet<string>;
  } = {},
) {
  return POSTPAY_ORDER_PRODUCT_POLICY_ENABLED
    && enabled
    && isUuid(menuSiteId)
    && allowedSiteIds.has(menuSiteId.toLowerCase());
}
