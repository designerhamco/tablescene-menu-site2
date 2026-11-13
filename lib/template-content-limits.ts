import { MENU_FIELD_LIMITS } from "@/lib/menu-limits";
import { hasFixedHeaderAlignment } from "@/lib/menu-design-surfaces";

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
  cafe_van_gogh_a: {
    restaurantName: 16,
    brandDescription: 80,
    footerNotice: 36,
  },
};

export function getTemplateContentLimits(templateKey: string | null | undefined, settings?: unknown): TemplateContentLimits {
  const normalizedTemplateKey = templateKey?.trim();
  if (!normalizedTemplateKey) return DEFAULT_TEMPLATE_CONTENT_LIMITS;

  const limits = TEMPLATE_CONTENT_LIMIT_OVERRIDES[normalizedTemplateKey] ?? DEFAULT_TEMPLATE_CONTENT_LIMITS;
  if (!hasFixedHeaderAlignment(normalizedTemplateKey, settings)) return limits;
  return { ...limits, brandDescription: Math.min(limits.brandDescription, 80), footerNotice: Math.min(limits.footerNotice, 40) };
}
