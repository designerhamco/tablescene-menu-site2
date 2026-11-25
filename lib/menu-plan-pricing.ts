import type { MenuDesignAccess, MenuService } from "./menu-design-policy";

/** One price per service, regardless of the selected template. */
export const menuPlanPricebook = {
  version: "2026-11-25",
  currency: "KRW",
  vatIncluded: true,
  basic: { regular: 5900, earlyBird: 4900 },
  dining: { regular: 8900, earlyBird: 6900 },
} as const;

/** Historical quotes/consents must retain the prices originally presented. */
export const legacyMenuPlanPricebook = {
  version: "2026-10-19", currency: "KRW", vatIncluded: true,
  basic: { regular: 5900, earlyBird: 4900 }, dining: { regular: 8900, earlyBird: 6900 }, designMonthly: 1900,
} as const;

type Pricebook = {
  basic: { regular: number; earlyBird: number };
  dining: { regular: number; earlyBird: number };
};
export function getMenuPlanMonthlyPrice(service: MenuService, _access: MenuDesignAccess, offer: "regular" | "earlyBird", prices: Pricebook = menuPlanPricebook) {
  return prices[service][offer];
}

export function getLegacyMenuPlanMonthlyPrice(service: MenuService, access: MenuDesignAccess, offer: "regular" | "earlyBird") {
  return legacyMenuPlanPricebook[service][offer] + (access === "all" ? legacyMenuPlanPricebook.designMonthly : 0);
}

/** Remove only the recognized old design surcharge at the next renewal.
 * Old annual/custom contracts, historical receipts and paid recovery stay intact.
 * This also keeps an existing early-bird offer after the promotion ends.
 */
export function getMenuPlanRenewalAmount(subscription: {
  product_key: string; billing_cycle: string; amount: number | null;
  menu_design_access?: string | null; menu_plan_version?: string | null;
}, fallback: number) {
  const amount = typeof subscription.amount === "number" && subscription.amount >= 0 ? subscription.amount : fallback;
  const service = subscription.product_key === "business_basic_single_monthly" ? "basic"
    : subscription.product_key === "business_basic_multi_monthly" ? "dining" : undefined;
  if (service && subscription.billing_cycle === "monthly" && subscription.menu_plan_version === "2026-10-21" && subscription.menu_design_access === "all") {
    for (const offer of ["earlyBird", "regular"] as const) {
      if (amount === getLegacyMenuPlanMonthlyPrice(service, "all", offer)) return legacyMenuPlanPricebook[service][offer];
    }
  }
  return amount;
}
