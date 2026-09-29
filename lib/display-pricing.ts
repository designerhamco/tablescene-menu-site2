import { getTenPercentDiscountedAnnualPrice } from "@/lib/annual-pricing";

export const displayPricing = {
  regularMonthly: 12_900,
  monthly: 12_900,
  earlyBirdMonthly: 10_900,
  regularYearly: 238_800,
  // 연결제는 신규 판매하지 않지만 기존 결제·환불 기록 호환을 위해 유지합니다.
  yearly: getTenPercentDiscountedAnnualPrice(14_900),
} as const;

export const legacyDisplayPricing = {
  monthly: 19_800,
  yearly: 190_000,
} as const;

export const previousDisplayPricing = {
  monthly: 14_900,
  yearly: getTenPercentDiscountedAnnualPrice(14_900),
} as const;

export function getDisplayMonthlyRefundBasis(paidAnnualAmount: number) {
  return paidAnnualAmount === legacyDisplayPricing.yearly
    ? legacyDisplayPricing.monthly
    : paidAnnualAmount === previousDisplayPricing.yearly
      ? previousDisplayPricing.monthly
      : displayPricing.monthly;
}
