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

export type TemplateCapabilities = {
  logoImage: boolean;
  menuItemImages: boolean;
  pageDescription: boolean;
  categoryDescription: boolean;
  itemDescription: boolean;
  originInfo: boolean;
  itemBadges: boolean;
  itemTraits: boolean;
  priceOptions: boolean;
  categoryPriceOptionColumns: boolean;
  itemPortionLabel: boolean;
  splitImageText: boolean;
  promotionText: boolean;
  maxPriceOptionsPerItem: number;
  featuredItemHero: boolean;
  chefs: boolean;
  events: boolean;
  socialLinks: boolean;
  menuCover: TemplateMenuCoverCapabilities;
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

export const DEFAULT_TEMPLATE_CAPABILITIES: TemplateCapabilities = {
  logoImage: true,
  menuItemImages: true,
  pageDescription: true,
  categoryDescription: true,
  itemDescription: true,
  originInfo: true,
  itemBadges: true,
  itemTraits: true,
  priceOptions: true,
  categoryPriceOptionColumns: false,
  itemPortionLabel: true,
  splitImageText: true,
  promotionText: true,
  maxPriceOptionsPerItem: 5,
  featuredItemHero: true,
  chefs: true,
  events: true,
  socialLinks: true,
  menuCover: DEFAULT_TEMPLATE_MENU_COVER_CAPABILITIES,
};

export const TEMPLATE_CAPABILITIES: Record<string, TemplateCapabilities> = {
  display_menu_a: {
    ...DEFAULT_TEMPLATE_CAPABILITIES,
    logoImage: false,
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
    menuItemImages: false,
    pageDescription: false,
    categoryDescription: true,
    itemDescription: true,
    originInfo: false,
    itemTraits: false,
    maxPriceOptionsPerItem: 3,
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
  cafe_design_b: {
    logoImage: true,
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
