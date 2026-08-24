import {
  getTemplateType,
  getTemplateTypeLabel,
  getTemplateTypeShortDescription,
  getSupportedServices,
  isTemplateSupportedForService as isTemplateKeySupportedForService,
  type TemplateServiceType,
  type TemplateType,
} from "@/lib/template-types";

export const TEMPLATE_CATEGORIES = [
  {
    key: "cafe",
    label: "카페",
    templates: [
      { key: "cafe_design_a", label: "오브 커피", design: "design_a" },
      { key: "cafe_mocha_forest_a", label: "모카 포레스트", design: "design_a" },
      { key: "cafe_sunday_line_a", label: "선데이 라인", design: "design_a" },
      { key: "cafe_round_focus_a", label: "라운드 포커스", design: "design_a" },
      { key: "cafe_brew_chapter_a", label: "브루 챕터", design: "design_a" },
      { key: "cafe_noir_a", label: "누아 메뉴", design: "design_a" },
      { key: "cafe_design_b", label: "Cafe Design B", design: "design_b" },
      { key: "cafe_design_c", label: "Cafe Design C", design: "design_c" },
    ],
  },
  {
    key: "display",
    label: "디스플레이",
    templates: [
      { key: "display_menu_a", label: "썸머 블루", design: "design_a" },
    ],
  },
  {
    key: "bakery",
    label: "베이커리",
    templates: [],
  },
  {
    key: "dessert",
    label: "디저트샵",
    templates: [],
  },
  {
    key: "restaurant",
    label: "식당",
    templates: [],
  },
  {
    key: "fine_dining",
    label: "파인다이닝",
    templates: [
      { key: "fine_dining_design_a", label: "Fine Dining Design A", design: "design_a" },
      { key: "fine_dining_design_b", label: "Fine Dining Design B", design: "design_b" },
    ],
  },
  {
    key: "casual_dining",
    label: "캐주얼다이닝",
    templates: [
      { key: "casual_dining_design_a", label: "Casual Dining Design A", design: "design_a" },
      { key: "casual_dining_design_b", label: "Casual Dining Design B", design: "design_b" },
    ],
  },
  {
    key: "fast_food",
    label: "패스트푸드",
    templates: [
      { key: "fast_food_design_a", label: "Fast Food Design A", design: "design_a" },
      { key: "fast_food_design_b", label: "Fast Food Design B", design: "design_b" },
    ],
  },
  {
    key: "brunch",
    label: "브런치",
    templates: [
      { key: "brunch_design_a", label: "Brunch Design A", design: "design_a" },
      { key: "brunch_design_b", label: "Brunch Design B", design: "design_b" },
    ],
  },
  {
    key: "pub_bar",
    label: "주점/바",
    templates: [],
  },
  {
    key: "hair_salon",
    label: "미용실/헤어샵",
    templates: [],
  },
  {
    key: "nail_shop",
    label: "네일샵",
    templates: [],
  },
  {
    key: "beauty_esthetic",
    label: "피부관리/에스테틱",
    templates: [],
  },
  {
    key: "workshop_class",
    label: "공방/클래스",
    templates: [],
  },
  {
    key: "fitness_pt",
    label: "피트니스/PT",
    templates: [],
  },
  {
    key: "pet_shop",
    label: "펫샵/애견미용",
    templates: [],
  },
  {
    key: "clinic",
    label: "병원/클리닉",
    templates: [],
  },
  {
    key: "popup_event",
    label: "팝업/행사",
    templates: [],
  },
  {
    key: "etc",
    label: "기타",
    templates: [],
  },
] as const;

export const LEGACY_TEMPLATE_KEYS = ["design_a", "design_b", "design_c"] as const;

