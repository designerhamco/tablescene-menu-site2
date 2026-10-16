import type { MenuPreviewDevice } from "./menu-preview-devices";

/** Shared canvas sizing and category hierarchy; preserve template fonts/layout personalities and excluded engines. */
export const ONE_PAGE_PROPORTION_TEMPLATE_KEYS = [
  "restaurant_onue_a",
  "cafe_design_a",
  "cafe_mocha_forest_a",
  "cafe_sunday_line_a",
  "cafe_van_gogh_a",
  "cafe_round_focus_a",
  "fast_food_loop_bagel_a",
] as const;

export function usesOnePageProportionPolicy(templateKey: string | null | undefined, pagePresentation?: "one" | "multi"): boolean {
  return pagePresentation !== "multi" && ONE_PAGE_PROPORTION_TEMPLATE_KEYS.some((key) => key === templateKey);
}

export function usesOnePageProportionFitPolicy(templateKey: string | null | undefined, previewDevice?: MenuPreviewDevice, pagePresentation?: "one" | "multi"): boolean {
  return previewDevice !== "mobile" && usesOnePageProportionPolicy(templateKey, pagePresentation);
}

export function getOnePageRhythmMode(templateKey: string | null | undefined, device: MenuPreviewDevice, pagePresentation?: "one" | "multi"): "mobile" | "fit" | undefined {
  if (!usesOnePageProportionPolicy(templateKey, pagePresentation)) return undefined;
  return device === "mobile" ? "mobile" : "fit";
}

/** PC/tablet only. Actual visible copy; applies between items, not boundaries. */
export function getOnePageItemRhythmMultiplier(hasSecondary: boolean, hasDescription: boolean, hasAdditionalSupport = false): number {
  if (hasAdditionalSupport || (hasSecondary && hasDescription)) return 1;
  return hasSecondary || hasDescription ? 1.10 : 1.20;
}
