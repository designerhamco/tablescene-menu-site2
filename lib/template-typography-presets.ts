import type { CSSProperties } from "react";

import {
  ENGLISH_FONT_OPTIONS as REGISTERED_ENGLISH_FONT_OPTIONS,
  KOREAN_FONT_OPTIONS as REGISTERED_KOREAN_FONT_OPTIONS,
  getCustomEnglishFontValue,
  getDefaultKoreanFontForTemplate,
  getDefaultEnglishFontForTemplate,
  getEnglishFontOption,
  getFontLoadAssets,
  getKoreanFontOption,
  getSafeEnglishFontValueForTemplate,
  getCustomKoreanFontValue,
  isEnglishFontValue,
  isKoreanFontValue,
  type FontLoadAssets,
  type FontCategoryKey,
  type EnglishFontValue,
  type KoreanFontValue,
} from "@/lib/font-options";

export type KoreanFontKey = KoreanFontValue;
export type EnglishFontKey = EnglishFontValue;
export type FontSizeScaleKey = "s" | "m" | "l";
export type TypographyRoleKey = "brand" | "category" | "itemName" | "supporting" | "price";
export type TypographyRoleSizeKey = "inherit" | "s" | "m" | "l";
export type TypographyRoleWeightKey = "inherit" | "regular" | "medium" | "bold";
export type TypographyRoleFontKey = KoreanFontKey | EnglishFontKey;

export type TypographyRoleSetting = {
  font_ko_key: KoreanFontKey | null;
  font_en_key: EnglishFontKey | null;
  color: string | null;
  size: TypographyRoleSizeKey;
  weight: TypographyRoleWeightKey;
};

export type TypographyRoleSettings = Record<TypographyRoleKey, TypographyRoleSetting>;

export type TypographySettings = {
  korean_font_key: KoreanFontKey;
  english_font_key: EnglishFontKey;
  font_size_scale_key: FontSizeScaleKey;
  typography_roles: TypographyRoleSettings;
};

export type FontOption<Key extends string> = {
  key: Key;
  label: string;
  sample: string;
  category: FontCategoryKey;
  fontFamily: string;
};

export const KOREAN_FONT_OPTIONS: readonly FontOption<KoreanFontKey>[] = REGISTERED_KOREAN_FONT_OPTIONS.map((option) => ({
  key: option.value,
  label: option.label,
  sample: "아메리카노 4,500",
  category: option.category,
  fontFamily: option.fontFamily,
}));

export const ENGLISH_FONT_OPTIONS: readonly FontOption<EnglishFontKey>[] = REGISTERED_ENGLISH_FONT_OPTIONS.map((option) => ({
  key: option.value,
  label: option.label,
  sample: "Signature Coffee 5,500",
  category: option.category,
  fontFamily: option.fontFamily,
}));

export const FONT_SIZE_SCALE_OPTIONS = [
  { key: "s", label: "S", description: "조금 더 작게", scale: 0.92 },
  { key: "m", label: "M", description: "기본 크기", scale: 1 },
  { key: "l", label: "L", description: "조금 더 크게", scale: 1.08 },
] as const satisfies readonly { key: FontSizeScaleKey; label: string; description: string; scale: number }[];

export const DISPLAY_FONT_SIZE_SCALE_OPTIONS = [
  { key: "s", label: "S", description: "조금 더 작게", scale: 0.88 },
  { key: "m", label: "M", description: "기본 크기", scale: 1 },
  { key: "l", label: "L", description: "조금 더 크게", scale: 1.16 },
] as const satisfies readonly { key: FontSizeScaleKey; label: string; description: string; scale: number }[];

export const TYPOGRAPHY_ROLE_KEYS = ["brand", "category", "itemName", "supporting", "price"] as const satisfies readonly TypographyRoleKey[];

export const TYPOGRAPHY_ROLE_SIZE_OPTIONS = [
  { key: "inherit", label: "전체 설정", scale: 1 },
  { key: "s", label: "S", scale: 0.94 },
  { key: "m", label: "M", scale: 1 },
  { key: "l", label: "L", scale: 1.06 },
] as const satisfies readonly { key: TypographyRoleSizeKey; label: string; scale: number }[];

