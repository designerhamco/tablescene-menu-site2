export type BillingServiceType = "basic" | "display";
export type SubscriptionPlanType = "business_basic" | "business_display";
export type SubscriptionBillingCycle = "monthly" | "yearly";
export type SubscriptionProductKey =
  | "business_basic_monthly"
  | "business_basic_yearly"
  | "business_display_monthly"
  | "business_display_yearly";

export const SUBSCRIPTION_PRODUCTS = {
  business_basic_monthly: {
    productKey: "business_basic_monthly",
    name: "메뉴링크 베이직 월결제",
    label: "메뉴링크 베이직 월결제",
    serviceType: "basic",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "monthly",
    amount: 9900,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: true,
  },
  business_basic_yearly: {
    productKey: "business_basic_yearly",
    name: "메뉴링크 베이직 연결제",
    label: "메뉴링크 베이직 연결제",
    serviceType: "basic",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "yearly",
    amount: 95000,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: true,
  },
  business_display_monthly: {
    productKey: "business_display_monthly",
    name: "메뉴링크 디스플레이 월결제",
    label: "메뉴링크 디스플레이 월결제",
    serviceType: "display",
    planType: "business_display",
    paymentType: "subscription",
    billingCycle: "monthly",
    amount: 19800,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: false,
  },
  business_display_yearly: {
    productKey: "business_display_yearly",
    name: "메뉴링크 디스플레이 연결제",
    label: "메뉴링크 디스플레이 연결제",
    serviceType: "display",
    planType: "business_display",
    paymentType: "subscription",
    billingCycle: "yearly",
    amount: 190000,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: false,
  },
} as const;

export type SubscriptionProduct = (typeof SUBSCRIPTION_PRODUCTS)[SubscriptionProductKey];

export function getSubscriptionProduct(productKey: string | null | undefined) {
  if (!productKey || !(productKey in SUBSCRIPTION_PRODUCTS)) {
    return null;
  }

  return SUBSCRIPTION_PRODUCTS[productKey as SubscriptionProductKey];
}
