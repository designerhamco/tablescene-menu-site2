import { MAX_MENU_WIDGETS_PER_PAGE, MENU_WIDGET_TYPES, type MenuWidgetType } from "@/lib/menu-widgets";

export type TemplateMenuCoverMode = "none" | "section" | "page";

export type TemplateMenuCoverCapabilities = {
  coverMode: TemplateMenuCoverMode;
  usesStoreName: boolean;
  usesStoreDescription: boolean;
  usesCoverLabel: boolean;
  usesCoverTitle: boolean;
  usesCoverDescription: boolean;
  usesCoverImage: boolean;
  usesFeaturedItem: boolean;
};

export type TemplateMenuWidgetCapabilities = {
  enabled: boolean;
  maxPerPage: number;
  supportedTypes: readonly MenuWidgetType[];
};

export type TemplateCapabilities = {
  typographyFontSizeControl?: "hidden" | "simple";
  logoImage: boolean;
  brandLogo: boolean;
  brandLogoReplacesName: boolean;
  footerStoreInfo: boolean;
  footerSocialLinks: boolean;
  menuItemImages: boolean;
  pageDescription: boolean;
  categoryDescription: boolean;
  itemDescription: boolean;
  originInfo: boolean;
  itemBadges: boolean;
  itemBadgeColorControl?: boolean;
  itemTraits: boolean;
  priceOptions: boolean;
  categoryPriceOptionColumns: boolean;
  itemPortionLabel: boolean;
  splitImageText: boolean;
  promotionText: boolean;
  maxPriceOptionsPerItem: number;
  featuredItemHero: boolean;
  featuredItemCarousel?: boolean;
  featuredItemMaxSlides?: number;
  chefs: boolean;
  events: boolean;
  socialLinks: boolean;
  menuCover: TemplateMenuCoverCapabilities;
  supportsBasicPriceColumns?: boolean;
  maxCategoryPriceColumns?: number;
  supportsPriceDisplayMode?: boolean;
  supportsPriceNote?: boolean;
  supportsPriceNoteWithPriceColumns?: boolean;
  defaultPriceDisplayMode?: "compact_decimal" | "krw";
  menuWidgets: TemplateMenuWidgetCapabilities;
};

export type BasicPricingCapabilities = {
  supportsBasicPriceColumns: boolean;
  maxCategoryPriceColumns: number;
  supportsPriceDisplayMode: boolean;
  supportsPriceNote: boolean;
  supportsPriceNoteWithPriceColumns: boolean;
  defaultPriceDisplayMode: "compact_decimal" | "krw";
};

export const DEFAULT_TEMPLATE_MENU_COVER_CAPABILITIES: TemplateMenuCoverCapabilities = {
  coverMode: "section",
  usesStoreName: false,
  usesStoreDescription: false,
  usesCoverLabel: true,
  usesCoverTitle: true,
  usesCoverDescription: true,
  usesCoverImage: true,
  usesFeaturedItem: true,
};

export const DEFAULT_TEMPLATE_MENU_WIDGET_CAPABILITIES: TemplateMenuWidgetCapabilities = {
  enabled: false,
  maxPerPage: 0,
  supportedTypes: [],
};

export const DEFAULT_TEMPLATE_CAPABILITIES: TemplateCapabilities = {
  typographyFontSizeControl: "hidden",
  logoImage: true,
  brandLogo: false,
  brandLogoReplacesName: false,
  footerStoreInfo: false,
  footerSocialLinks: false,
  menuItemImages: true,
  pageDescription: true,
  categoryDescription: true,
  itemDescription: true,
  originInfo: true,
  itemBadges: true,
  itemBadgeColorControl: true,
  itemTraits: true,
  priceOptions: true,
  categoryPriceOptionColumns: false,
  itemPortionLabel: true,
  splitImageText: true,
  promotionText: true,
  maxPriceOptionsPerItem: 5,
  featuredItemHero: true,
  featuredItemCarousel: false,
  featuredItemMaxSlides: 1,
  chefs: true,
  events: true,
  socialLinks: true,
  menuCover: DEFAULT_TEMPLATE_MENU_COVER_CAPABILITIES,
  supportsBasicPriceColumns: false,
  maxCategoryPriceColumns: 0,
  supportsPriceDisplayMode: false,
  supportsPriceNote: false,
  supportsPriceNoteWithPriceColumns: false,
  defaultPriceDisplayMode: "krw",
  menuWidgets: DEFAULT_TEMPLATE_MENU_WIDGET_CAPABILITIES,
};