export const TYPOGRAPHY_ROLE_WEIGHT_OPTIONS = [
  { key: "inherit", label: "기본 굵기", value: null },
  { key: "regular", label: "보통", value: "400" },
  { key: "medium", label: "중간", value: "500" },
  { key: "bold", label: "굵게", value: "700" },
] as const satisfies readonly { key: TypographyRoleWeightKey; label: string; value: string | null }[];

export const DEFAULT_TYPOGRAPHY_PRESET: TypographySettings = {
  korean_font_key: "pretendard",
  english_font_key: "outfit",
  font_size_scale_key: "m",
  typography_roles: createDefaultTypographyRoleSettings(),
};

export const TEMPLATE_TYPOGRAPHY_PRESETS: Record<string, Partial<TypographySettings>> = {
  cafe_design_a: {
    korean_font_key: "pretendard",
    english_font_key: "alata",
    font_size_scale_key: "m",
  },
  cafe_noir_a: {
    korean_font_key: "pretendard",
    english_font_key: "cutive-mono",
    font_size_scale_key: "m",
  },
  cafe_design_b: {
    korean_font_key: "pretendard",
    english_font_key: "outfit",
    font_size_scale_key: "m",
  },
  cafe_design_c: {
    korean_font_key: "pretendard",
    english_font_key: "outfit",
    font_size_scale_key: "m",
  },
  display_menu_a: {
    english_font_key: "alata",
  },
  fine_dining_design_a: {
    korean_font_key: "noto-serif-kr",
    english_font_key: "playfair-display",
    font_size_scale_key: "m",
  },
  fast_food_design_a: {
    korean_font_key: "noto-sans-kr",
    english_font_key: "montserrat",
    font_size_scale_key: "s",
  },
};

const fontSizeScaleKeys = new Set<FontSizeScaleKey>(FONT_SIZE_SCALE_OPTIONS.map((option) => option.key));
const typographyRoleSizeKeys = new Set<TypographyRoleSizeKey>(TYPOGRAPHY_ROLE_SIZE_OPTIONS.map((option) => option.key));
const typographyRoleWeightKeys = new Set<TypographyRoleWeightKey>(TYPOGRAPHY_ROLE_WEIGHT_OPTIONS.map((option) => option.key));

const LEGACY_KOREAN_FONT_KEY_MAP: Record<string, KoreanFontKey> = {
  default_ko: "pretendard",
  clean_gothic_ko: "noto-sans-kr",
  soft_gothic_ko: "gothic-a1",
  emotional_serif_ko: "noto-serif-kr",
  modern_gothic_ko: "ibm-plex-sans-kr",
};

const LEGACY_ENGLISH_FONT_KEY_MAP: Record<string, EnglishFontKey> = {
  default_en: "outfit",
  modern_sans_en: "outfit",
  classic_serif_en: "libre-baskerville",
  clean_grotesk_en: "manrope",
  elegant_serif_en: "playfair-display",
};

export function isFontSizeScaleKey(value: unknown): value is FontSizeScaleKey {
  return typeof value === "string" && fontSizeScaleKeys.has(value as FontSizeScaleKey);
}

function normalizeLegacyFontSizeScaleKey(value: unknown): FontSizeScaleKey | null {
  if (typeof value !== "string") return null;

  switch (value.trim().toLowerCase()) {
    case "xs":
    case "s":
      return "s";
    case "m":
      return "m";
    case "l":
    case "xl":
      return "l";
    default:
      return null;
  }
}

export function normalizeFontSizeScaleKey(value: unknown, fallback: FontSizeScaleKey = "m"): FontSizeScaleKey {
  return normalizeLegacyFontSizeScaleKey(value) ?? normalizeLegacyFontSizeScaleKey(fallback) ?? "m";
}

export function isDisplayTypographyTemplate(templateKey?: string | null) {
  return templateKey?.trim().toLowerCase().startsWith("display_") ?? false;
}

