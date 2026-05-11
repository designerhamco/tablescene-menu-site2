import type { CSSProperties } from "react";

export type KoreanFontKey = "default_ko" | "clean_gothic_ko" | "soft_gothic_ko" | "emotional_serif_ko" | "modern_gothic_ko";
export type EnglishFontKey = "default_en" | "modern_sans_en" | "classic_serif_en" | "clean_grotesk_en" | "elegant_serif_en";
export type FontSizeScaleKey = "s" | "m" | "l";

export type TypographySettings = {
  korean_font_key: KoreanFontKey;
  english_font_key: EnglishFontKey;
  font_size_scale_key: FontSizeScaleKey;
};

export type FontOption<Key extends string> = {
  key: Key;
  label: string;
  sample: string;
  fontFamily: string;
};

export const KOREAN_FONT_OPTIONS: readonly FontOption<KoreanFontKey>[] = [
  {
    key: "default_ko",
    label: "기본 한글",
    sample: "아메리카노 4,500",
    fontFamily: "\"Pretendard\", \"Noto Sans KR\", system-ui, sans-serif",
  },
  {
    key: "clean_gothic_ko",
    label: "깔끔한 고딕",
    sample: "아메리카노 4,500",
    fontFamily: "\"Pretendard\", \"Noto Sans KR\", Arial, sans-serif",
  },
  {
    key: "soft_gothic_ko",
    label: "부드러운 고딕",
    sample: "아메리카노 4,500",
    fontFamily: "\"Noto Sans KR\", \"Pretendard\", system-ui, sans-serif",
  },
  {
    key: "emotional_serif_ko",
    label: "감성 명조",
    sample: "아메리카노 4,500",
    fontFamily: "\"Noto Serif KR\", \"Batang\", \"AppleMyungjo\", serif",
  },
  {
    key: "modern_gothic_ko",
    label: "모던 고딕",
    sample: "아메리카노 4,500",
    fontFamily: "\"Outfit\", \"Pretendard\", \"Noto Sans KR\", system-ui, sans-serif",
  },
];

export const ENGLISH_FONT_OPTIONS: readonly FontOption<EnglishFontKey>[] = [
  {
    key: "default_en",
    label: "기본 영문",
    sample: "Signature Coffee",
    fontFamily: "\"Outfit\", system-ui, sans-serif",
  },
  {
    key: "modern_sans_en",
    label: "Modern Sans",
    sample: "Signature Coffee",
    fontFamily: "\"Outfit\", \"Pretendard\", system-ui, sans-serif",
  },
  {
    key: "classic_serif_en",
    label: "Classic Serif",
    sample: "Signature Coffee",
    fontFamily: "Georgia, \"Times New Roman\", serif",
  },
  {
    key: "clean_grotesk_en",
    label: "Clean Grotesk",
    sample: "Signature Coffee",
    fontFamily: "Arial, Helvetica, \"Outfit\", sans-serif",
  },
  {
    key: "elegant_serif_en",
    label: "Elegant Serif",
    sample: "Signature Coffee",
    fontFamily: "\"Times New Roman\", Georgia, serif",
  },
];

export const FONT_SIZE_SCALE_OPTIONS = [
  { key: "s", label: "S", description: "조금 작게", scale: 0.92 },
  { key: "m", label: "M", description: "기본", scale: 1 },
  { key: "l", label: "L", description: "조금 크게", scale: 1.1 },
] as const satisfies readonly { key: FontSizeScaleKey; label: string; description: string; scale: number }[];

export const DEFAULT_TYPOGRAPHY_PRESET: TypographySettings = {
  korean_font_key: "default_ko",
  english_font_key: "default_en",
  font_size_scale_key: "m",
};

export const TEMPLATE_TYPOGRAPHY_PRESETS: Record<string, Partial<TypographySettings>> = {
  cafe_design_a: {
    korean_font_key: "modern_gothic_ko",
    english_font_key: "modern_sans_en",
    font_size_scale_key: "m",
  },
  cafe_design_b: {
    korean_font_key: "soft_gothic_ko",
    english_font_key: "modern_sans_en",
    font_size_scale_key: "m",
  },
  cafe_design_c: {
    korean_font_key: "modern_gothic_ko",
    english_font_key: "modern_sans_en",
    font_size_scale_key: "m",
  },
  fine_dining_design_a: {
    korean_font_key: "emotional_serif_ko",
    english_font_key: "elegant_serif_en",
    font_size_scale_key: "m",
  },
  fast_food_design_a: {
    korean_font_key: "clean_gothic_ko",
    english_font_key: "clean_grotesk_en",
    font_size_scale_key: "s",
  },
};