export type TemplateCategoryKey = (typeof TEMPLATE_CATEGORIES)[number]["key"];
export type TemplateCategoryFilterKey = TemplateCategoryKey | "all";
export type LegacyTemplateKey = (typeof LEGACY_TEMPLATE_KEYS)[number];
export type TemplateKey = (typeof TEMPLATE_CATEGORIES)[number]["templates"][number]["key"];
export type AnyTemplateKey = TemplateKey | LegacyTemplateKey;
export type TemplateDesignKey = (typeof TEMPLATE_CATEGORIES)[number]["templates"][number]["design"];
export type TemplateServiceKey = TemplateServiceType;
export type TemplateCatalogStatus = "available" | "coming_soon" | "hidden";
export type { TemplateType };

export const BASIC_TEMPLATE_CATEGORY_GROUPS = [
  { key: "cafe_bakery", label: "카페/베이커리", categoryKeys: ["cafe", "bakery", "dessert"] },
  { key: "food_dining", label: "음식점/다이닝", categoryKeys: ["restaurant", "brunch", "casual_dining", "fine_dining", "fast_food", "pub_bar"] },
  { key: "beauty_wellness", label: "뷰티/웰니스", categoryKeys: ["hair_salon", "nail_shop", "beauty_esthetic", "fitness_pt", "pet_shop"] },
  { key: "class_workshop", label: "클래스/공방", categoryKeys: ["workshop_class", "popup_event", "etc"] },
  { key: "clinic", label: "병원/클리닉", categoryKeys: ["clinic"] },
] as const satisfies readonly {
  key: string;
  label: string;
  categoryKeys: readonly TemplateCategoryKey[];
}[];

export type BasicTemplateCategoryGroupKey = (typeof BASIC_TEMPLATE_CATEGORY_GROUPS)[number]["key"];

export function getTemplateCategoryKeysForBasicGroup(groupKey: BasicTemplateCategoryGroupKey): readonly TemplateCategoryKey[] {
  return BASIC_TEMPLATE_CATEGORY_GROUPS.find((group) => group.key === groupKey)?.categoryKeys ?? BASIC_TEMPLATE_CATEGORY_GROUPS[0].categoryKeys;
}

export function getBasicTemplateCategoryGroupLabel(groupKey: BasicTemplateCategoryGroupKey) {
  return BASIC_TEMPLATE_CATEGORY_GROUPS.find((group) => group.key === groupKey)?.label ?? BASIC_TEMPLATE_CATEGORY_GROUPS[0].label;
}

export function getBasicTemplateCategoryLabel(categoryKey?: string | null) {
  const matchedGroup = BASIC_TEMPLATE_CATEGORY_GROUPS.find((group) =>
    group.categoryKeys.some((key) => key === categoryKey)
  );

  return matchedGroup?.label ?? BASIC_TEMPLATE_CATEGORY_GROUPS[0].label;
}

export const DISPLAY_TEMPLATE_CATEGORY_GROUPS = [
  { key: "display_cafe_bakery", label: "카페/베이커리", categoryKeys: ["display", "cafe", "bakery", "dessert"] },
  { key: "display_food_dining", label: "음식점/다이닝", categoryKeys: ["restaurant", "brunch", "casual_dining", "fine_dining", "pub_bar"] },
  { key: "display_fast_food", label: "패스트푸드/분식", categoryKeys: ["fast_food"] },
  { key: "display_foodcourt", label: "푸드코트/복합매장", categoryKeys: [] },
] as const satisfies readonly {
  key: string;
  label: string;
  categoryKeys: readonly TemplateCategoryKey[];
}[];

export type DisplayTemplateCategoryGroupKey = (typeof DISPLAY_TEMPLATE_CATEGORY_GROUPS)[number]["key"];

export function getTemplateCategoryKeysForDisplayGroup(groupKey: DisplayTemplateCategoryGroupKey): readonly TemplateCategoryKey[] {
  return DISPLAY_TEMPLATE_CATEGORY_GROUPS.find((group) => group.key === groupKey)?.categoryKeys ?? DISPLAY_TEMPLATE_CATEGORY_GROUPS[0].categoryKeys;
}