export function normalizeFontSizeScaleKeyForTemplate(
  value: unknown,
  templateKey?: string | null,
  fallback: FontSizeScaleKey = "m"
): FontSizeScaleKey {
  if (!isDisplayTypographyTemplate(templateKey)) return "m";
  return normalizeFontSizeScaleKey(value, fallback);
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function createDefaultTypographyRoleSettings(): TypographyRoleSettings {
  return TYPOGRAPHY_ROLE_KEYS.reduce((settings, role) => {
    settings[role] = {
      font_ko_key: null,
      font_en_key: null,
      color: null,
      size: "inherit",
      weight: "inherit",
    };
    return settings;
  }, {} as TypographyRoleSettings);
}

export function getDefaultTypographyPreset(templateKey?: string | null): TypographySettings {
  const preset = templateKey ? TEMPLATE_TYPOGRAPHY_PRESETS[templateKey] : null;

  return {
    korean_font_key: preset?.korean_font_key ?? getDefaultKoreanFontForTemplate(templateKey).value,
    english_font_key: preset?.english_font_key ?? getDefaultEnglishFontForTemplate(templateKey).value,
    font_size_scale_key: normalizeFontSizeScaleKeyForTemplate(
      preset?.font_size_scale_key ?? DEFAULT_TYPOGRAPHY_PRESET.font_size_scale_key,
      templateKey
    ),
    typography_roles: createDefaultTypographyRoleSettings(),
  };
}

function normalizeKoreanFontKey(value: unknown): KoreanFontKey | null {
  if (isKoreanFontValue(value)) return value;
  if (typeof value === "string") return LEGACY_KOREAN_FONT_KEY_MAP[value] ?? null;
  return null;
}

function normalizeEnglishFontKey(value: unknown): EnglishFontKey | null {
  if (isEnglishFontValue(value)) return value;
  if (typeof value === "string") return LEGACY_ENGLISH_FONT_KEY_MAP[value] ?? null;
  return null;
}

function normalizeTypographyRoleSize(value: unknown): TypographyRoleSizeKey {
  if (typeof value !== "string") return "inherit";
  const normalized = value.trim().toLowerCase();
  return typographyRoleSizeKeys.has(normalized as TypographyRoleSizeKey) ? (normalized as TypographyRoleSizeKey) : "inherit";
}

function normalizeTypographyRoleWeight(value: unknown): TypographyRoleWeightKey {
  if (typeof value !== "string") return "inherit";
  const normalized = value.trim().toLowerCase();
  return typographyRoleWeightKeys.has(normalized as TypographyRoleWeightKey) ? (normalized as TypographyRoleWeightKey) : "inherit";
}

function normalizeTypographyRoleKoreanFontKey(value: unknown): KoreanFontKey | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized === "inherit") return null;
  return isKoreanFontValue(normalized) ? normalized : null;
}

function normalizeTypographyRoleEnglishFontKey(value: unknown, templateKey?: string | null): EnglishFontKey | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized === "inherit") return null;
  if (isEnglishFontValue(normalized)) return getSafeEnglishFontValueForTemplate(templateKey, normalized);
  return null;
}

function normalizeTypographyRoleColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : null;
}

export function normalizeTypographyRoleSettings(value: unknown, templateKey?: string | null): TypographyRoleSettings {
  const defaults = createDefaultTypographyRoleSettings();
  const record = getRecord(value);
  if (!record) return defaults;

  TYPOGRAPHY_ROLE_KEYS.forEach((role) => {
    const rawRole = getRecord(record[role]);
    if (!rawRole) return;
    const legacyFontKey = rawRole.font_key ?? rawRole.fontKey;
    defaults[role] = {
      font_ko_key: normalizeTypographyRoleKoreanFontKey(rawRole.font_ko_key ?? rawRole.fontKoKey) ?? normalizeTypographyRoleKoreanFontKey(legacyFontKey),
      font_en_key:
        normalizeTypographyRoleEnglishFontKey(rawRole.font_en_key ?? rawRole.fontEnKey, templateKey) ??
        normalizeTypographyRoleEnglishFontKey(legacyFontKey, templateKey),
      color: normalizeTypographyRoleColor(rawRole.color),
      size: normalizeTypographyRoleSize(rawRole.size),
      weight: normalizeTypographyRoleWeight(rawRole.weight),
    };
  });

  return defaults;
}

