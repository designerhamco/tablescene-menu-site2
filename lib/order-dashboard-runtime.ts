export function isOrderDashboardRuntimeEnabled(
  value = process.env.ORDER_DASHBOARD_ENABLED,
) {
  return value?.trim().toLowerCase() === "true";
}

export function getOrderDashboardAllowedSiteIds(
  value = process.env.ORDER_DASHBOARD_ALLOWED_SITE_IDS,
) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(entry)),
  );
}

export function isOrderDashboardRuntimeEnabledForSite(
  menuSiteId: unknown,
  options: {
    enabled?: boolean;
    allowedSiteIds?: ReadonlySet<string>;
  } = {},
) {
  if (typeof menuSiteId !== "string") return false;
  const normalizedMenuSiteId = menuSiteId.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalizedMenuSiteId)) return false;
  const enabled = options.enabled ?? isOrderDashboardRuntimeEnabled();
  const allowedSiteIds = options.allowedSiteIds ?? getOrderDashboardAllowedSiteIds();
  return enabled && allowedSiteIds.has(normalizedMenuSiteId);
}