export function getDisplayTemplateCategoryLabel(categoryKey?: string | null) {
  const matchedGroup = DISPLAY_TEMPLATE_CATEGORY_GROUPS.find((group) =>
    group.categoryKeys.some((key) => key === categoryKey)
  );

  return matchedGroup?.label ?? DISPLAY_TEMPLATE_CATEGORY_GROUPS[0].label;
}

const templateToneByDesign: Record<TemplateDesignKey, "light" | "warm" | "dark"> = {
  design_a: "light",
  design_b: "warm",
  design_c: "dark",
};

const templateBadgeByDesign: Record<TemplateDesignKey, string> = {
  design_a: "추천",
  design_b: "비주얼",
  design_c: "프리미엄",
};

const templateDescriptionByDesign: Record<TemplateDesignKey, string> = {
  design_a: "깔끔하고 범용적인 기본 메뉴판 템플릿입니다. 메뉴 수가 많아도 빠르게 훑어보기 좋습니다.",
  design_b: "대표 이미지와 추천 메뉴를 강조하는 템플릿입니다. 사진 중심 메뉴판에 어울립니다.",
  design_c: "코스, 스토리, 브랜드 분위기를 차분하게 보여주는 프리미엄 다이닝 템플릿입니다.",
};

const templateDescriptionByKey: Partial<Record<string, string>> = {
  cafe_design_a: "차분한 카페 무드에 어울리는 기본 메뉴판 템플릿입니다.\n메뉴가 많아도 깔끔하게 정리해 보여주기 좋습니다.",
  cafe_mocha_forest_a: "갈색·아이보리·초록 패널로 구성한 고급스러운 카페/베이커리 메뉴판입니다.",
  cafe_sunday_line_a: "브랜드와 대표 메뉴를 상단에 두고 전체 폭 메뉴 영역으로 이어지는 카페 메뉴판입니다.",
  cafe_round_focus_a: "브랜드 영역을 중앙 축에 두고 메뉴를 좌우로 나누는 카페 메뉴판입니다.",
  cafe_brew_chapter_a: "메뉴 페이지를 장처럼 넘기며 보는 멀티 페이지 카페 메뉴판입니다.",
  cafe_noir_a: "화이트 배경과 절제된 타이포그래피로 구성한 에디토리얼 카페 메뉴판입니다.\n커피와 디저트 메뉴를 여러 열로 정갈하게 보여줍니다.",
  display_menu_a: "시원하고 선명한 화면 구성이 돋보이는 디스플레이 템플릿입니다.\n카페와 베이커리 매장의 메뉴를 TV·모니터에 보기 좋게 보여줍니다.",
};

const availableTemplateKeys = ["cafe_design_a", "display_menu_a"] as const satisfies readonly string[];
const hiddenTemplateKeys = ["cafe_mocha_forest_a", "cafe_sunday_line_a", "cafe_round_focus_a", "cafe_brew_chapter_a", "cafe_noir_a"] as const satisfies readonly string[];

const featuredHomeTemplateKeys = [
  "cafe_design_a",
  "cafe_design_b",
  "cafe_design_c",
  "casual_dining_design_a",
] as const satisfies readonly string[];

const featuredBasicTemplateKeys = [
  "cafe_design_a",
  "cafe_design_b",
  "cafe_design_c",
  "fine_dining_design_a",
  "casual_dining_design_a",
  "fast_food_design_a",
  "brunch_design_a",
] as const satisfies readonly string[];

const featuredDisplayTemplateKeys = [
  "display_menu_a",
] as const satisfies readonly string[];

function getTemplateCatalogStatus(templateKey: string): TemplateCatalogStatus {
  if (hiddenTemplateKeys.includes(templateKey as (typeof hiddenTemplateKeys)[number])) return "hidden";
  return availableTemplateKeys.includes(templateKey as (typeof availableTemplateKeys)[number]) ? "available" : "coming_soon";
}

