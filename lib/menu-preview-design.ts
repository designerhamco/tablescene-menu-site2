import type { MenuPageData } from "./menu-page-data";
import { isKoreanFontValue, isEnglishFontValue, getSafeEnglishFontValueForTemplate, type KoreanFontValue, type EnglishFontValue } from "./font-options";
import { ALBUM_IMAGE_RATIOS, CHIP_SHAPES, IMAGE_RADIUS_KEYS, MAX_IMAGE_RADIUS, readMenuAppearance, type MenuAppearance } from "./menu-appearance";
import { getCustomTypographySettings, mergeTypographySettings, type TypographyRoleKey } from "./template-typography-presets";
import { getMenuDesignBackgrounds, getResolvedBackgroundColor, normalizeBackgroundColor } from "./template-background-colors";
import { MOCHA_FOREST_PANEL_COLORS } from "./mocha-forest-panels";

export const PREVIEW_FONT_GROUPS = ["brand", "category", "other"] as const;
export type PreviewFontGroup = typeof PREVIEW_FONT_GROUPS[number];
export type PreviewFontChoice = { color?: string; ko?: KoreanFontValue; en?: EnglishFontValue };
export type PreviewDesign = {
  pageBackground?: string;
  auxiliaryBackground?: string;
  coverBackground?: string;
  sidebarBackground?: string;
  fonts?: Partial<Record<PreviewFontGroup, PreviewFontChoice>>;
  imageRadii?: MenuAppearance["imageRadii"];
  chipShape?: MenuAppearance["chipShape"];
  albumImageRatio?: MenuAppearance["albumImageRatio"];
};
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function readPreviewDesign(raw: unknown): PreviewDesign {
  let source: Record<string, unknown>;
  try { source = record(typeof raw === "string" && raw.length <= 4000 ? JSON.parse(raw) : raw); } catch { return {}; }
  const result: PreviewDesign = {};
  for (const key of ["pageBackground", "auxiliaryBackground", "coverBackground", "sidebarBackground"] as const) {
    const color = normalizeBackgroundColor(source[key]); if (color) result[key] = color;
  }
  const fonts = record(source.fonts);
  for (const group of PREVIEW_FONT_GROUPS) {
    const input = record(fonts[group]), choice: PreviewFontChoice = {};
    const color = normalizeBackgroundColor(input.color); if (color) choice.color = color;
    if (isKoreanFontValue(input.ko)) choice.ko = input.ko;
    if (isEnglishFontValue(input.en)) choice.en = input.en;
    if (Object.keys(choice).length) (result.fonts ??= {})[group] = choice;
  }
  const radii = record(source.imageRadii);
  for (const key of IMAGE_RADIUS_KEYS) if (typeof radii[key] === "number" && Number.isInteger(radii[key]) && radii[key] >= 0 && radii[key] <= MAX_IMAGE_RADIUS) (result.imageRadii ??= {})[key] = radii[key];
  if (CHIP_SHAPES.includes(source.chipShape as MenuAppearance["chipShape"])) result.chipShape = source.chipShape as MenuAppearance["chipShape"];
  if (ALBUM_IMAGE_RATIOS.includes(source.albumImageRatio as MenuAppearance["albumImageRatio"])) result.albumImageRatio = source.albumImageRatio as MenuAppearance["albumImageRatio"];
  return result;
}
export function serializePreviewDesign(value: PreviewDesign) { const clean = readPreviewDesign(value); return Object.keys(clean).length ? JSON.stringify(clean) : undefined; }
export function previewDesignDefaults(data: MenuPageData) {
  const key = data.menuSite.template_key;
  const typography = mergeTypographySettings(key, getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings));
  const backgrounds = getMenuDesignBackgrounds(key, data.menuSite.page_settings);
  const neutral = data.menuSite.id.startsWith("default-design-preview-");
  const page = backgrounds.page ?? (key === "cafe_mocha_forest_a" ? MOCHA_FOREST_PANEL_COLORS.ivory : !neutral && key === "dining_aube_table_b" ? "#F7F2EA" : getResolvedBackgroundColor(key, data.menuSite.page_settings));
  return {
    fonts: Object.fromEntries(PREVIEW_FONT_GROUPS.map(group => {
      const role = typography.typography_roles[group === "other" ? "supporting" : group];
      return [group, { ko: role.font_ko_key ?? typography.korean_font_key, en: role.font_en_key ?? typography.english_font_key,
        color: role.color ?? (group === "other" ? "#191C1B" : normalizeBackgroundColor(data.menuSite.brand_color) ?? "#191C1B") }];
    })) as Record<PreviewFontGroup, Required<PreviewFontChoice>>,
    colors: { page, auxiliary: backgrounds.auxiliary ?? (key === "cafe_mocha_forest_a" ? MOCHA_FOREST_PANEL_COLORS.brown : page),
      cover: normalizeBackgroundColor(data.pageSettings.multi_page_cover_background_color) ?? "#FFFFFF",
      sidebar: backgrounds.sidebar ?? (neutral ? "#F4F5F3" : "#401E24") },
    appearance: readMenuAppearance(data.menuSite.page_settings),
  };
}
export type PreviewDesignDefaults = ReturnType<typeof previewDesignDefaults>;