export const TEMPLATE_CAPABILITIES: Record<string, TemplateCapabilities> = {
  display_menu_a: {
    ...DEFAULT_TEMPLATE_CAPABILITIES,
    typographyFontSizeControl: "simple",
    logoImage: false,
    brandLogo: true,
    brandLogoReplacesName: true,
    footerStoreInfo: false,
    footerSocialLinks: false,
    menuItemImages: true,
    pageDescription: false,
    categoryDescription: false,
    itemDescription: false,
    originInfo: false,
    itemBadges: true,
    itemTraits: false,
    priceOptions: true,
    categoryPriceOptionColumns: true,
    itemPortionLabel: false,
    splitImageText: false,
    promotionText: false,
    maxPriceOptionsPerItem: 3,
    featuredItemHero: false,
    chefs: false,
    events: false,
    socialLinks: false,
    menuCover: {
      coverMode: "none",
      usesStoreName: false,
      usesStoreDescription: false,
      usesCoverLabel: false,
      usesCoverTitle: false,
      usesCoverDescription: false,
      usesCoverImage: false,
      usesFeaturedItem: false,
    },
  },
  cafe_design_a: {
    ...DEFAULT_TEMPLATE_CAPABILITIES,
    logoImage: false,
    brandLogo: true,
    brandLogoReplacesName: true,
    footerStoreInfo: true,
    footerSocialLinks: false,
    menuItemImages: true,
    pageDescription: false,
    categoryDescription: true,
    itemDescription: true,
    originInfo: false,
    itemTraits: false,
    maxPriceOptionsPerItem: 3,
    featuredItemCarousel: true,
    featuredItemMaxSlides: 5,
    supportsBasicPriceColumns: true,
    maxCategoryPriceColumns: 3,
    supportsPriceDisplayMode: true,
    supportsPriceNote: true,
    supportsPriceNoteWithPriceColumns: false,
    defaultPriceDisplayMode: "compact_decimal",
    menuWidgets: {
      enabled: true,
      maxPerPage: MAX_MENU_WIDGETS_PER_PAGE,
      supportedTypes: MENU_WIDGET_TYPES,
    },
    chefs: false,
    events: false,
    socialLinks: false,
    menuCover: {
      coverMode: "section",
      usesStoreName: true,
      usesStoreDescription: true,
      usesCoverLabel: false,
      usesCoverTitle: false,
      usesCoverDescription: false,
      usesCoverImage: true,
      usesFeaturedItem: true,
    },
  },
  cafe_noir_a: {
    ...DEFAULT_TEMPLATE_CAPABILITIES,
    logoImage: false,
    brandLogo: true,
    brandLogoReplacesName: true,
    footerStoreInfo: true,
    footerSocialLinks: false,
    menuItemImages: false,
    pageDescription: false,
    categoryDescription: false,
    itemDescription: true,
    originInfo: false,
    itemTraits: false,
    itemBadgeColorControl: false,
    priceOptions: false,
    itemPortionLabel: false,
    maxPriceOptionsPerItem: 3,
    featuredItemHero: false,
    chefs: false,
    events: false,
    socialLinks: false,
    menuCover: {
      coverMode: "none",
      usesStoreName: false,
      usesStoreDescription: false,
      usesCoverLabel: false,
      usesCoverTitle: false,
      usesCoverDescription: false,
      usesCoverImage: false,
      usesFeaturedItem: false,
    },
  },
  cafe_design_b: {
    logoImage: true,
    brandLogo: false,
    brandLogoReplacesName: false,
    footerStoreInfo: false,
    footerSocialLinks: false,
    menuItemImages: false,
    pageDescription: true,
    categoryDescription: true,
    itemDescription: true,
    originInfo: true,
    itemBadges: true,
    itemTraits: false,
    priceOptions: true,
    categoryPriceOptionColumns: false,
    itemPortionLabel: true,
    splitImageText: true,
    promotionText: true,
    maxPriceOptionsPerItem: 5,
    featuredItemHero: false,
    chefs: false,
    events: true,
    socialLinks: true,
    menuWidgets: DEFAULT_TEMPLATE_MENU_WIDGET_CAPABILITIES,
    menuCover: {
      ...DEFAULT_TEMPLATE_MENU_COVER_CAPABILITIES,
      coverMode: "section",
      usesCoverImage: true,
      usesFeaturedItem: false,
    },
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

const TEMPLATE_CAPABILITY_ALIASES: Record<string, keyof typeof TEMPLATE_CAPABILITIES> = {
  cafea: "cafe_design_a",
  cafe_a: "cafe_design_a",
  cafe_design_a: "cafe_design_a",
  cafe_noir_a: "cafe_noir_a",
};

function normalizeTemplateCapabilityKey(templateKey: string | null | undefined) {
  return templateKey?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

export function getTemplateCapabilities(templateKey: string | null | undefined): TemplateCapabilities {
  if (!templateKey) {
    return DEFAULT_TEMPLATE_CAPABILITIES;
  }

  const normalizedKey = normalizeTemplateCapabilityKey(templateKey);
  const capabilityKey = TEMPLATE_CAPABILITY_ALIASES[normalizedKey] ?? normalizedKey;

  return TEMPLATE_CAPABILITIES[capabilityKey] ?? DEFAULT_TEMPLATE_CAPABILITIES;
}

export function getBasicPricingCapabilities(templateKey: string | null | undefined): BasicPricingCapabilities {
  const capabilities = getTemplateCapabilities(templateKey);
  const supportsBasicPriceColumns = Boolean(capabilities.supportsBasicPriceColumns);

  return {
    supportsBasicPriceColumns,
    maxCategoryPriceColumns: supportsBasicPriceColumns
      ? Math.max(0, capabilities.maxCategoryPriceColumns ?? 3)
      : 0,
    supportsPriceDisplayMode: Boolean(capabilities.supportsPriceDisplayMode),
    supportsPriceNote: Boolean(capabilities.supportsPriceNote),
    supportsPriceNoteWithPriceColumns: Boolean(capabilities.supportsPriceNoteWithPriceColumns),
    defaultPriceDisplayMode: capabilities.defaultPriceDisplayMode === "compact_decimal" ? "compact_decimal" : "krw",
  };
}

export function getCoverTabLabel(coverMode: TemplateMenuCoverMode): string | null {
  if (coverMode === "none") return null;
  return "커버 이미지";
}

export function getCoverToggleLabel(coverMode: TemplateMenuCoverMode): string {
  void coverMode;
  return "커버 이미지 사용";
}

export function getCoverDescription(coverMode: TemplateMenuCoverMode): string {
  if (coverMode === "section") {
    return "메뉴판에 표시되는 대표 이미지와 추천 메뉴를 설정합니다.";
  }

  if (coverMode === "page") {
    return "메뉴판 앞에 표시되는 커버 이미지와 소개 내용을 설정합니다. 사용하지 않으면 손님은 바로 메뉴 페이지부터 보게 됩니다.";
  }

  return "";
}