export const templateCategoryFilters = [
  { key: "all", label: "전체" },
  ...TEMPLATE_CATEGORIES.map((category) => ({ key: category.key, label: category.label })),
] as const;

export const templateCatalog = TEMPLATE_CATEGORIES.flatMap((category) =>
  category.templates.map((template, templateIndex) => {
    const templateType = getTemplateType(template.key);
    const supportedServices = getSupportedServices(template.key);
    const primaryService: TemplateServiceKey = supportedServices.includes("display") && !supportedServices.includes("basic")
      ? "display"
      : "basic";
    const status = getTemplateCatalogStatus(template.key);

    return {
      key: template.key,
      templateKey: template.key,
      service: primaryService,
      serviceLabel: primaryService === "display" ? "아티메뉴 디스플레이" : "아티메뉴 베이직",
      name: template.label,
      displayName: template.label,
      label: template.label,
      template_category: category.key,
      categoryLabel: category.label,
      design: template.design,
      description: templateType === "price_list"
        ? getTemplateTypeShortDescription("price_list")
        : templateDescriptionByKey[template.key] ?? templateDescriptionByDesign[template.design],
      categories: [category.key],
      categoryLabels: [category.label],
      badge: templateBadgeByDesign[template.design],
      template_type: templateType,
      templateType,
      templateTypeLabel: getTemplateTypeLabel(templateType),
      supported_services: supportedServices,
      supportedServices,
      status,
      active: status === "available",
      featuredHome: featuredHomeTemplateKeys.includes(template.key as (typeof featuredHomeTemplateKeys)[number]),
      featuredBasic: featuredBasicTemplateKeys.includes(template.key as (typeof featuredBasicTemplateKeys)[number]),
      featuredDisplay: featuredDisplayTemplateKeys.includes(template.key as (typeof featuredDisplayTemplateKeys)[number]),
      sortOrder: TEMPLATE_CATEGORIES.findIndex((entry) => entry.key === category.key) * 100 + templateIndex,
      thumbnailTone: templateToneByDesign[template.design],
      thumbnailUrl: null,
      previewImage: null,
    };
  })
);

export const TEMPLATE_CATALOG = templateCatalog;

export type TemplateCatalogItem = (typeof templateCatalog)[number];

export const templateKeys = templateCatalog.map((template) => template.key) as TemplateKey[];
export const templateCategoryKeys = TEMPLATE_CATEGORIES.map((category) => category.key) as TemplateCategoryKey[];

export function isTemplateCategoryKey(value: string): value is TemplateCategoryKey {
  return templateCategoryKeys.includes(value as TemplateCategoryKey);
}

export function isLegacyTemplateKey(value: string): value is LegacyTemplateKey {
  return LEGACY_TEMPLATE_KEYS.includes(value as LegacyTemplateKey);
}

export function isValidTemplateKey(value: string): value is TemplateKey {
  return templateKeys.includes(value as TemplateKey);
}

export function isKnownTemplateKey(value: string): value is AnyTemplateKey {
  return isValidTemplateKey(value) || isLegacyTemplateKey(value);
}

export function getTemplateCategoryLabel(categoryKey?: string | null) {
  return TEMPLATE_CATEGORIES.find((category) => category.key === categoryKey)?.label ?? "카페";
}

