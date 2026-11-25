import { getDefaultDesignReview } from "./menu-design-policy";
import { usesOnePageProportionPolicy } from "./one-page-proportion-policy";
import { readMenuDecorations } from "./menu-decorations";

export const MENU_PATTERN_BAND_THICKNESSES = [8, 12, 16, 20, 24, 28, 32] as const;
export const MENU_PATTERN_DEFAULT_THICKNESS = 16;
export type MenuPatternBandThickness = typeof MENU_PATTERN_BAND_THICKNESSES[number];
type PatternImage = { imagePath: string; imageUrl: string };
export type MenuPatternBands = { enabled: boolean; thickness?: MenuPatternBandThickness; image?: PatternImage };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function supportsMenuPatternBands(templateKey: string | null | undefined, settings: unknown, presentation?: "one" | "multi") {
  if (!templateKey || templateKey === "restaurant_onue_a" || !usesOnePageProportionPolicy(templateKey, presentation)) return false;
  const design = record(settings).menu_design_id;
  return getDefaultDesignReview(typeof design === "string" ? design : undefined, templateKey)?.layout !== "basic-upper-left";
}

export function isMenuPatternBandThickness(value: unknown): value is MenuPatternBandThickness {
  return MENU_PATTERN_BAND_THICKNESSES.some(thickness => value === thickness);
}

export function isMenuPatternBandPath(path: string, menuId: string) {
  const prefix = `menu-sites/${menuId}/draft/pattern-bands/`;
  return path.startsWith(prefix) && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.webp$/.test(path.slice(prefix.length));
}

function readPatternImage(value: unknown): PatternImage | undefined {
  const { imageUrl, imagePath } = record(value);
  if (typeof imagePath !== "string" || typeof imageUrl !== "string") return;
  const menuId = imagePath.split("/")[1];
  if (!menuId || !isMenuPatternBandPath(imagePath, menuId)) return;
  try {
    const url = new URL(imageUrl);
    if ((url.protocol === "https:" || url.protocol === "http:") &&
        url.pathname.endsWith(`/object/public/menu-images/${imagePath}`)) return { imagePath, imageUrl };
  } catch {
    return undefined;
  }
}

export function getMenuPatternBands(templateKey: string | null | undefined, pageSettings: unknown): MenuPatternBands {
  const saved = record(record(record(pageSettings).design).patternBands);
  return {
    enabled: readMenuDecorations(pageSettings).patternBands ?? (typeof saved.enabled === "boolean" ? saved.enabled : templateKey === "fast_food_loop_bagel_a"),
    thickness: isMenuPatternBandThickness(saved.thickness) ? saved.thickness : undefined,
    image: readPatternImage(saved.image),
  };
}

export function resolveMenuPatternBands(templateKey: string | null | undefined, settings: unknown, pageSettings: unknown, presentation?: "one" | "multi") {
  if (!supportsMenuPatternBands(templateKey, settings, presentation)) return;
  const pattern = getMenuPatternBands(templateKey, pageSettings);
  if (!pattern.enabled || (!pattern.image && templateKey !== "fast_food_loop_bagel_a")) return;
  return pattern;
}

export function menuPatternBandRenderProps(templateKey: string | null | undefined, settings: unknown, pageSettings: unknown, presentation?: "one" | "multi") {
  const pattern = resolveMenuPatternBands(templateKey, settings, pageSettings, presentation);
  const thickness = pattern?.thickness ?? (templateKey !== "fast_food_loop_bagel_a" && pattern?.image ? MENU_PATTERN_DEFAULT_THICKNESS : undefined);
  return {
    kind: pattern ? (pattern.image ? "image" : "checker") : undefined,
    style: {
      ...(thickness ? { "--menu-pattern-band-size": `${thickness / 16}rem` } : {}),
      ...(pattern?.image ? { "--menu-pattern-band-image": `url(${JSON.stringify(pattern.image.imageUrl)})` } : {}),
    },
  };
}
