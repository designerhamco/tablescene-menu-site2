export const templateSubscriptionPricing = {
  singlePage: {
    regularMonthly: 5_900,
    earlyBirdMonthly: 4_900,
  },
  multiPage: {
    regularMonthly: 8_900,
    earlyBirdMonthly: 6_900,
  },
  display: {
    regularMonthly: 12_900,
    earlyBirdMonthly: 10_900,
  },
} as const;

const earlyBirdMonthlyPriceByProductKey: Readonly<Record<string, number>> = {
  business_basic_single_monthly: templateSubscriptionPricing.singlePage.earlyBirdMonthly,
  business_basic_multi_monthly: templateSubscriptionPricing.multiPage.earlyBirdMonthly,
  business_display_monthly: templateSubscriptionPricing.display.earlyBirdMonthly,
};

export function getEarlyBirdMonthlyPrice(productKey: string | null | undefined) {
  if (!productKey) return null;
  return earlyBirdMonthlyPriceByProductKey[productKey] ?? null;
}
