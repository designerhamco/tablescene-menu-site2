import type { MenuDesignAccess, MenuService } from "./menu-design-policy";

/** Approved 2026-10-19. New purchases use this pricebook.
 * New offers read this pricebook; saved contract amounts and receipts stay immutable.
 */
export const menuPlanPricebook = {
  version: "2026-10-19",
  currency: "KRW",
  vatIncluded: true,
  basic: { regular: 5900, earlyBird: 4900 },
  dining: { regular: 8900, earlyBird: 6900 },
  designMonthly: 1900,
} as const;

type Pricebook = {
  basic: { regular: number; earlyBird: number };
  dining: { regular: number; earlyBird: number };
  designMonthly: number;
};
export function getMenuPlanMonthlyPrice(service: MenuService, access: MenuDesignAccess, offer: "regular" | "earlyBird", prices: Pricebook = menuPlanPricebook) {
  return prices[service][offer] + (access === "all" ? prices.designMonthly : 0);
}
