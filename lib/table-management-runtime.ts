const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTableManagementRuntimeEnabled(value = process.env.TABLE_MANAGEMENT_ENABLED) {
  return value?.trim().toLowerCase() === "true";
}

export function getTableManagementAllowedSiteIds(value = process.env.TABLE_MANAGEMENT_ALLOWED_SITE_IDS) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((siteId) => siteId.trim().toLowerCase())
      .filter((siteId) => UUID_PATTERN.test(siteId)),
  );
}

export function isTableManagementRuntimeEnabledForSite(
  menuSiteId: string,
  {
    enabled = isTableManagementRuntimeEnabled(),
    allowedSiteIds = getTableManagementAllowedSiteIds(),
  }: {
    enabled?: boolean;
    allowedSiteIds?: ReadonlySet<string>;
  } = {},
) {
  return enabled
    && UUID_PATTERN.test(menuSiteId)
    && allowedSiteIds.has(menuSiteId.toLowerCase());
}
