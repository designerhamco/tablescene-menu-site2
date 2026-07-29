export type FontCategoryKey = "modern" | "classic" | "handwriting" | "retro";

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
  category: FontCategoryKey;
  fontFamily: string;
  href?: string;
  cssText?: string;
};

export type KoreanFontOption = FontOption<KoreanFontValue>;

export type EnglishFontValue = string;

export type EnglishFontOption = FontOption<EnglishFontValue>;

export type FontLoadAssets = {
  key: string;
  href?: string;
  cssText?: string;
};

export const KOREAN_FONT_CATEGORY_OPTIONS = [
  { key: "modern", label: "모던 / 고딕체" },
  { key: "classic", label: "클래식 / 명조체" },
  { key: "handwriting", label: "필기체" },
  { key: "retro", label: "레트로 / 개성형" },
] as const satisfies readonly { key: FontCategoryKey; label: string }[];

export const ENGLISH_FONT_CATEGORY_OPTIONS = [
  { key: "modern", label: "모던 / 고딕체" },
  { key: "classic", label: "클래식 / 세리프" },
  { key: "handwriting", label: "필기체" },
  { key: "retro", label: "레트로 / 개성형" },
] as const satisfies readonly { key: FontCategoryKey; label: string }[];

function toFontValue(label: string): EnglishFontValue {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getGoogleFontHref(label: string) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(label).replace(/%20/g, "+")}&display=swap`;
}

function getGoogleFontFamily(label: string, fallback: "sans-serif" | "serif" | "cursive" | "monospace" = "sans-serif") {
  return `'${label}', ${fallback}`;
}

function googleEnglishFont(
  label: string,
  category: FontCategoryKey,
  fallback: "sans-serif" | "serif" | "cursive" | "monospace" = "sans-serif"
): EnglishFontOption {
  return {
    label,
    value: toFontValue(label),
    category,
    fontFamily: getGoogleFontFamily(label, fallback),
    href: getGoogleFontHref(label),
  };
}

export const KOREAN_FONT_OPTIONS = [
  {
    label: "Pretendard",
    value: "pretendard",
    category: "modern",
    fontFamily: "'Pretendard', sans-serif",
    href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css",
  },
  {
    label: "Asta Sans",
    value: "asta-sans",
    category: "modern",
    fontFamily: "'Asta Sans', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Asta+Sans&display=swap",
  },
  {
    label: "Gothic A1",
    value: "gothic-a1",
    category: "modern",
    fontFamily: "'Gothic A1', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@400;500;600;700&display=swap",
  },
  {
    label: "Gowun Batang",
    value: "gowun-batang",
    category: "classic",
    fontFamily: "'Gowun Batang', serif",
    href: "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap",
  },
  {
    label: "Gowun Dodum",
    value: "gowun-dodum",
    category: "modern",
    fontFamily: "'Gowun Dodum', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap",
  },
  {
    label: "Hahmlet",
    value: "hahmlet",
    category: "classic",
    fontFamily: "'Hahmlet', serif",
    href: "https://fonts.googleapis.com/css2?family=Hahmlet:wght@400;500;600;700&display=swap",
  },
  {
    label: "IBM Plex Sans KR",
    value: "ibm-plex-sans-kr",
    category: "modern",
    fontFamily: "'IBM Plex Sans KR', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap",
  },
  {
    label: "Nanum Gothic",
    value: "nanum-gothic",
    category: "modern",
    fontFamily: "'Nanum Gothic', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap",
  },
  {
    label: "Nanum Myeongjo",
    value: "nanum-myeongjo",
    category: "classic",
    fontFamily: "'Nanum Myeongjo', serif",
    href: "https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap",
  },
  {
    label: "Noto Sans KR",
    value: "noto-sans-kr",
    category: "modern",
    fontFamily: "'Noto Sans KR', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap",
  },
  {
    label: "Noto Serif KR",
    value: "noto-serif-kr",
    category: "classic",
    fontFamily: "'Noto Serif KR', serif",
    href: "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&display=swap",
  },
  {
    label: "Poor Story",
    value: "poor-story",
    category: "handwriting",
    fontFamily: "'Poor Story', cursive",
    href: "https://fonts.googleapis.com/css2?family=Poor+Story&display=swap",
  },
  {
    label: "Yeon Sung",
    value: "yeon-sung",
    category: "handwriting",
    fontFamily: "'Yeon Sung', cursive",
    href: "https://fonts.googleapis.com/css2?family=Yeon+Sung&display=swap",
  },
  {
    label: "Hangulnuri",
    value: "hangulnuri",
    category: "retro",
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
    category: "classic",
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
    category: "retro",
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
    category: "modern",
    fontFamily: "'Jeju Gothic', sans-serif",
    href: "https://fonts.googleapis.com/earlyaccess/jejugothic.css",
  },
  {
    label: "Lotte Mart Dream",
    value: "lotte-mart-dream",
    category: "retro",
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
    category: "modern",
    fontFamily: "'NanumSquare', sans-serif",
    href: "https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@master/nanumsquare.css",
  },
] as const satisfies readonly KoreanFontOption[];

const MODERN_ENGLISH_FONT_LABELS = [
  "Afacad",
  "Alata",
  "Albert Sans",
  "Cabin",
  "Capriola",
  "Carme",
  "DM Sans",
  "Encode Sans Expanded",
  "Figtree",
  "Hepta Slab",
  "Inter",
  "KoHo",
  "Libertinus Sans",
  "Manrope",
  "Montserrat",
  "Oswald",
  "Outfit",
  "PT Sans",
  "Poppins",
  "Proza Libre",
  "Roboto",
  "TASA Explorer",
  "Teachers",
  "Tomorrow",
  "Unbounded",
  "Urbanist",
  "Viga",
  "Wix Madefor Display",
  "Wix Madefor Text",
  "Yaldevi",
  "Ysabeau Office",
] as const;

const CLASSIC_ENGLISH_FONT_LABELS = [
  "Aboreto",
  "Belleza",
  "Caudex",
  "Castoro Titling",
  "Cinzel",
  "Cormorant Garamond",
  "Cormorant Infant",
  "EB Garamond",
  "Federant",
  "Federo",
  "Forum",
  "Gotu",
  "Italiana",
  "Julius Sans One",
  "Junge",
  "Lancelot",
  "Libre Baskerville",
  "Lora",
  "Marcellus",
  "Philosopher",
  "Playfair Display",
  "Tenor Sans",
  "Uncial Antiqua",
  "Yeseva One",
] as const;

const HANDWRITING_ENGLISH_FONT_LABELS = [
  "Bellota Text",
  "Caveat Brush",
  "Delius",
  "Delius Unicase",
  "Edu SA Hand",
  "Edu VIC WA NT Hand Pre",
  "Handlee",
  "Kalam",
  "Klee One",
  "Lemonada",
  "Lumanosimo",
  "Playpen Sans Hebrew",
  "Playwrite AU VIC",
  "Rock Salt",
  "Schoolbell",
  "Shadows Into Light Two",
  "Tillana",
  "Walter Turncoat",
  "Winky Rough",
  "Winky Sans",
] as const;

const RETRO_ENGLISH_FONT_LABELS = [
  "Bevan",
  "Bigshot One",
  "Bitcount Prop Single",
  "Black Ops One",
  "Boldonse",
  "Bpmf Iansui",
  "Caesar Dressing",
  "Cagliostro",
  "Cause",
  "Chelsea Market",
  "Cutive Mono",
  "Darumadrop One",
  "Denk One",
  "Expletus Sans",
  "Fahkwang",
  "Finger Paint",
  "Geom",
  "Happy Monkey",
  "Iansui",
  "Kite One",
  "Kranky",
  "LXGW WenKai TC",
  "Lacquer",
  "Lakki Reddy",
  "Lemon",
  "Mogra",
  "Paprika",
  "Passero One",
  "Poiret One",
  "Pompiere",
  "Racing Sans One",
  "Reggae One",
  "Ribeye",
  "Ribeye Marrow",
  "RocknRoll One",
  "Stick",
  "Tilt Warp",
  "Trade Winds",
  "Triodion",
  "Tsukimi Rounded",
  "VT323",
  "Vast Shadow",
  "Wellfleet",
] as const;

function dedupeFontOptions<Value extends string>(options: readonly FontOption<Value>[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}

export const ENGLISH_FONT_OPTIONS = dedupeFontOptions([
  ...MODERN_ENGLISH_FONT_LABELS.map((label) => googleEnglishFont(label, "modern", "sans-serif")),
  ...CLASSIC_ENGLISH_FONT_LABELS.map((label) => googleEnglishFont(label, "classic", "serif")),
  ...HANDWRITING_ENGLISH_FONT_LABELS.map((label) => googleEnglishFont(label, "handwriting", "cursive")),
  ...RETRO_ENGLISH_FONT_LABELS.map((label) => googleEnglishFont(label, "retro", label === "Cutive Mono" || label === "VT323" ? "monospace" : "sans-serif")),
] as const satisfies readonly EnglishFontOption[]);

const CAFE_NOIR_A_SAFE_ENGLISH_FONT_VALUES = [
  "ysabeau-office",
  "yaldevi",
  "wix-madefor-text",
  "wix-madefor-display",
  "winky-sans",
  "winky-rough",
  "walter-turncoat",
  "viga",
  "vt323",
  "urbanist",
  "triodion",
  "tomorrow",
  "tilt-warp",
  "tillana",
  "teachers",
  "tasa-explorer",
  "stick",
  "shadows-into-light-two",
  "schoolbell",
  "racing-sans-one",
  "pompiere",
  "poppins",
  "poiret-one",
  "philosopher",
  "passero-one",
  "pt-sans",
  "outfit",
  "oswald",
  "mogra",
  "marcellus",
  "libertinus-sans",
  "lancelot",
  "lxgw-wenkai-tc",
  "koho",
  "klee-one",
  "kite-one",
  "italiana",
  "iansui",
  "happy-monkey",
  "geom",
  "forum",
  "finger-paint",
  "figtree",
  "federo",
  "federant",
  "eb-garamond",
  "denk-one",
  "delius",
  "darumadrop-one",
  "cutive-mono",
  "cormorant-infant",
  "chelsea-market",
  "caveat-brush",
  "cause",
  "carme",
  "caesar-dressing",
  "cabin",
  "bpmf-iansui",
  "bitcount-prop-single",
  "bigshot-one",
  "bellota-text",
  "belleza",
  "albert-sans",
  "alata",
  "afacad",
  "aboreto",
] as const satisfies readonly EnglishFontValue[];

const CAFE_DESIGN_A_HIDDEN_ENGLISH_FONT_VALUES = [
  "lakki-reddy",
  "playwrite-au-vic",
  "boldonse",
  "edu-sa-hand",
  "edu-vic-wa-nt-hand-pre",
  "rock-salt",
] as const satisfies readonly EnglishFontValue[];

const TEMPLATE_ENGLISH_FONT_ALLOWLISTS: Record<string, readonly EnglishFontValue[]> = {
  cafe_noir_a: CAFE_NOIR_A_SAFE_ENGLISH_FONT_VALUES,
};

const TEMPLATE_ENGLISH_FONT_HIDDEN_OPTIONS: Record<string, readonly EnglishFontValue[]> = {
  cafe_design_a: CAFE_DESIGN_A_HIDDEN_ENGLISH_FONT_VALUES,
  cafe_mocha_forest_a: CAFE_DESIGN_A_HIDDEN_ENGLISH_FONT_VALUES,
};

const SYSTEM_ENGLISH_FONT_OPTIONS = [
  {
    label: "Outfit",
    value: "outfit",
    category: "modern",
    fontFamily: "'Outfit', sans-serif",
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap",
  },
] as const satisfies readonly EnglishFontOption[];

export const FALLBACK_KOREAN_FONT_VALUE: KoreanFontValue = "pretendard";
export const FALLBACK_ENGLISH_FONT_VALUE: EnglishFontValue = "outfit";

export const TEMPLATE_DEFAULT_KOREAN_FONTS: Record<string, KoreanFontValue> = {
  cafe_design_a: "pretendard",
  cafe_mocha_forest_a: "pretendard",
  cafe_noir_a: "pretendard",
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
  cafe_design_a: "alata",
  cafe_mocha_forest_a: "alata",
  cafe_noir_a: "cutive-mono",
  cafe_design_b: "outfit",
  cafe_design_c: "outfit",
  display_menu_a: "alata",
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

function getTemplateEnglishFontAllowlist(templateKey?: string | null): readonly EnglishFontValue[] | null {
  return templateKey ? TEMPLATE_ENGLISH_FONT_ALLOWLISTS[templateKey] ?? null : null;
}

function getTemplateHiddenEnglishFontOptions(templateKey?: string | null): readonly EnglishFontValue[] {
  return templateKey ? TEMPLATE_ENGLISH_FONT_HIDDEN_OPTIONS[templateKey] ?? [] : [];
}

export function getAvailableEnglishFontsForTemplate(templateKey?: string | null): readonly EnglishFontOption[] {
  const allowlist = getTemplateEnglishFontAllowlist(templateKey);
  const hiddenOptions = getTemplateHiddenEnglishFontOptions(templateKey);
  const hiddenValues = hiddenOptions.length > 0 ? new Set(hiddenOptions) : null;
  if (!allowlist) return hiddenValues ? ENGLISH_FONT_OPTIONS.filter((option) => !hiddenValues.has(option.value)) : ENGLISH_FONT_OPTIONS;

  const safeValues = new Set(allowlist);
  return ENGLISH_FONT_OPTIONS.filter((option) => safeValues.has(option.value) && !hiddenValues?.has(option.value));
}

export function getSafeEnglishFontValueForTemplate(templateKey?: string | null, value?: unknown): EnglishFontValue {
  const allowlist = getTemplateEnglishFontAllowlist(templateKey);
  const fallback = getDefaultEnglishFontForTemplate(templateKey).value;
  const normalizedFallback = allowlist?.includes(fallback) ? fallback : "cutive-mono";

  if (!isEnglishFontValue(value)) return normalizedFallback;
  if (!allowlist) return value;

  return allowlist.includes(value) ? value : normalizedFallback;
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
