export type KoreanFontValue =
  | "pretendard"
  | "asta-sans"
  | "gothic-a1"
  | "gowun-batang"
  | "gowun-dodum"
  | "hahmlet"
  | "ibm-plex-sans-kr"
  | "nanum-gothic"
  | "nanum-myeongjo"
  | "noto-sans-kr"
  | "noto-serif-kr"
  | "poor-story"
  | "yeon-sung"
  | "hangulnuri"
  | "cafe24-danjeonghae"
  | "changwon-dangam-rounded"
  | "jeju-gothic"
  | "lotte-mart-dream"
  | "nanum-square";

export type FontOption<Value extends string = string> = {
  label: string;
  value: Value;
  fontFamily: string;
  href?: string;
  cssText?: string;
};

export type KoreanFontOption = FontOption<KoreanFontValue>;

export type EnglishFontValue =
  | "outfit"
  | "inter"
  | "montserrat"
  | "poppins"
  | "playfair-display"
  | "cormorant-garamond"
  | "libre-baskerville"
  | "lora"
  | "dm-sans"
  | "manrope"
  | "roboto";

export type EnglishFontOption = FontOption<EnglishFontValue>;

export type FontLoadAssets = {
  key: string;
  href?: string;
  cssText?: string;
};

export const KOREAN_FONT_OPTIONS = [
  {
    label: "Pretendard",
    value: "pretendard",
    fontFamily: "'Pretendard', sans-serif",
    href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css",
  },
  {
    label: "Asta Sans",
    value: "asta-sans",
    fontFamily: "'Asta Sans', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Asta+Sans&display=swap",
  },
  {
    label: "Gothic A1",
    value: "gothic-a1",
    fontFamily: "'Gothic A1', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;600;700&display=swap",
  },
  {
    label: "Gowun Batang",
    value: "gowun-batang",
    fontFamily: "'Gowun Batang', serif",
    href: "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap",
  },
  {
    label: "Gowun Dodum",
    value: "gowun-dodum",
    fontFamily: "'Gowun Dodum', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap",
  },
  {
    label: "Hahmlet",
    value: "hahmlet",
    fontFamily: "'Hahmlet', serif",
    href: "https://fonts.googleapis.com/css2?family=Hahmlet:wght@400;500;600;700&display=swap",
  },
  {
    label: "IBM Plex Sans KR",
    value: "ibm-plex-sans-kr",
    fontFamily: "'IBM Plex Sans KR', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap",
  },
  {
    label: "Nanum Gothic",
    value: "nanum-gothic",
    fontFamily: "'Nanum Gothic', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap",
  },
  {
    label: "Nanum Myeongjo",
    value: "nanum-myeongjo",
    fontFamily: "'Nanum Myeongjo', serif",
    href: "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap",
  },
  {
    label: "Noto Sans KR",
    value: "noto-sans-kr",
    fontFamily: "'Noto Sans KR', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap",
  },
  {
    label: "Noto Serif KR",
    value: "noto-serif-kr",
    fontFamily: "'Noto Serif KR', serif",
    href: "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&display=swap",
  },
  {
    label: "Poor Story",
    value: "poor-story",
    fontFamily: "'Poor Story', cursive",
    href: "https://fonts.googleapis.com/css2?family=Poor+Story&display=swap",
  },
  {
    label: "Yeon Sung",
    value: "yeon-sung",
    fontFamily: "'Yeon Sung', cursive",
    href: "https://fonts.googleapis.com/css2?family=Yeon+Sung&display=swap",
  },
  {
    label: "Hangulnuri",
    value: "hangulnuri",
    fontFamily: "'Hangulnuri', sans-serif",
    cssText: `@font-face {
  font-family: 'Hangulnuri';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_three@1.0/HangeulNuri-Bold.woff') format('woff');
  font-weight: 700;
  font-display: swap;
}`,
  },
  {
    label: "Cafe24 Danjeonghae",
    value: "cafe24-danjeonghae",
    fontFamily: "'Cafe24Danjeonghae', serif",
    cssText: `@font-face {
  font-family: 'Cafe24Danjeonghae';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_twelve@1.1/Cafe24Danjunghae.woff') format('woff');
  font-weight: 400;
  font-display: swap;
}`,
  },
  {
    label: "Changwon Dangam Rounded",
    value: "changwon-dangam-rounded",
    fontFamily: "'ChangwonDangamRounded', sans-serif",
    cssText: `@font-face {
  font-family: 'ChangwonDangamRounded';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/2511-1@1.0/ChangwonDangamRound-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}`,
  },
  {
    label: "Jeju Gothic",
    value: "jeju-gothic",
    fontFamily: "'Jeju Gothic', sans-serif",
    href: "https://fonts.googleapis.com/earlyaccess/jejugothic.css",
  },
  {
    label: "Lotte Mart Dream",
    value: "lotte-mart-dream",
    fontFamily: "'LotteMartDream', sans-serif",
    cssText: `@font-face {
  font-family: 'LotteMartDream';
  src: url('https://cdn.jsdelivr.net/korean-webfonts/1/corps/lottemart/LotteMartDream/LotteMartDreamLight.woff2') format('woff2'),
       url('https://cdn.jsdelivr.net/korean-webfonts/1/corps/lottemart/LotteMartDream/LotteMartDreamLight.woff') format('woff');
  font-weight: 300;
  font-display: swap;
}
@font-face {
  font-family: 'LotteMartDream';
  src: url('https://cdn.jsdelivr.net/korean-webfonts/1/corps/lottemart/LotteMartDream/LotteMartDreamMedium.woff2') format('woff2'),
       url('https://cdn.jsdelivr.net/korean-webfonts/1/corps/lottemart/LotteMartDream/LotteMartDreamMedium.woff') format('woff');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'LotteMartDream';
  src: url('https://cdn.jsdelivr.net/korean-webfonts/1/corps/lottemart/LotteMartDream/LotteMartDreamBold.woff2') format('woff2'),
       url('https://cdn.jsdelivr.net/korean-webfonts/1/corps/lottemart/LotteMartDream/LotteMartDreamBold.woff') format('woff');
  font-weight: 700;
  font-display: swap;
}`,
  },
  {
    label: "NanumSquare",
    value: "nanum-square",
    fontFamily: "'NanumSquare', sans-serif",
    href: "https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@master/nanumsquare.css",
  },
] as const satisfies readonly KoreanFontOption[];

