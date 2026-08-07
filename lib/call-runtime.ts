const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCallRuntimeEnabled(value = process.env.CALL_ENABLED) {
  return value?.trim().toLowerCase() === "true";
}

export function getCallAllowedSiteIds(value = process.env.CALL_ALLOWED_SITE_IDS) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((siteId) => siteId.trim().toLowerCase())
      .filter((siteId) => UUID_PATTERN.test(siteId)),
  );
}

export function isCallRuntimeEnabledForSite(
  menuSiteId: string,
  {
    enabled = isCallRuntimeEnabled(),
    allowedSiteIds = getCallAllowedSiteIds(),
  }: {
    enabled?: boolean;
    allowedSiteIds?: ReadonlySet<string>;
  } = {},
) {
  return enabled
    && UUID_PATTERN.test(menuSiteId)
    && allowedSiteIds.has(menuSiteId.toLowerCase());
}
