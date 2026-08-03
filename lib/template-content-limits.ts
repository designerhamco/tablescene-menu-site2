import { MENU_FIELD_LIMITS } from "@/lib/menu-limits";

export type TemplateContentLimits = {
  restaurantName: number;
  brandDescription: number;
  footerNotice: number;
};

export const DEFAULT_TEMPLATE_CONTENT_LIMITS: TemplateContentLimits = {
  restaurantName: MENU_FIELD_LIMITS.menuSites.restaurantName,
  brandDescription: MENU_FIELD_LIMITS.menuSites.brandDescription,
  footerNotice: MENU_FIELD_LIMITS.menuSites.footerNotice,
};

const TEMPLATE_CONTENT_LIMIT_OVERRIDES: Record<string, TemplateContentLimits> = {
  cafe_sunday_line_a: {
    restaurantName: 16,
    brandDescription: 80,
    footerNotice: 36,
  },
};

export function getTemplateContentLimits(templateKey: string | null | undefined): TemplateContentLimits {
  const normalizedTemplateKey = templateKey?.trim();
  if (!normalizedTemplateKey) return DEFAULT_TEMPLATE_CONTENT_LIMITS;

  return TEMPLATE_CONTENT_LIMIT_OVERRIDES[normalizedTemplateKey] ?? DEFAULT_TEMPLATE_CONTENT_LIMITS;
}
