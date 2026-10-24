import { getDefaultDesignReview } from "./menu-design-policy";
import { REPRESENTATIVE_ALIGNMENTS, type RepresentativeAlignment } from "./menu-design-surfaces";
import type { MenuPageData } from "./menu-page-data";
import { isKoreanFontValue, isEnglishFontValue, getSafeEnglishFontValueForTemplate, type KoreanFontValue, type EnglishFontValue } from "./font-options";
import { ALBUM_IMAGE_RATIOS, CHIP_SHAPES, IMAGE_RADIUS_KEYS, MAX_IMAGE_RADIUS, readMenuAppearance, type MenuAppearance } from "./menu-appearance";
import { getCustomTypographySettings, mergeTypographySettings, withCommonTypographyFonts, type TypographyRoleKey } from "./template-typography-presets";
import { getMenuDesignBackgrounds, getResolvedBackgroundColor, normalizeBackgroundColor } from "./template-background-colors";
import { getCustomBadgeStyles, mergeBadgeStyles } from "./template-badge-styles";
import { DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR, getReadableTextColorForTimeSaleBadge } from "./menu-time-sales";
import { readPreviewChipColors, type PreviewChipColors } from "./menu-preview-chip-colors";
import { normalizeMenuTextColors, readMenuTextColors, type MenuTextColors } from "./menu-text-colors";
import { MOCHA_FOREST_PANEL_COLORS } from "./mocha-forest-panels";

export const PREVIEW_FONT_GROUPS = ["brand", "category", "other"] as const;
export type PreviewFontGroup = typeof PREVIEW_FONT_GROUPS[number];
export type PreviewFontChoice = { color?: string; ko?: KoreanFontValue; en?: EnglishFontValue };
export type PreviewDesign = {
  textColors?: MenuTextColors;
  pageBackground?: string;
  auxiliaryBackground?: string;
  coverBackground?: string;
  sidebarBackground?: string;
  coverDescriptionColor?: string;
  representativeAlignment?: RepresentativeAlignment;
  fontFamily?: Omit<PreviewFontChoice, "color">;
  fonts?: Partial<Record<PreviewFontGroup, PreviewFontChoice>>;
  imageRadii?: MenuAppearance["imageRadii"];
  chipShape?: MenuAppearance["chipShape"];
  chipColors?: PreviewChipColors;
  albumImageRatio?: MenuAppearance["albumImageRatio"];
};
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function readPreviewDesign(raw: unknown): PreviewDesign {
  let source: Record<string, unknown>;
  try { source = record(typeof raw === "string" && raw.length <= 4000 ? JSON.parse(raw) : raw); } catch { return {}; }
  const result: PreviewDesign = {};
  for (const key of ["pageBackground", "auxiliaryBackground", "coverBackground", "sidebarBackground", "coverDescriptionColor"] as const) {
    const color = normalizeBackgroundColor(source[key]); if (color) result[key] = color;
  }
  if (REPRESENTATIVE_ALIGNMENTS.includes(source.representativeAlignment as RepresentativeAlignment)) result.representativeAlignment = source.representativeAlignment as RepresentativeAlignment;
  const fonts = record(source.fonts);
  const shared = record(source.fontFamily), family: Omit<PreviewFontChoice, "color"> = {};
  for (const script of ["ko", "en"] as const) {
    const candidate = shared[script] ?? record(fonts.other)[script] ?? record(fonts.brand)[script] ?? record(fonts.category)[script];
    if (script === "ko" && isKoreanFontValue(candidate)) family.ko = candidate;
    if (script === "en" && isEnglishFontValue(candidate)) family.en = candidate;
  }
  if (Object.keys(family).length) result.fontFamily = family;
  for (const group of PREVIEW_FONT_GROUPS) {
    const input = record(fonts[group]), choice: PreviewFontChoice = {};
    const color = normalizeBackgroundColor(input.color); if (color) choice.color = color;

    if (Object.keys(choice).length) (result.fonts ??= {})[group] = choice;
  }
  const textColors = normalizeMenuTextColors(source.textColors);
  if (Object.keys(textColors).length) result.textColors = textColors;
  const chipColors = readPreviewChipColors(source.chipColors);
  if (Object.keys(chipColors).length) result.chipColors = chipColors;
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
  const savedDesignId = record(data.menuSite.settings).menu_design_id;
  const neutral = data.menuSite.id.startsWith("default-design-preview-") || Boolean(getDefaultDesignReview(typeof savedDesignId === "string" ? savedDesignId : undefined, key ?? ""));
  const page = backgrounds.page ?? (key === "cafe_mocha_forest_a" ? MOCHA_FOREST_PANEL_COLORS.ivory : !neutral && key === "dining_aube_table_b" ? "#F7F2EA" : getResolvedBackgroundColor(key, data.menuSite.page_settings));
  const badge = mergeBadgeStyles(key, getCustomBadgeStyles(data.menuSite.settings, data.menuSite.page_settings)).default;
  const saleBackground = data.timeSales?.[0]?.badgeBackgroundColor ?? DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR;
  return {
    textColors: readMenuTextColors(data.menuSite.page_settings),
    textColorDefaults: {
      brand: typography.typography_roles.brand.color ?? normalizeBackgroundColor(data.menuSite.brand_color) ?? "#191C1B",
      category: typography.typography_roles.category.color ?? normalizeBackgroundColor(data.menuSite.brand_color) ?? "#191C1B",
      product: typography.typography_roles.itemName.color ?? typography.typography_roles.price.color ?? "#191C1B",
      representative: typography.typography_roles.supporting.color ?? "#191C1B",
      supporting: typography.typography_roles.supporting.color ?? "#191C1B",
    },
    fontFamily: { ko: typography.korean_font_key, en: typography.english_font_key },
    chipColors: { generalBackground: badge.background_color, generalText: badge.text_color, saleBackground, saleText: getReadableTextColorForTimeSaleBadge(saleBackground) },
    fonts: Object.fromEntries(PREVIEW_FONT_GROUPS.map(group => {
      const role = typography.typography_roles[group === "other" ? "supporting" : group];
      return [group, { ko: role.font_ko_key ?? typography.korean_font_key, en: role.font_en_key ?? typography.english_font_key,
        color: role.color ?? (group === "other" ? "#191C1B" : normalizeBackgroundColor(data.menuSite.brand_color) ?? "#191C1B") }];
    })) as Record<PreviewFontGroup, Required<PreviewFontChoice>>,
    colors: { page, auxiliary: backgrounds.auxiliary ?? (key === "cafe_mocha_forest_a" ? MOCHA_FOREST_PANEL_COLORS.brown : key === "cafe_round_focus_a" ? page : null),
      cover: normalizeBackgroundColor(data.pageSettings.multi_page_cover_background_color) ?? "#FFFFFF",
      sidebar: backgrounds.sidebar ?? (neutral ? "#F4F5F3" : "#401E24"),
      coverDescription: normalizeBackgroundColor(record(record(data.menuSite.page_settings).design).coverDescriptionColor) ?? (neutral ? "#606561" : "#FFFFFF") },
    appearance: readMenuAppearance(data.menuSite.page_settings),
  };
}
export type PreviewDesignDefaults = ReturnType<typeof previewDesignDefaults>;