export function hasCustomTypographyRoleSettings(settings: TypographyRoleSettings): boolean {
  return TYPOGRAPHY_ROLE_KEYS.some((role) => {
    const setting = settings[role];
    return Boolean(setting.font_ko_key) || Boolean(setting.font_en_key) || Boolean(setting.color) || setting.size !== "inherit" || setting.weight !== "inherit";
  });
}

export function normalizeTypographySettings(value: unknown): Partial<TypographySettings> | null {
  const record = getRecord(value);
  if (!record) return null;

  const settings: Partial<TypographySettings> = {};

  const koreanFontKey = normalizeKoreanFontKey(record.korean_font_key);
  const englishFontKey = normalizeEnglishFontKey(record.english_font_key);
  if (koreanFontKey) settings.korean_font_key = koreanFontKey;
  if (englishFontKey) settings.english_font_key = englishFontKey;
  if ("font_size_scale_key" in record) settings.font_size_scale_key = normalizeFontSizeScaleKey(record.font_size_scale_key);
  if ("typography_roles" in record) settings.typography_roles = normalizeTypographyRoleSettings(record.typography_roles);
  if ("typographyRoles" in record) settings.typography_roles = normalizeTypographyRoleSettings(record.typographyRoles);

  return Object.keys(settings).length > 0 ? settings : null;
}

export function getCustomTypographySettings(settings: unknown, pageSettings?: unknown): Partial<TypographySettings> | null {
  const settingsRecord = getRecord(settings);
  const pageSettingsRecord = getRecord(pageSettings);
  const designRecord = getRecord(pageSettingsRecord?.design);
  const designKoreanFont = getCustomKoreanFontValue(pageSettings);
  const designEnglishFont = getCustomEnglishFontValue(pageSettings);
  const designFontSizeScale =
    designRecord && "fontSizeScale" in designRecord
      ? normalizeFontSizeScaleKey(designRecord.fontSizeScale)
      : designRecord && "font_size_scale_key" in designRecord
        ? normalizeFontSizeScaleKey(designRecord.font_size_scale_key)
        : null;
  const legacyTypography = normalizeTypographySettings(settingsRecord?.typography) ?? normalizeTypographySettings(pageSettingsRecord?.typography);
  const designTypographyRoles = designRecord
    ? normalizeTypographyRoleSettings(designRecord.typographyRoles ?? designRecord.typography_roles)
    : null;
  const mergedSettings = {
    ...(legacyTypography ?? {}),
    ...(designKoreanFont ? { korean_font_key: designKoreanFont } : {}),
    ...(designEnglishFont ? { english_font_key: designEnglishFont } : {}),
    ...(designFontSizeScale ? { font_size_scale_key: designFontSizeScale } : {}),
    ...(designTypographyRoles && hasCustomTypographyRoleSettings(designTypographyRoles) ? { typography_roles: designTypographyRoles } : {}),
  } satisfies Partial<TypographySettings>;

  return Object.keys(mergedSettings).length > 0 ? mergedSettings : null;
}

export function mergeTypographySettings(templateKey?: string | null, customTypography?: unknown): TypographySettings {
  const defaults = getDefaultTypographyPreset(templateKey);
  const custom = normalizeTypographySettings(customTypography);

  return {
    korean_font_key: custom?.korean_font_key ?? defaults.korean_font_key,
    english_font_key: getSafeEnglishFontValueForTemplate(templateKey, custom?.english_font_key ?? defaults.english_font_key),
    font_size_scale_key: normalizeFontSizeScaleKeyForTemplate(custom?.font_size_scale_key ?? defaults.font_size_scale_key, templateKey),
    typography_roles: normalizeTypographyRoleSettings(custom?.typography_roles ?? defaults.typography_roles, templateKey),
  };
}

export function getFontSizeScaleOptionsForTemplate(templateKey?: string | null) {
  return isDisplayTypographyTemplate(templateKey) ? DISPLAY_FONT_SIZE_SCALE_OPTIONS : FONT_SIZE_SCALE_OPTIONS;
}

export function getFontSizeMultiplier(scaleKey: FontSizeScaleKey, templateKey?: string | null) {
  const normalized = normalizeFontSizeScaleKeyForTemplate(scaleKey, templateKey);
  return getFontSizeScaleOptionsForTemplate(templateKey).find((option) => option.key === normalized)?.scale ?? 1;
}

