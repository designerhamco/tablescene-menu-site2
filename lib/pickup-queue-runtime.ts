const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPickupQueueRuntimeEnabled(value = process.env.PICKUP_QUEUE_ENABLED) {
  return value?.trim().toLowerCase() === "true";
}

export function getPickupQueueAllowedSiteIds(value = process.env.PICKUP_QUEUE_ALLOWED_SITE_IDS) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((siteId) => siteId.trim().toLowerCase())
      .filter((siteId) => UUID_PATTERN.test(siteId)),
  );
}

export function isPickupQueueRuntimeEnabledForSite(
  menuSiteId: string,
  {
    enabled = isPickupQueueRuntimeEnabled(),
    allowedSiteIds = getPickupQueueAllowedSiteIds(),
  }: {
    enabled?: boolean;
    allowedSiteIds?: ReadonlySet<string>;
  } = {},
) {
  return enabled
    && UUID_PATTERN.test(menuSiteId)
    && allowedSiteIds.has(menuSiteId.toLowerCase());
}

export function isPickupQueueTemplate(templateKey: string | null | undefined) {
  return templateKey?.trim().toLowerCase().startsWith("display_") ?? false;
}
