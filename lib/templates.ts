export const TEMPLATE_CATEGORIES = [
  {
    key: "cafe",
    label: "카페",
    templates: [
      { key: "cafe_design_a", label: "Cafe Design A", design: "design_a" },
      { key: "cafe_design_b", label: "Cafe Design B", design: "design_b" },
      { key: "cafe_design_c", label: "Cafe Design C", design: "design_c" },
    ],
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
] as const;

export const LEGACY_TEMPLATE_KEYS = ["design_a", "design_b", "design_c"] as const;

export type TemplateCategoryKey = (typeof TEMPLATE_CATEGORIES)[number]["key"];
export type TemplateCategoryFilterKey = TemplateCategoryKey | "all";
export type LegacyTemplateKey = (typeof LEGACY_TEMPLATE_KEYS)[number];
export type TemplateKey = (typeof TEMPLATE_CATEGORIES)[number]["templates"][number]["key"];
export type AnyTemplateKey = TemplateKey | LegacyTemplateKey;
export type TemplateDesignKey = (typeof TEMPLATE_CATEGORIES)[number]["templates"][number]["design"];

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

export const templateCategoryFilters = [
  { key: "all", label: "전체" },
  ...TEMPLATE_CATEGORIES.map((category) => ({ key: category.key, label: category.label })),
] as const;

export const templateCatalog = TEMPLATE_CATEGORIES.flatMap((category) =>
  category.templates.map((template) => ({
    key: template.key,
    name: template.label,
    label: template.label,
    template_category: category.key,
    categoryLabel: category.label,
    design: template.design,
    description: templateDescriptionByDesign[template.design],
    categories: [category.key],
    categoryLabels: [category.label],
    badge: templateBadgeByDesign[template.design],
    active: true,
    thumbnailTone: templateToneByDesign[template.design],
    thumbnailUrl: null,
  }))
);

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
  if (templateKey.startsWith("fine_dining_")) return "fine_dining";
  if (templateKey.startsWith("casual_dining_")) return "casual_dining";
  if (templateKey.startsWith("fast_food_")) return "fast_food";
  if (templateKey.startsWith("brunch_")) return "brunch";

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
