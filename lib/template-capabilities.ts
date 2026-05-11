export type TemplateCapabilities = {
  menuItemImages: boolean;
  itemBadges: boolean;
  itemTraits: boolean;
  priceOptions: boolean;
  featuredItemHero: boolean;
  chefs: boolean;
  events: boolean;
  socialLinks: boolean;
};

export const DEFAULT_TEMPLATE_CAPABILITIES: TemplateCapabilities = {
  menuItemImages: true,
  itemBadges: true,
  itemTraits: true,
  priceOptions: true,
  featuredItemHero: true,
  chefs: true,
  events: true,
  socialLinks: true,
};

export const TEMPLATE_CAPABILITIES: Record<string, TemplateCapabilities> = {
  cafe_design_a: DEFAULT_TEMPLATE_CAPABILITIES,
  cafe_design_b: {
    menuItemImages: false,
    itemBadges: true,
    itemTraits: false,
    priceOptions: true,
    featuredItemHero: false,
    chefs: false,
    events: true,
    socialLinks: true,
  },
  cafe_design_c: DEFAULT_TEMPLATE_CAPABILITIES,
  fine_dining_design_a: DEFAULT_TEMPLATE_CAPABILITIES,
  fine_dining_design_b: DEFAULT_TEMPLATE_CAPABILITIES,
  casual_dining_design_a: DEFAULT_TEMPLATE_CAPABILITIES,
  casual_dining_design_b: DEFAULT_TEMPLATE_CAPABILITIES,
  fast_food_design_a: DEFAULT_TEMPLATE_CAPABILITIES,
  fast_food_design_b: DEFAULT_TEMPLATE_CAPABILITIES,
  brunch_design_a: DEFAULT_TEMPLATE_CAPABILITIES,
  brunch_design_b: DEFAULT_TEMPLATE_CAPABILITIES,
};

export function getTemplateCapabilities(templateKey: string | null | undefined): TemplateCapabilities {
  if (!templateKey) {
    return DEFAULT_TEMPLATE_CAPABILITIES;
  }

  return TEMPLATE_CAPABILITIES[templateKey] ?? DEFAULT_TEMPLATE_CAPABILITIES;
}
