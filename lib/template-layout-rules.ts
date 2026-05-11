import { normalizeTemplateKey, type TemplateKey } from "@/lib/templates";

export type MenuLayoutDensity = "spacious" | "default" | "compact" | "ultraCompact";
export type MenuLayoutDevice = "mobile" | "tablet" | "desktop";

type DensityThreshold = {
  maxItems: number;
  density: MenuLayoutDensity;
};

export type TemplateLayoutRules = {
  templateKey: TemplateKey;
  maxColumns: Record<MenuLayoutDevice, number>;
  densityThresholds: Record<MenuLayoutDevice, DensityThreshold[]>;
  gridClassNameByDensity: Record<MenuLayoutDensity, string>;
};

const defaultDensityThresholds: TemplateLayoutRules["densityThresholds"] = {
  mobile: [
    { maxItems: 6, density: "spacious" },
    { maxItems: 12, density: "default" },
    { maxItems: 24, density: "compact" },
  ],
  tablet: [
    { maxItems: 8, density: "spacious" },
    { maxItems: 18, density: "default" },
    { maxItems: 32, density: "compact" },
  ],
  desktop: [
    { maxItems: 10, density: "spacious" },
    { maxItems: 24, density: "default" },
    { maxItems: 40, density: "compact" },
  ],
};

const defaultGridClassNameByDensity: TemplateLayoutRules["gridClassNameByDensity"] = {
  spacious: "grid gap-4 sm:grid-cols-2",
  default: "grid gap-3 sm:grid-cols-2",
  compact: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
  ultraCompact: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
};

const TEMPLATE_LAYOUT_RULES = {
  cafe_design_a: {
    templateKey: "cafe_design_a",
    maxColumns: { mobile: 2, tablet: 2, desktop: 4 },
    densityThresholds: {
      mobile: [
        { maxItems: 6, density: "spacious" },
        { maxItems: 14, density: "default" },
        { maxItems: 28, density: "compact" },
      ],
      tablet: [
        { maxItems: 10, density: "spacious" },
        { maxItems: 24, density: "default" },
        { maxItems: 42, density: "compact" },
      ],
      desktop: [
        { maxItems: 12, density: "spacious" },
        { maxItems: 28, density: "default" },
        { maxItems: 48, density: "compact" },
      ],
    },
    gridClassNameByDensity: {
      spacious: "grid gap-4 sm:grid-cols-2",
      default: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
      compact: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      ultraCompact: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    },
  },
  fine_dining_design_a: {
    templateKey: "fine_dining_design_a",
    maxColumns: { mobile: 1, tablet: 2, desktop: 2 },
    densityThresholds: {
      mobile: [
        { maxItems: 5, density: "spacious" },
        { maxItems: 10, density: "default" },
        { maxItems: 20, density: "compact" },
      ],
      tablet: [
        { maxItems: 6, density: "spacious" },
        { maxItems: 14, density: "default" },
        { maxItems: 28, density: "compact" },
      ],
      desktop: [
        { maxItems: 8, density: "spacious" },
        { maxItems: 18, density: "default" },
        { maxItems: 34, density: "compact" },
      ],
    },
    gridClassNameByDensity: {
      spacious: "grid gap-5",
      default: "grid gap-4 md:grid-cols-2",
      compact: "grid gap-3 md:grid-cols-2",
      ultraCompact: "grid gap-3 md:grid-cols-2",
    },
  },
  fast_food_design_a: {
    templateKey: "fast_food_design_a",
    maxColumns: { mobile: 2, tablet: 3, desktop: 4 },
    densityThresholds: {
      mobile: [
        { maxItems: 8, density: "spacious" },
        { maxItems: 18, density: "default" },
        { maxItems: 36, density: "compact" },
      ],
      tablet: [
        { maxItems: 12, density: "spacious" },
        { maxItems: 30, density: "default" },
        { maxItems: 54, density: "compact" },
      ],
      desktop: [
        { maxItems: 16, density: "spacious" },
        { maxItems: 36, density: "default" },
        { maxItems: 64, density: "compact" },
      ],
    },
    gridClassNameByDensity: {
      spacious: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
      default: "grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      compact: "grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      ultraCompact: "grid gap-2 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    },
  },
} as const satisfies Partial<Record<TemplateKey, TemplateLayoutRules>>;

const fallbackLayoutRules: TemplateLayoutRules = {
  templateKey: "cafe_design_a",
  maxColumns: { mobile: 1, tablet: 2, desktop: 3 },
  densityThresholds: defaultDensityThresholds,
  gridClassNameByDensity: defaultGridClassNameByDensity,
};

export function getTemplateLayoutRules(templateKey?: string | null, templateCategory?: string | null): TemplateLayoutRules {
  const normalizedTemplateKey = normalizeTemplateKey(templateKey, templateCategory);

  return TEMPLATE_LAYOUT_RULES[normalizedTemplateKey] ?? {
    ...fallbackLayoutRules,
    templateKey: normalizedTemplateKey,
  };
}

export function getMenuLayoutDensity(
  itemCount: number,
  rules: TemplateLayoutRules,
  device: MenuLayoutDevice = "desktop"
): MenuLayoutDensity {
  const thresholds = rules.densityThresholds[device];
  const matchedThreshold = thresholds.find((threshold) => itemCount <= threshold.maxItems);

  return matchedThreshold?.density ?? "ultraCompact";
}

export function getMenuGridClassName(rules: TemplateLayoutRules, density: MenuLayoutDensity) {
  return rules.gridClassNameByDensity[density];
}
