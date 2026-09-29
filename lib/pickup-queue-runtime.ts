import { DESIGN_MENU_FOCUS_POLICY } from "@/lib/product-focus-policy";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPickupQueueRuntimeEnabled(value = process.env.PICKUP_QUEUE_ENABLED) {
  return DESIGN_MENU_FOCUS_POLICY.pickupQueue && value?.trim().toLowerCase() === "true";
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
  return DESIGN_MENU_FOCUS_POLICY.pickupQueue
    && enabled
    && UUID_PATTERN.test(menuSiteId)
    && allowedSiteIds.has(menuSiteId.toLowerCase());
}

export function isPickupQueueTemplate(templateKey: string | null | undefined) {
  return DESIGN_MENU_FOCUS_POLICY.pickupQueue
    && (templateKey?.trim().toLowerCase().startsWith("display_") ?? false);
}
