import { templateKeys, type TemplateKey } from "@/lib/templates";

export const menuCreationProduct = {
  key: "menu_creation_credit",
  name: "테이블씬 웹 메뉴판 생성권",
  description: "선택한 템플릿과 신청 정보를 바탕으로 웹 메뉴판 1개를 생성합니다.",
  amount: 59000,
  currency: "KRW",
} as const;

export type MenuCreationProduct = typeof menuCreationProduct;

export type MenuOrderPayload = {
  template_key: TemplateKey;
  menuName: string;
  desiredSlug: string;
  restaurantName: string;
  restaurantCategory: string;
  restaurantAddress: string;
  restaurantPhone: string;
  instagramUrl: string | null;
  notes: string | null;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  businessName: string | null;
  businessNumber: string | null;
  amount: number;
};

export function isTemplateKey(value: string): value is TemplateKey {
  return templateKeys.includes(value as TemplateKey);
}

export function normalizeMenuSlug(slug: string) {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidMenuSlug(slug: string) {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;
}

export function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}
