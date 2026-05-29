import { isValidTemplateKey, type TemplateCategoryKey, type TemplateKey } from "@/lib/templates";
import type { SocialLinkInput } from "@/lib/social-links";

export type PlanKey = "basic" | "pro" | "large_screen" | "qr_order" | "premium_dining_tablet";
export type BuyerType = "individual" | "business";
export type PlanType = "personal_trial" | "business_basic" | "business_display";
export type PaymentType = "one_time" | "subscription";
export type BillingCycle = "trial_1_month" | "monthly" | "yearly";
export type BasicProductKey = "personal_trial_basic_1month" | "business_basic_monthly" | "business_basic_yearly";
export type OrderSetupPayload = {
  tableCount?: string | null;
  posUsage?: string | null;
  paymentPreference?: string | null;
  kitchenDashboard?: string | null;
  callFeature?: string | null;
  launchTimeline?: string | null;
  additionalRequests?: string | null;
};

export type ScreenSetupPayload = {
  purpose?: string | null;
  templateCategory?: string | null;
  orientation?: string | null;
  device?: string | null;
};

export const personalTrialBasicProduct = {
  key: "personal_trial_basic_1month",
  product_key: "personal_trial_basic_1month",
  name: "메뉴링크 베이직 개인 1개월 체험",
  label: "메뉴링크 베이직 개인 1개월 체험",
  description: "사업자 인증 없이 메뉴링크 베이직 템플릿 메뉴판을 1개월 동안 체험합니다.",
  plan_type: "personal_trial",
  payment_type: "one_time",
  billing_cycle: "trial_1_month",
  regular_amount: 13200,
  amount: 6600,
  discount_rate: 50,
  duration_months: 1,
  currency: "KRW",
  template_service: "basic",
  requires_business_verification: false,
  is_subscription: false,
} as const;

export const businessBasicMonthlyProduct = {
  key: "business_basic_monthly",
  product_key: "business_basic_monthly",
  name: "메뉴링크 베이직 월결제",
  label: "메뉴링크 베이직 월결제",
  description: "사업자 인증 후 메뉴링크 베이직 메뉴판을 월 자동결제로 이용합니다.",
  plan_type: "business_basic",
  payment_type: "subscription",
  billing_cycle: "monthly",
  regular_amount: 12000,
  amount: 6000,
  discount_rate: 50,
  duration_months: null,
  currency: "KRW",
  template_service: "basic",
  requires_business_verification: true,
  is_subscription: true,
} as const;

export const businessBasicYearlyProduct = {
  key: "business_basic_yearly",
  product_key: "business_basic_yearly",
  name: "메뉴링크 베이직 연결제",
  label: "메뉴링크 베이직 연결제",
  description: "사업자 인증 후 메뉴링크 베이직 메뉴판을 연 자동결제로 이용합니다.",
  plan_type: "business_basic",
  payment_type: "subscription",
  billing_cycle: "yearly",
  regular_amount: 120000,
  amount: 60000,
  discount_rate: 50,
  duration_months: null,
  currency: "KRW",
  template_service: "basic",
  requires_business_verification: true,
  is_subscription: true,
} as const;

export const basicPaymentProducts = [
  personalTrialBasicProduct,
  businessBasicMonthlyProduct,
  businessBasicYearlyProduct,
] as const;

export type BasicPaymentProduct = (typeof basicPaymentProducts)[number];

export const menuCreationProduct = personalTrialBasicProduct;
export type MenuCreationProduct = typeof menuCreationProduct;

export type MenuOrderPayload = {
  product_key?: BasicProductKey;
  plan_type?: PlanType;
  payment_type?: PaymentType;
  billing_cycle?: BillingCycle;
  plan_key?: PlanKey;
  template_category: TemplateCategoryKey;
  template_key: TemplateKey;
  menuName: string;
  desiredSlug: string;
  restaurantName: string;
  restaurantCategory: string;
  restaurantType?: string | null;
  restaurantAddress: string;
  restaurantPhone: string;
  openingHours?: string | null;
  mapUrl?: string | null;
  introTitle?: string | null;
  introDescription?: string | null;
  brandDescription?: string | null;
  menuCoverTitle?: string | null;
  menuCoverDescription?: string | null;
  menuCoverLabel?: string | null;
  aboutDescription?: string | null;
  instagramUrl?: string | null;
  socialLinks?: SocialLinkInput[];
  orderSetup?: OrderSetupPayload | null;
  screenSetup?: ScreenSetupPayload | null;
  notes: string | null;
  buyerType?: BuyerType;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  businessName: string | null;
  businessProfileId?: string | null;
  representativeName?: string | null;
  businessNumber: string | null;
  businessOpeningDate?: string | null;
  businessPhone?: string | null;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  contentPolicyAccepted?: boolean;
  marketingAccepted?: boolean;
  consentAgreedAt?: string | null;
  consentContext?: string | null;
  amount: number;
};

export function getBasicPaymentProduct(productKey: string | null | undefined) {
  return basicPaymentProducts.find((product) => product.product_key === productKey) ?? null;
}

export function isTemplateKey(value: string): value is TemplateKey {
  return isValidTemplateKey(value);
}

export function normalizeMenuSlug(slug: string) {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export function isValidMenuSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 40 && !slug.startsWith("-") && !slug.endsWith("-");
}

export function canIndividualPurchasePlan(planKey: PlanKey) {
  return planKey === "basic" || planKey === "qr_order";
}

export function requiresBusinessInfo(planKey: PlanKey) {
  if (planKey === "basic") return false;
  if (planKey === "large_screen") return false;
  if (planKey === "qr_order") return false;
  return true;
}

export function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}
