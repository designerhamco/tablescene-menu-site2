/** Local QA inventory: the active single-page starters that share canvas fitting. */
export const ONE_PAGE_QA_TEMPLATES = [
  { key: "cafe_design_a", name: "REAL MATCHA" },
  { key: "cafe_kohi_a", name: "KOHI" },
  { key: "cafe_mocha_forest_a", name: "모카 포레스트" },
  { key: "cafe_sunday_line_a", name: "선데이 로스터스" },
  { key: "cafe_van_gogh_a", name: "Van Gogh" },
  { key: "cafe_round_focus_a", name: "ROSY ORANGE" },
  { key: "fast_food_loop_bagel_a", name: "LOOP BAGEL" },
  { key: "restaurant_onue_a", name: "ONUE TABLE" },
] as const;

export const ONE_PAGE_QA_VIEWPORTS = [
  { name: "PC · 1512×762", device: "pc", width: 1512, height: 762 },
  { name: "PC · 1920×1080", device: "pc", width: 1920, height: 1080 },
  { name: "태블릿 가로 · 1180×820", device: "tablet", width: 1180, height: 820 },
  { name: "태블릿 가로 · 1024×768", device: "tablet", width: 1024, height: 768 },
  { name: "태블릿 세로 · 820×1180", device: "tablet", width: 820, height: 1180 },
  { name: "모바일 · 390×844", device: "mobile", width: 390, height: 844 },
] as const;

export function getOnePageQaPreviewUrl(key: string, device: string, call: boolean, locale = "ko", mode = "orderedFit") {
  const query = new URLSearchParams({ device, view: "actual", embedded: "1", layoutMode: mode, callPreview: call ? "on" : "off", lang: locale });
  return `/templates/${key}/preview?${query}`;
}
