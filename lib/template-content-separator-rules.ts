import { normalizeTemplateKey, type TemplateKey } from "@/lib/templates";

export type TemplateCategoryDividerPlacement = "before-category-except-first-block" | "none";
export type TemplateWidgetBoundaryStyle = "none";

export type TemplateContentSeparatorRules = {
  categoryDivider: TemplateCategoryDividerPlacement;
  widgetBoundary: TemplateWidgetBoundaryStyle;
};

const defaultContentSeparatorRules: TemplateContentSeparatorRules = {
  categoryDivider: "none",
  widgetBoundary: "none",
};

const TEMPLATE_CONTENT_SEPARATOR_RULES = {
  cafe_design_a: {
    categoryDivider: "before-category-except-first-block",
    widgetBoundary: "none",
  },
} as const satisfies Partial<Record<TemplateKey, TemplateContentSeparatorRules>>;

export function getTemplateContentSeparatorRules(
  templateKey?: string | null,
  templateCategory?: string | null,
): TemplateContentSeparatorRules {
  const normalizedTemplateKey = normalizeTemplateKey(templateKey, templateCategory);
  return TEMPLATE_CONTENT_SEPARATOR_RULES[normalizedTemplateKey as keyof typeof TEMPLATE_CONTENT_SEPARATOR_RULES] ?? defaultContentSeparatorRules;
}

export function shouldShowCategoryContentDivider(
  rules: TemplateContentSeparatorRules,
  hasPreviousVisibleBlock: boolean,
) {
  return rules.categoryDivider === "before-category-except-first-block" && hasPreviousVisibleBlock;
}
