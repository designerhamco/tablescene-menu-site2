import assert from "node:assert/strict";
import test from "node:test";

import { getSubscriptionLifecycleTargets } from "./subscription-lifecycle-targets";

test("selects the single entitlement and menu for a new subscription", () => {
  const targets = getSubscriptionLifecycleTargets({
    subscriptionId: "subscription-a",
    representativeMenuSiteId: "menu-a",
    entitlements: [
      { id: "entitlement-a", menu_site_id: "menu-a", subscription_id: "subscription-a" },
    ],
  });

  assert.deepEqual(targets.entitlementIds, ["entitlement-a"]);
  assert.deepEqual(targets.menuSiteIds, ["menu-a"]);
  assert.equal(targets.isLegacyMultiSite, false);
});

test("keeps every menu linked to a legacy multi-site subscription", () => {
  const targets = getSubscriptionLifecycleTargets({
    subscriptionId: "subscription-a",
    representativeMenuSiteId: "menu-a",
    entitlements: [
      { id: "entitlement-a", menu_site_id: "menu-a", subscription_id: "subscription-a" },
      { id: "entitlement-b", menu_site_id: "menu-b", subscription_id: "subscription-a" },
      { id: "entitlement-c", menu_site_id: "menu-c", subscription_id: "subscription-a" },
    ],
  });

  assert.deepEqual(targets.entitlementIds, ["entitlement-a", "entitlement-b", "entitlement-c"]);
  assert.deepEqual(targets.menuSiteIds, ["menu-a", "menu-b", "menu-c"]);
  assert.equal(targets.isLegacyMultiSite, true);
});

test("ignores other subscriptions and removes duplicate targets", () => {
  const targets = getSubscriptionLifecycleTargets({
    subscriptionId: "subscription-a",
    representativeMenuSiteId: "menu-a",
    entitlements: [
      { id: "entitlement-a", menu_site_id: "menu-a", subscription_id: "subscription-a" },
      { id: "entitlement-a", menu_site_id: "menu-a", subscription_id: "subscription-a" },
      { id: "entitlement-b", menu_site_id: "menu-b", subscription_id: "subscription-b" },
      { id: "legacy-unlinked", menu_site_id: "menu-a", subscription_id: null },
    ],
  });

  assert.deepEqual(targets.entitlementIds, ["entitlement-a"]);
  assert.deepEqual(targets.menuSiteIds, ["menu-a"]);
  assert.equal(targets.isLegacyMultiSite, false);
});

test("keeps the representative menu as a narrow compatibility fallback", () => {
  const targets = getSubscriptionLifecycleTargets({
    subscriptionId: "subscription-a",
    representativeMenuSiteId: "menu-a",
    entitlements: [],
  });

  assert.deepEqual(targets.entitlementIds, []);
  assert.deepEqual(targets.menuSiteIds, ["menu-a"]);
  assert.equal(targets.isLegacyMultiSite, false);
});