/** In-memory preview overrides only. Never saves settings or changes the source data. */
export function applyPreviewDesign(source: MenuPageData, value: unknown, album: boolean): MenuPageData {
  const overrides = readPreviewDesign(value);
  if (source.menuSite.template_key === "display_menu_a" || !Object.keys(overrides).length) return source;
  const data = structuredClone(source), page = record(data.menuSite.page_settings), design = record(page.design);
  if (overrides.textColors) design.textColors = { ...readMenuTextColors(page), ...overrides.textColors };
  if (overrides.chipColors) design.previewChipColors = overrides.chipColors;
  if (overrides.representativeAlignment) design.representativeAlignment = overrides.representativeAlignment;
  if (overrides.coverDescriptionColor) design.coverDescriptionColor = overrides.coverDescriptionColor;
  if (overrides.pageBackground) design.backgroundColor = overrides.pageBackground;
  if (overrides.auxiliaryBackground) design.auxiliaryBackgroundColor = overrides.auxiliaryBackground;
  if (overrides.sidebarBackground) design.sidebarBackgroundColor = overrides.sidebarBackground;
  if (overrides.coverBackground) { data.pageSettings.multi_page_cover_background_color = overrides.coverBackground; page.multi_page_cover_background_color = overrides.coverBackground; }
  const typography = mergeTypographySettings(data.menuSite.template_key, getCustomTypographySettings(data.menuSite.settings, data.menuSite.page_settings));
  const roles = overrides.fontFamily ? withCommonTypographyFonts(typography.typography_roles) : typography.typography_roles;
  if (overrides.fontFamily) {
    design.commonFonts = true;
    if (overrides.fontFamily.ko) design.koreanFont = overrides.fontFamily.ko;
    if (overrides.fontFamily.en) design.englishFont = getSafeEnglishFontValueForTemplate(data.menuSite.template_key, overrides.fontFamily.en);
  }
  for (const group of PREVIEW_FONT_GROUPS) {
    const choice = overrides.fonts?.[group]; if (!choice) continue;
    const targets: TypographyRoleKey[] = group === "other" ? ["itemName", "supporting", "price"] : [group];
    for (const target of targets) roles[target] = { ...roles[target], ...(choice.color ? { color: choice.color } : {}) };
  }
  if (overrides.fonts || overrides.fontFamily) {
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
