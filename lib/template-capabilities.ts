export type TemplateMenuCoverMode = "none" | "section" | "page";

export type TemplateMenuCoverCapabilities = {
  coverMode: TemplateMenuCoverMode;
  usesStoreName: boolean;
  usesStoreDescription: boolean;
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
  featuredItemHero: true,
  chefs: true,
  events: true,
  socialLinks: true,
  menuCover: DEFAULT_TEMPLATE_MENU_COVER_CAPABILITIES,
};

export const TEMPLATE_CAPABILITIES: Record<string, TemplateCapabilities> = {
  cafe_design_a: {
    ...DEFAULT_TEMPLATE_CAPABILITIES,
    logoImage: false,
    menuItemImages: false,
    pageDescription: false,
    categoryDescription: true,
    itemDescription: true,
    originInfo: false,
    itemTraits: false,
    chefs: false,
    events: false,
    socialLinks: false,
    menuCover: {
      coverMode: "section",
      usesStoreName: true,
      usesStoreDescription: true,
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
  if (coverMode === "section") return "대표 영역";
  return "메뉴 커버";
}

export function getCoverToggleLabel(coverMode: TemplateMenuCoverMode): string {
  return coverMode === "section" ? "대표 영역 사용" : "메뉴 커버 사용";
}

export function getCoverDescription(coverMode: TemplateMenuCoverMode): string {
  if (coverMode === "section") {
    return "이 영역은 별도 커버 페이지가 아니라, 메뉴 화면 안에서 대표 이미지와 추천 항목을 강조해서 보여주는 영역입니다. 사용하지 않으면 해당 영역이 숨겨지고 메뉴 목록이 더 먼저 표시됩니다.";
  }

  if (coverMode === "page") {
    return "메뉴 커버는 메뉴 페이지 앞에 표시되는 첫 화면입니다. 사용하지 않으면 손님은 바로 메뉴 페이지부터 보게 됩니다.";
  }

  return "";
}
