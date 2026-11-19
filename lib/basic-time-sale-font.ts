import {
  getDefaultKoreanFontForTemplate,
  getKoreanFontOption,
  type FontLoadAssets,
  type KoreanFontValue,
} from "./font-options";

// Maximum upright weights provided by the registered Korean font families.
// Sources are Google Fonts ofl/<family>/METADATA.pb and the CDN @font-face
// definitions registered in font-options.ts.
const MAX_WEIGHTS: Record<KoreanFontValue, number> = {
  pretendard: 900,
  "asta-sans": 800,
  "gothic-a1": 900,
  "gowun-batang": 700,
  "gowun-dodum": 400,
  hahmlet: 900,
  "ibm-plex-sans-kr": 700,
  "nanum-gothic": 800,
  "nanum-myeongjo": 800,
  "noto-sans-kr": 900,
  "noto-serif-kr": 900,
  "poor-story": 400,
  "yeon-sung": 400,
  hangulnuri: 700,
  "cafe24-danjeonghae": 400,
  "changwon-dangam-rounded": 400,
  "jeju-gothic": 400,
  "lotte-mart-dream": 700,
  "nanum-square": 800,
};

// These families need a face beyond the weights in their ordinary asset.
// Separate family names keep the extra face specific to promotion copy.
const EXTRA_FACE_FONTS: readonly KoreanFontValue[] = [
  "asta-sans", "gothic-a1", "hahmlet", "noto-sans-kr", "noto-serif-kr",
];

export function getBasicTimeSaleFont(fontKey: KoreanFontValue) {
  const font = getKoreanFontOption(fontKey) ?? getDefaultKoreanFontForTemplate();
  const weight = MAX_WEIGHTS[font.value];
  const extraFace = EXTRA_FACE_FONTS.includes(font.value);
  const family = extraFace
    ? `"ArtiMenuTimeSale-${font.value}", ${font.fontFamily}`
    : font.fontFamily;
  const asset: FontLoadAssets | null = extraFace ? {
    key: `time-sale-${font.value}`,
    href: `/fonts/time-sale/${font.value}-${weight}.css`,
  } : null;
  return { weight, family, asset };
}
