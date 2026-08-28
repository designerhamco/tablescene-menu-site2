import { displayPricing } from "@/lib/display-pricing";

export type BillingServiceType = "basic" | "display";
export type SubscriptionPlanType = "business_basic" | "business_display";
export type SubscriptionBillingCycle = "monthly" | "yearly";
export type SubscriptionProductKey =
  | "business_basic_monthly"
  | "business_basic_yearly"
  | "business_basic_single_monthly"
  | "business_basic_single_yearly"
  | "business_basic_multi_monthly"
  | "business_basic_multi_yearly"
  | "business_display_monthly"
  | "business_display_yearly";

export const SUBSCRIPTION_PRODUCTS = {
  business_basic_single_monthly: {
    productKey: "business_basic_single_monthly",
    name: "아티메뉴 다이닝 단일페이지 월결제",
    label: "단일페이지 월결제",
    serviceType: "basic",
    templateTier: "single",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "monthly",
    amount: 5900,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: true,
  },
  business_basic_single_yearly: {
    productKey: "business_basic_single_yearly",
    name: "아티메뉴 다이닝 단일페이지 연결제",
    label: "단일페이지 연결제",
    serviceType: "basic",
    templateTier: "single",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "yearly",
    amount: 63720,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: true,
  },
  business_basic_multi_monthly: {
    productKey: "business_basic_multi_monthly",
    name: "아티메뉴 다이닝 멀티페이지 월결제",
    label: "멀티페이지 월결제",
    serviceType: "basic",
    templateTier: "multi",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "monthly",
    amount: 9900,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: true,
  },
  business_basic_multi_yearly: {
    productKey: "business_basic_multi_yearly",
    name: "아티메뉴 다이닝 멀티페이지 연결제",
    label: "멀티페이지 연결제",
    serviceType: "basic",
    templateTier: "multi",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "yearly",
    amount: 106920,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: true,
  },
  business_basic_monthly: {
    productKey: "business_basic_monthly",
    name: "아티메뉴 다이닝 월결제",
    label: "아티메뉴 다이닝 월결제",
    serviceType: "basic",
    templateTier: "legacy",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "monthly",
    amount: 9900,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: false,
    allowConvertFromPersonalTrial: false,
  },
  business_basic_yearly: {
    productKey: "business_basic_yearly",
    name: "아티메뉴 다이닝 연결제",
    label: "아티메뉴 다이닝 연결제",
    serviceType: "basic",
    templateTier: "legacy",
    planType: "business_basic",
    paymentType: "subscription",
    billingCycle: "yearly",
    amount: 95000,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: false,
    allowConvertFromPersonalTrial: false,
  },
  business_display_monthly: {
    productKey: "business_display_monthly",
    name: "아티메뉴 디스플레이 월결제",
    label: "아티메뉴 디스플레이 월결제",
    serviceType: "display",
    templateTier: "display",
    planType: "business_display",
    paymentType: "subscription",
    billingCycle: "monthly",
    amount: displayPricing.monthly,
    currency: "KRW",
    requiresBusinessVerification: true,
    allowNewMenuSiteCreation: true,
    allowConvertFromPersonalTrial: false,
  },
  business_display_yearly: {
    productKey: "business_display_yearly",
    name: "아티메뉴 디스플레이 연결제",
    label: "아티메뉴 디스플레이 연결제",
    serviceType: "display",
    templateTier: "display",
    planType: "business_display",
    paymentType: "subscription",
    billingCycle: "yearly",
    amount: displayPricing.yearly,
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
