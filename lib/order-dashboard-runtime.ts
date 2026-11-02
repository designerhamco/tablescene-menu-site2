export function isOrderDashboardRuntimeEnabled(
  value = process.env.ORDER_DASHBOARD_ENABLED,
) {
  return value?.trim().toLowerCase() === "true";
}

export function isOrderDashboardRuntimeEnabledForSite(
  menuSiteId: unknown,
  options: {
    enabled?: boolean;
  } = {},
) {
  if (typeof menuSiteId !== "string") return false;
  const normalizedMenuSiteId = menuSiteId.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalizedMenuSiteId)) return false;
  const enabled = options.enabled ?? isOrderDashboardRuntimeEnabled();
  return enabled;
}