export const ENGLISH_FONT_OPTIONS = [
  {
    label: "Inter",
    value: "inter",
    fontFamily: "'Inter', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  {
    label: "Montserrat",
    value: "montserrat",
    fontFamily: "'Montserrat', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
  },
  {
    label: "Poppins",
    value: "poppins",
    fontFamily: "'Poppins', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  },
  {
    label: "Playfair Display",
    value: "playfair-display",
    fontFamily: "'Playfair Display', serif",
    href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  },
  {
    label: "Cormorant Garamond",
    value: "cormorant-garamond",
    fontFamily: "'Cormorant Garamond', serif",
    href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap",
  },
  {
    label: "Libre Baskerville",
    value: "libre-baskerville",
    fontFamily: "'Libre Baskerville', serif",
    href: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  },
  {
    label: "Lora",
    value: "lora",
    fontFamily: "'Lora', serif",
    href: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
  },
  {
    label: "DM Sans",
    value: "dm-sans",
    fontFamily: "'DM Sans', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  },
  {
    label: "Manrope",
    value: "manrope",
    fontFamily: "'Manrope', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
  },
  {
    label: "Roboto",
    value: "roboto",
    fontFamily: "'Roboto', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  },
] as const satisfies readonly EnglishFontOption[];

const SYSTEM_ENGLISH_FONT_OPTIONS = [
  {
    label: "Outfit",
    value: "outfit",
    fontFamily: "'Outfit', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap",
  },
] as const satisfies readonly EnglishFontOption[];

export const FALLBACK_KOREAN_FONT_VALUE: KoreanFontValue = "pretendard";
export const FALLBACK_ENGLISH_FONT_VALUE: EnglishFontValue = "outfit";

export const TEMPLATE_DEFAULT_KOREAN_FONTS: Record<string, KoreanFontValue> = {
  cafe_design_a: "pretendard",
  cafe_design_b: "pretendard",
  cafe_design_c: "pretendard",
  fine_dining_design_a: "noto-serif-kr",
  fine_dining_design_b: "noto-serif-kr",
  casual_dining_design_a: "pretendard",
  casual_dining_design_b: "pretendard",
  fast_food_design_a: "noto-sans-kr",
  fast_food_design_b: "noto-sans-kr",
  brunch_design_a: "gowun-batang",
  brunch_design_b: "gowun-batang",
};

export const TEMPLATE_DEFAULT_ENGLISH_FONTS: Record<string, EnglishFontValue> = {
  cafe_design_a: "outfit",
  cafe_design_b: "outfit",
  cafe_design_c: "outfit",
  fine_dining_design_a: "playfair-display",
  fine_dining_design_b: "playfair-display",
  casual_dining_design_a: "manrope",
  casual_dining_design_b: "manrope",
  fast_food_design_a: "montserrat",
  fast_food_design_b: "montserrat",
  brunch_design_a: "lora",
  brunch_design_b: "lora",
};

const koreanFontValues = new Set<KoreanFontValue>(KOREAN_FONT_OPTIONS.map((option) => option.value));
const englishFontValues = new Set<EnglishFontValue>([...ENGLISH_FONT_OPTIONS, ...SYSTEM_ENGLISH_FONT_OPTIONS].map((option) => option.value));

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function isKoreanFontValue(value: unknown): value is KoreanFontValue {
  return typeof value === "string" && koreanFontValues.has(value as KoreanFontValue);
}

export function isEnglishFontValue(value: unknown): value is EnglishFontValue {
  return typeof value === "string" && englishFontValues.has(value as EnglishFontValue);
}

export function getKoreanFontOption(value: unknown): KoreanFontOption | null {
  if (!isKoreanFontValue(value)) return null;
  return KOREAN_FONT_OPTIONS.find((option) => option.value === value) ?? null;
}

export function getEnglishFontOption(value: unknown): EnglishFontOption | null {
  if (!isEnglishFontValue(value)) return null;
  return ENGLISH_FONT_OPTIONS.find((option) => option.value === value) ?? SYSTEM_ENGLISH_FONT_OPTIONS.find((option) => option.value === value) ?? null;
}

export function getDefaultKoreanFontForTemplate(templateKey?: string | null): KoreanFontOption {
  const defaultValue = templateKey ? TEMPLATE_DEFAULT_KOREAN_FONTS[templateKey] : null;
  return getKoreanFontOption(defaultValue) ?? getKoreanFontOption(FALLBACK_KOREAN_FONT_VALUE)!;
}

export function getDefaultEnglishFontForTemplate(templateKey?: string | null): EnglishFontOption {
  const defaultValue = templateKey ? TEMPLATE_DEFAULT_ENGLISH_FONTS[templateKey] : null;
  return getEnglishFontOption(defaultValue) ?? getEnglishFontOption(FALLBACK_ENGLISH_FONT_VALUE)!;
}

export function getCustomKoreanFontValue(pageSettings: unknown): KoreanFontValue | null {
  const pageSettingsRecord = getRecord(pageSettings);
  const designRecord = getRecord(pageSettingsRecord?.design);

  if (isKoreanFontValue(designRecord?.koreanFont)) return designRecord.koreanFont;
  if (isKoreanFontValue(pageSettingsRecord?.koreanFont)) return pageSettingsRecord.koreanFont;

  return null;
}

export function getCustomEnglishFontValue(pageSettings: unknown): EnglishFontValue | null {
  const pageSettingsRecord = getRecord(pageSettings);
  const designRecord = getRecord(pageSettingsRecord?.design);

  if (isEnglishFontValue(designRecord?.englishFont)) return designRecord.englishFont;
  if (isEnglishFontValue(pageSettingsRecord?.englishFont)) return pageSettingsRecord.englishFont;

  return null;
}

export function getResolvedKoreanFont({
  templateKey,
  selectedFont,
  pageSettings,
}: {
  templateKey?: string | null;
  selectedFont?: unknown;
  pageSettings?: unknown;
}): KoreanFontOption {
  return (
    getKoreanFontOption(selectedFont) ??
    getKoreanFontOption(getCustomKoreanFontValue(pageSettings)) ??
    getDefaultKoreanFontForTemplate(templateKey)
  );
}

export function getResolvedEnglishFont({
  templateKey,
  selectedFont,
  pageSettings,
}: {
  templateKey?: string | null;
  selectedFont?: unknown;
  pageSettings?: unknown;
}): EnglishFontOption {
  return (
    getEnglishFontOption(selectedFont) ??
    getEnglishFontOption(getCustomEnglishFontValue(pageSettings)) ??
    getDefaultEnglishFontForTemplate(templateKey)
  );
}

export function getFontLoadAssets(fontOption: FontOption): FontLoadAssets {
  return {
    key: fontOption.value,
    href: fontOption.href,
    cssText: fontOption.cssText,
  };
}
