import type { TemplateCategoryKey } from "./templates";

export const CATALOG_MOODS = [
  { key: "all", label: "전체 분위기" },
  { key: "lively", label: "발랄한" },
  { key: "elegant", label: "고급스러운" },
  { key: "cozy", label: "코지한" },
  { key: "minimal", label: "미니멀한" },
  { key: "vintage", label: "빈티지한" },
  { key: "modern", label: "모던한" },
] as const;

export const CATALOG_COLORS = [
  { key: "all", label: "전체 색상", swatch: null },
  { key: "red", label: "빨간색", swatch: "#B83240" },
  { key: "orange", label: "주황색", swatch: "#ED792E" },
  { key: "yellow", label: "노란색", swatch: "#EBCB42" },
  { key: "green", label: "초록색", swatch: "#50845B" },
  { key: "blue", label: "파란색", swatch: "#4354EF" },
  { key: "purple", label: "보라색", swatch: "#8C62B0" },
  { key: "pink", label: "분홍색", swatch: "#DF8FA9" },
  { key: "brown", label: "갈색", swatch: "#795548" },
  { key: "beige", label: "베이지색", swatch: "#D7C6A6" },
  { key: "black", label: "검정색", swatch: "#252525" },
  { key: "white", label: "흰색", swatch: "#FFFFFF" },
  { key: "gray", label: "회색", swatch: "#9A9A9A" },
] as const;

export type CatalogMoodFilter = typeof CATALOG_MOODS[number]["key"];
export type CatalogColorFilter = typeof CATALOG_COLORS[number]["key"];
export type CatalogThumbnailSize = "large" | "small";
export const CATALOG_DEFAULT_THUMBNAIL_SIZE: CatalogThumbnailSize = "small";
export type CatalogFacets = {
  industries?: readonly TemplateCategoryKey[];
  searchNames?: readonly string[];
  moods: readonly Exclude<CatalogMoodFilter, "all">[];
  colors: readonly Exclude<CatalogColorFilter, "all">[];
};

// Editorial discovery tags describe the default menu artwork, not mockup photos
// or customer-edited colors. Register tags here when adding a designer template.
const designerFacets: Readonly<Record<string, CatalogFacets>> = {
  cafe_design_a: { moods: ["lively", "modern"], colors: ["green", "white"] },
  cafe_mocha_forest_a: { moods: ["cozy", "vintage"], colors: ["red", "yellow"] },
  cafe_sunday_line_a: { searchNames: ["mello crema", "멜로 크레마"], moods: ["cozy", "vintage"], colors: ["blue", "white"] },
  cafe_van_gogh_a: { moods: ["minimal", "modern"], colors: ["black", "white"] },
  restaurant_onue_a: { searchNames: ["ONUE TABLE"], moods: ["cozy", "elegant"], colors: ["brown", "beige", "white"] },
  cafe_round_focus_a: { moods: ["lively", "modern"], colors: ["orange", "white"] },
  fast_food_loop_bagel_a: { searchNames: ["LOOP BAGEL"], moods: ["lively", "vintage"], colors: ["blue", "white"] },
  dining_aube_table_a: { searchNames: ["AUBE TABLE"], moods: ["elegant", "minimal"], colors: ["blue", "white"] },
  dining_aube_table_b: { searchNames: ["MAISON MARE"], moods: ["elegant", "modern"], colors: ["red", "beige"] },
  display_menu_a: { searchNames: ["SUMMER BLUE"], industries: ["cafe", "bakery", "dessert"], moods: ["lively", "modern"], colors: ["blue", "yellow"] },
};
const standardFacets: CatalogFacets = { moods: ["minimal", "modern"], colors: ["black", "white"] };

export function getCatalogFacets(templateKey: string, kind: "standard" | "designer"): CatalogFacets {
  return kind === "standard" ? standardFacets : designerFacets[templateKey] ?? { moods: [], colors: [] };
}
export function normalizeCatalogMood(value: unknown): CatalogMoodFilter {
  return CATALOG_MOODS.find(item => item.key === value)?.key ?? "all";
}
export function normalizeCatalogColor(value: unknown): CatalogColorFilter {
  return CATALOG_COLORS.find(item => item.key === value)?.key ?? "all";
}
export function normalizeCatalogThumbnailSize(value: unknown, isMobile = false): CatalogThumbnailSize {
  if (value === "small" || value === "large") return value;
  return isMobile ? "large" : CATALOG_DEFAULT_THUMBNAIL_SIZE;
}
export function normalizeCatalogSearch(value: unknown) {
  return typeof value === "string" ? value.slice(0, 100).normalize("NFKC").toLowerCase().replace(/\s+/g, "") : "";
}

/** Canonical option order keeps repeated/CSV URL values stable and deduplicated. */
export function normalizeCatalogSelections<T extends string>(value: unknown, options: readonly { key: T }[]): Exclude<T, "all">[] {
  const values = (Array.isArray(value) ? value : [value]).flatMap(item => typeof item === "string" ? item.split(",") : []);
  return options.map(option => option.key).filter((key): key is Exclude<T, "all"> => key !== "all" && values.includes(key));
}