const koreanFontKeys = new Set<KoreanFontKey>(KOREAN_FONT_OPTIONS.map((option) => option.key));
const englishFontKeys = new Set<EnglishFontKey>(ENGLISH_FONT_OPTIONS.map((option) => option.key));
const fontSizeScaleKeys = new Set<FontSizeScaleKey>(FONT_SIZE_SCALE_OPTIONS.map((option) => option.key));

function isKoreanFontKey(value: unknown): value is KoreanFontKey {
  return typeof value === "string" && koreanFontKeys.has(value as KoreanFontKey);
}

function isEnglishFontKey(value: unknown): value is EnglishFontKey {
  return typeof value === "string" && englishFontKeys.has(value as EnglishFontKey);
}

export function isFontSizeScaleKey(value: unknown): value is FontSizeScaleKey {
  return typeof value === "string" && fontSizeScaleKeys.has(value as FontSizeScaleKey);
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function getDefaultTypographyPreset(templateKey?: string | null): TypographySettings {
  const preset = templateKey ? TEMPLATE_TYPOGRAPHY_PRESETS[templateKey] : null;

  return {
    korean_font_key: preset?.korean_font_key ?? DEFAULT_TYPOGRAPHY_PRESET.korean_font_key,
    english_font_key: preset?.english_font_key ?? DEFAULT_TYPOGRAPHY_PRESET.english_font_key,
    font_size_scale_key: preset?.font_size_scale_key ?? DEFAULT_TYPOGRAPHY_PRESET.font_size_scale_key,
  };
}

export function normalizeTypographySettings(value: unknown): Partial<TypographySettings> | null {
  const record = getRecord(value);
  if (!record) return null;

  const settings: Partial<TypographySettings> = {};

  if (isKoreanFontKey(record.korean_font_key)) settings.korean_font_key = record.korean_font_key;
  if (isEnglishFontKey(record.english_font_key)) settings.english_font_key = record.english_font_key;
  if (isFontSizeScaleKey(record.font_size_scale_key)) settings.font_size_scale_key = record.font_size_scale_key;

  return Object.keys(settings).length > 0 ? settings : null;
}

export function getCustomTypographySettings(settings: unknown, pageSettings?: unknown): Partial<TypographySettings> | null {
  const settingsRecord = getRecord(settings);
  const pageSettingsRecord = getRecord(pageSettings);

  return normalizeTypographySettings(settingsRecord?.typography) ?? normalizeTypographySettings(pageSettingsRecord?.typography);
}

export function mergeTypographySettings(templateKey?: string | null, customTypography?: unknown): TypographySettings {
  const defaults = getDefaultTypographyPreset(templateKey);
  const custom = normalizeTypographySettings(customTypography);

  return {
    korean_font_key: custom?.korean_font_key ?? defaults.korean_font_key,
    english_font_key: custom?.english_font_key ?? defaults.english_font_key,
    font_size_scale_key: custom?.font_size_scale_key ?? defaults.font_size_scale_key,
  };
}

export function getFontSizeMultiplier(scaleKey: FontSizeScaleKey) {
  return FONT_SIZE_SCALE_OPTIONS.find((option) => option.key === scaleKey)?.scale ?? 1;
}

export function getKoreanFontFamily(fontKey: KoreanFontKey) {
  return KOREAN_FONT_OPTIONS.find((option) => option.key === fontKey)?.fontFamily ?? KOREAN_FONT_OPTIONS[0].fontFamily;
}

export function getEnglishFontFamily(fontKey: EnglishFontKey) {
  return ENGLISH_FONT_OPTIONS.find((option) => option.key === fontKey)?.fontFamily ?? ENGLISH_FONT_OPTIONS[0].fontFamily;
}

export function getTypographyCssVariables(settings: TypographySettings): CSSProperties {
  return {
    "--menu-font-ko": getKoreanFontFamily(settings.korean_font_key),
    "--menu-font-en": getEnglishFontFamily(settings.english_font_key),
    "--menu-font-size-scale": String(getFontSizeMultiplier(settings.font_size_scale_key)),
  } as CSSProperties;
}