export function getKoreanFontFamily(fontKey: KoreanFontKey) {
  return getKoreanFontOption(fontKey)?.fontFamily ?? getDefaultKoreanFontForTemplate().fontFamily;
}

export function getKoreanFontLoadAssets(fontKey: KoreanFontKey): FontLoadAssets {
  return getFontLoadAssets(getKoreanFontOption(fontKey) ?? getDefaultKoreanFontForTemplate());
}

export function getEnglishFontFamily(fontKey: EnglishFontKey) {
  return getEnglishFontOption(fontKey)?.fontFamily ?? getDefaultEnglishFontForTemplate().fontFamily;
}

export function getEnglishFontLoadAssets(fontKey: EnglishFontKey): FontLoadAssets {
  return getFontLoadAssets(getEnglishFontOption(fontKey) ?? getDefaultEnglishFontForTemplate());
}

function getTypographyRoleSizeMultiplier(sizeKey: TypographyRoleSizeKey) {
  return TYPOGRAPHY_ROLE_SIZE_OPTIONS.find((option) => option.key === sizeKey)?.scale ?? 1;
}

function getTypographyRoleWeightValue(weightKey: TypographyRoleWeightKey) {
  return TYPOGRAPHY_ROLE_WEIGHT_OPTIONS.find((option) => option.key === weightKey)?.value ?? null;
}

export function getTypographyRoleFontLoadAssets(settings: TypographyRoleSettings): FontLoadAssets[] {
  const assets = new Map<string, FontLoadAssets>();
  TYPOGRAPHY_ROLE_KEYS.forEach((role) => {
    const { font_ko_key: koreanFontKey, font_en_key: englishFontKey } = settings[role];
    if (koreanFontKey) {
      const koreanAsset = getFontLoadAssets(getKoreanFontOption(koreanFontKey) ?? getDefaultKoreanFontForTemplate());
      assets.set(koreanAsset.key, koreanAsset);
    }
    if (englishFontKey) {
      const englishAsset = getFontLoadAssets(getEnglishFontOption(englishFontKey) ?? getDefaultEnglishFontForTemplate());
      assets.set(englishAsset.key, englishAsset);
    }
  });
  return [...assets.values()];
}

export function getTypographyCssVariables(settings: TypographySettings, templateKey?: string | null): CSSProperties {
  const cssVariables: Record<string, string> = {
    "--menu-font-ko": getKoreanFontFamily(settings.korean_font_key),
    "--menu-font-en": getEnglishFontFamily(settings.english_font_key),
    "--menu-font-size-scale": String(getFontSizeMultiplier(settings.font_size_scale_key, templateKey)),
  };

  TYPOGRAPHY_ROLE_KEYS.forEach((role) => {
    const setting = settings.typography_roles[role];
    const cssRoleKey = role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    cssVariables[`--menu-role-${cssRoleKey}-size-scale`] = templateKey === "cafe_design_a" ? "1" : String(getTypographyRoleSizeMultiplier(setting.size));
    if (setting.font_ko_key) cssVariables[`--menu-role-${cssRoleKey}-font-ko`] = getKoreanFontFamily(setting.font_ko_key);
    if (setting.font_en_key) cssVariables[`--menu-role-${cssRoleKey}-font-en`] = getEnglishFontFamily(setting.font_en_key);
    cssVariables[`--menu-role-${cssRoleKey}-font-family`] =
      `var(--menu-role-${cssRoleKey}-font-en, var(--menu-font-en)), var(--menu-role-${cssRoleKey}-font-ko, var(--menu-font-ko)), system-ui, sans-serif`;
    if (setting.color && (role === "brand" || role === "category")) cssVariables[`--menu-role-${cssRoleKey}-color`] = setting.color;
    const weightValue = templateKey === "cafe_design_a" ? null : getTypographyRoleWeightValue(setting.weight);
    if (weightValue) cssVariables[`--menu-role-${cssRoleKey}-font-weight`] = weightValue;
  });

  return cssVariables as CSSProperties;
}
