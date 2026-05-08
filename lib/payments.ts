import { isValidTemplateKey, type TemplateCategoryKey, type TemplateKey } from "@/lib/templates";
import type { SocialLinkInput } from "@/lib/social-links";

export type PlanKey = "basic" | "pro" | "large_screen" | "premium_dining_tablet";
export type BuyerType = "individual" | "business";

export const menuCreationProduct = {
  key: "basic",
  name: "테이블씬 베이직 웹 메뉴판 생성권",
  description: "템플릿 디자인과 데이터 편집 기능을 제공하는 베이직 웹 메뉴판 1개를 생성합니다.",
  amount: 59000,
  currency: "KRW",
} as const;

export type MenuCreationProduct = typeof menuCreationProduct;

export type MenuOrderPayload = {
  plan_key?: PlanKey;
  template_category: TemplateCategoryKey;
  template_key: TemplateKey;
  menuName: string;
  desiredSlug: string;
  restaurantName: string;
  restaurantCategory: string;
  restaurantAddress: string;
  restaurantPhone: string;
  openingHours?: string | null;
  mapUrl?: string | null;
  introTitle?: string | null;
  introDescription?: string | null;
  brandDescription?: string | null;
  menuCoverTitle?: string | null;
  menuCoverDescription?: string | null;
  aboutDescription?: string | null;
  instagramUrl?: string | null;
  socialLinks?: SocialLinkInput[];
  notes: string | null;
  buyerType?: BuyerType;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  businessName: string | null;
  representativeName?: string | null;
  businessNumber: string | null;
  businessPhone?: string | null;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  contentPolicyAccepted?: boolean;
  amount: number;
};

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
  return planKey === "basic";
}

export function requiresBusinessInfo(planKey: PlanKey) {
  if (planKey === "basic") return false;
  if (planKey === "large_screen") return false;
  return true;
}

export function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}
