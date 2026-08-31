import { getTenPercentDiscountedAnnualPrice } from "@/lib/annual-pricing";

export const displayPricing = {
  regularMonthly: 19_900,
  monthly: 14_900,
  regularYearly: 238_800,
  yearly: getTenPercentDiscountedAnnualPrice(14_900),
} as const;

export const legacyDisplayPricing = {
  monthly: 19_800,
  yearly: 190_000,
} as const;

export function getDisplayMonthlyRefundBasis(paidAnnualAmount: number) {
  return paidAnnualAmount === legacyDisplayPricing.yearly
    ? legacyDisplayPricing.monthly
    : displayPricing.monthly;
}
