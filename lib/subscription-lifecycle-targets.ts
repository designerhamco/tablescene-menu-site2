export type SubscriptionLifecycleEntitlement = {
  id: string | null;
  menu_site_id: string | null;
  subscription_id: string | null;
};

export type SubscriptionLifecycleTargets = {
  entitlementIds: string[];
  menuSiteIds: string[];
  isLegacyMultiSite: boolean;
};

export function getSubscriptionLifecycleTargets({
  subscriptionId,
  representativeMenuSiteId,
  entitlements,
}: {
  subscriptionId: string;
  representativeMenuSiteId?: string | null;
  entitlements: SubscriptionLifecycleEntitlement[];
}): SubscriptionLifecycleTargets {
  const entitlementIds = new Set<string>();
  const menuSiteIds = new Set<string>();

  for (const entitlement of entitlements) {
    if (entitlement.subscription_id !== subscriptionId) continue;
    if (entitlement.id) entitlementIds.add(entitlement.id);
    if (entitlement.menu_site_id) menuSiteIds.add(entitlement.menu_site_id);
  }

  if (representativeMenuSiteId) {
    menuSiteIds.add(representativeMenuSiteId);
  }

  return {
    entitlementIds: Array.from(entitlementIds),
    menuSiteIds: Array.from(menuSiteIds),
    isLegacyMultiSite: menuSiteIds.size > 1,
  };
}