/** Catalog-only override adapter. No customer route, save action or database call. */
export function applyPreviewDesign(source: MenuPageData, value: unknown, album: boolean): MenuPageData {
  const overrides = readPreviewDesign(value);
  if (source.menuSite.template_key === "display_menu_a" || !Object.keys(overrides).length) return source;
  const data = structuredClone(source), page = record(data.menuSite.page_settings), design = record(page.design);
  if (overrides.pageBackground) design.backgroundColor = overrides.pageBackground;
  if (overrides.auxiliaryBackground) design.auxiliaryBackgroundColor = overrides.auxiliaryBackground;
  if (overrides.sidebarBackground) design.sidebarBackgroundColor = overrides.sidebarBackground;
  if (overrides.coverBackground) { data.pageSettings.multi_page_cover_background_color = overrides.coverBackground; page.multi_page_cover_background_color = overrides.coverBackground; }
  const typography = mergeTypographySettings(data.menuSite.template_key, getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings));
  const roles = typography.typography_roles;
  for (const group of PREVIEW_FONT_GROUPS) {
    const choice = overrides.fonts?.[group]; if (!choice) continue;
    const targets: TypographyRoleKey[] = group === "other" ? ["itemName", "supporting", "price"] : [group];
    for (const target of targets) roles[target] = { ...roles[target], ...(choice.color ? { color: choice.color } : {}), ...(choice.ko ? { font_ko_key: choice.ko } : {}), ...(choice.en ? { font_en_key: getSafeEnglishFontValueForTemplate(data.menuSite.template_key, choice.en) } : {}) };
    // Store introductions/notices use the chosen Korean face for every script.
    if (group === "other" && choice.ko) {
      for (const title of ["brand", "category"] as const) roles[title].font_ko_key ??= typography.korean_font_key;
      design.koreanFont = choice.ko;
    }
  }
  if (overrides.fonts) {
    design.typographyRoles = roles;
    // Copied neutral/native title colors are defaults, not explicit ink edits.
    design.previewTitleColorRoles = (["brand","category"] as const).filter(role=>overrides.fonts?.[role]?.color);
  }
  const appearance = readMenuAppearance(page);
  if (overrides.imageRadii) appearance.imageRadii = { ...appearance.imageRadii, ...overrides.imageRadii };
  if (overrides.chipShape) appearance.chipShape = overrides.chipShape;
  if (album && overrides.albumImageRatio) appearance.albumImageRatio = overrides.albumImageRatio;
  if (overrides.imageRadii || overrides.chipShape || (album && overrides.albumImageRatio)) design.appearance = appearance;
  data.menuSite.page_settings = { ...page, design } as typeof data.menuSite.page_settings;
  return data;
}