export function getTemplateCategoryFromKey(templateKey?: string | null): TemplateCategoryKey | null {
  if (!templateKey) return null;

  const matchedTemplate = templateCatalog.find((template) => template.key === templateKey);
  if (matchedTemplate) return matchedTemplate.template_category;

  if (templateKey.startsWith("cafe_")) return "cafe";
  if (templateKey.startsWith("display_")) return "display";
  if (templateKey.startsWith("bakery_")) return "bakery";
  if (templateKey.startsWith("dessert_")) return "dessert";
  if (templateKey.startsWith("restaurant_")) return "restaurant";
  if (templateKey.startsWith("fine_dining_")) return "fine_dining";
  if (templateKey.startsWith("casual_dining_")) return "casual_dining";
  if (templateKey.startsWith("fast_food_")) return "fast_food";
  if (templateKey.startsWith("brunch_")) return "brunch";
  if (templateKey.startsWith("pub_bar_")) return "pub_bar";
  if (templateKey.startsWith("hair_salon_")) return "hair_salon";
  if (templateKey.startsWith("nail_shop_")) return "nail_shop";
  if (templateKey.startsWith("beauty_esthetic_")) return "beauty_esthetic";
  if (templateKey.startsWith("workshop_class_")) return "workshop_class";
  if (templateKey.startsWith("fitness_pt_")) return "fitness_pt";
  if (templateKey.startsWith("pet_shop_")) return "pet_shop";
  if (templateKey.startsWith("clinic_")) return "clinic";
  if (templateKey.startsWith("popup_event_")) return "popup_event";
  if (templateKey.startsWith("etc_")) return "etc";

  return null;
}

export function getTemplateByKey(templateKey?: string | null, templateCategory?: string | null) {
  const normalizedKey = normalizeTemplateKey(templateKey, templateCategory);
  return templateCatalog.find((template) => template.key === normalizedKey) ?? templateCatalog[0];
}

export function normalizeTemplateKey(templateKey?: string | null, templateCategory?: string | null): TemplateKey {
  const key = templateKey?.trim() ?? "";
  if (isValidTemplateKey(key)) return key;

  const category = isTemplateCategoryKey(templateCategory ?? "") ? (templateCategory as TemplateCategoryKey) : "cafe";
  if (isLegacyTemplateKey(key)) {
    const candidate = `${category}_${key}` as TemplateKey;
    return isValidTemplateKey(candidate) ? candidate : `${category}_design_a` as TemplateKey;
  }

  return "cafe_design_a";
}

export function getTemplateDisplayName(templateKey?: string | null, templateCategory?: string | null) {
  const template = getTemplateByKey(templateKey, templateCategory);
  return `${getTemplateCategoryLabel(template.template_category)} / ${template.label}`;
}

export function getTemplateDesignKey(templateKey?: string | null, templateCategory?: string | null): TemplateDesignKey {
  return getTemplateByKey(templateKey, templateCategory).design;
}

function sortTemplateCatalogItems(templates: readonly TemplateCatalogItem[]): TemplateCatalogItem[] {
  return [...templates].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getAllTemplates(): TemplateCatalogItem[] {
  return sortTemplateCatalogItems(TEMPLATE_CATALOG);
}

export function getTemplatesForService(serviceType: TemplateServiceType): TemplateCatalogItem[] {
  return getAllTemplates().filter((template) => template.supportedServices.includes(serviceType));
}

export function getAvailableTemplatesForService(serviceType: TemplateServiceType): TemplateCatalogItem[] {
  return getTemplatesForService(serviceType).filter((template) => template.status === "available");
}

export function getFeaturedTemplatesForHome(): TemplateCatalogItem[] {
  return getAllTemplates().filter((template) => template.featuredHome && template.status !== "hidden");
}

export function getFeaturedTemplatesForBasicPage(): TemplateCatalogItem[] {
  return getAllTemplates().filter((template) => (
    template.featuredBasic &&
    template.status !== "hidden" &&
    template.supportedServices.includes("basic")
  ));
}

export function getFeaturedTemplatesForDisplayPage(): TemplateCatalogItem[] {
  return getAllTemplates().filter((template) => (
    template.featuredDisplay &&
    template.status !== "hidden" &&
    template.templateType !== "schedule" &&
    template.supportedServices.includes("display")
  ));
}

export function isTemplateSupportedForService(templateKey: string | null | undefined, serviceType: TemplateServiceType): boolean {
  return isTemplateKeySupportedForService(templateKey, serviceType);
}
