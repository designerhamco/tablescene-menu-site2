import { normalizeBackgroundColor } from "./template-background-colors";
import { menuSurfaceRecord } from "./menu-design-surfaces";
import { menuColorContrast } from "./menu-interaction-theme";

export const MENU_TEXT_COLOR_GROUPS = ["brand", "representative", "pageTitle", "category", "sectionDescription", "product", "price", "supporting", "information"] as const;
export type MenuTextColorGroup = typeof MENU_TEXT_COLOR_GROUPS[number];
export type MenuTextColors = Partial<Record<MenuTextColorGroup, string>>;
/** Dining owns page titles and shared section descriptions; Basic keeps its six groups. */
export function getMenuTextColorGroups(dining = false): readonly MenuTextColorGroup[] {
  return dining ? MENU_TEXT_COLOR_GROUPS : MENU_TEXT_COLOR_GROUPS.filter(group => group !== "pageTitle" && group !== "sectionDescription" && group !== "price");
}
/** Native fallbacks shared by the editor and preview when a page is unmounted. */
export function getDiningTextColorDefaults(templateKey?: string | null, neutral = false) {
  return { pageTitle: neutral ? "#191C1B" : templateKey === "dining_aube_table_b" ? "#A66D52" : "#C5A165",
    price: neutral ? "#191C1B" : templateKey === "dining_aube_table_b" ? "#A66D52" : "#C5A165",
    sectionDescription: templateKey === "dining_aube_table_b" ? "#756B68" : "#72757D" };
}
export const MENU_TEXT_COLOR_LABELS: Record<MenuTextColorGroup, string> = {
  price: "가격·가격 안내", pageTitle: "페이지 제목", sectionDescription: "페이지·카테고리 설명", brand: "가게명", category: "카테고리명", product: "메뉴 기본정보", representative: "가게 설명·안내", supporting: "메뉴 설명", information: "하단 안내·위젯",
};
export const MENU_TEXT_COLOR_DESCRIPTIONS: Record<MenuTextColorGroup, string> = {
  price: "코스 가격·메뉴 가격·가격 옵션·코스 가격 안내",
  pageTitle: "본문 페이지 제목·주문 및 호출 강조색",
  sectionDescription: "페이지 제목 아래 설명·카테고리 설명",
  brand: "가게명",
  category: "카테고리명·카테고리설명·카테고리 장식·가격 옵션명",
  product: "상품명·판매가격·가격설명",
  representative: "가게설명·대표영역 안내사항",
  supporting: "보조언어명·상품설명",
  information: "메뉴영역 안내사항·위젯텍스트",
};
/** Dining has no menu-footer notice group; its notices belong to the cover. */
export function getMenuTextColorLabel(group: MenuTextColorGroup, dining = false): string {
  return dining && group === "information" ? "위젯" : dining && group === "product" ? "상품명" : MENU_TEXT_COLOR_LABELS[group];
}

export function getMenuTextColorDescription(group: MenuTextColorGroup, dining = false): string {
  if (dining && group === "information") return "위젯텍스트";
  if (dining && group === "category") return "카테고리명·카테고리 장식·가격 옵션명";
  if (dining && group === "product") return "상품명·코스/아이템 담기 아이콘";
  if (dining && group === "supporting") return "보조언어명·상품설명·코스 설명";
  if (dining && group === "sectionDescription") return "페이지 제목 아래 설명·일반 카테고리 설명";
  if (dining && group === "representative") return "커버설명·커버 안내사항";
  return MENU_TEXT_COLOR_DESCRIPTIONS[group];
}

export function normalizeMenuTextColors(value: unknown): MenuTextColors {
  const raw = menuSurfaceRecord(value), result: MenuTextColors = {};
  for (const group of MENU_TEXT_COLOR_GROUPS) {
    const color = normalizeBackgroundColor(raw[group]);
    if (color) result[group] = color;
  }
  return result;
}
export function readMenuTextColors(pageSettings: unknown): MenuTextColors {
  return normalizeMenuTextColors(menuSurfaceRecord(menuSurfaceRecord(pageSettings).design).textColors);
}
/** Preserve the former combined color on saved menus/old preview URLs until edited. */
export function resolvedMenuTextColors(pageSettings: unknown, dining = false): MenuTextColors {
  const colors = readMenuTextColors(pageSettings);
  const design = menuSurfaceRecord(menuSurfaceRecord(pageSettings).design);
  const resolved = colors.information || design.textColorGroupsVersion === 2 || !colors.supporting
    ? colors : { ...colors, information: colors.supporting };
  // Freeze former combined title ink on the first new editor/preview edit.
  // The version marker then makes clearing or changing either group independent.
  if (!dining) return resolved;
  const independentSections = design.diningTextColorGroupsVersion === 1 || design.diningTextColorGroupsVersion === 2;
  return {
    ...resolved,
    ...(!independentSections && !colors.pageTitle && colors.category ? { pageTitle: colors.category } : {}),
    ...(!independentSections && !colors.sectionDescription && colors.supporting ? { sectionDescription: colors.supporting } : {}),
    ...(design.diningTextColorGroupsVersion !== 2 && !colors.price && colors.product ? { price: colors.product } : {}),
  };
}
/** Absent controls leave older forms untouched. An empty submitted group restores its native/legacy color. */
export function setMenuTextColorsFromForm(design: Record<string, unknown>, form: Pick<FormData, "get">) {
  if (form.get("text_colors_present") !== "1") return;
  const colors: MenuTextColors = {};
  for (const group of MENU_TEXT_COLOR_GROUPS) {
    const raw = form.get(`text_color_${group}`);
    if (raw == null || raw === "") continue;
    const color = normalizeBackgroundColor(raw);
    if (!color) throw new Error("글자색은 #RRGGBB 형식으로 선택해주세요.");
    colors[group] = color;
  }
  const previous = readMenuTextColors({ design });
  for (const group of ["information", "pageTitle", "sectionDescription", "price"] as const) {
    if (form.get(`text_color_${group}`) == null && previous[group]) colors[group] = previous[group];
  }
  if (form.get("text_color_information") != null && Object.keys(colors).length) design.textColorGroupsVersion = 2;
  if (form.get("dining_text_colors_present") === "1") design.diningTextColorGroupsVersion = form.get("text_color_price") != null || design.diningTextColorGroupsVersion === 2 ? 2 : 1;
  if (Object.keys(colors).length) design.textColors = colors;
  else { delete design.textColors; delete design.textColorGroupsVersion; }
}
const rgb = (value: string): number[] | undefined => {
  const hex = normalizeBackgroundColor(value);
  if (hex) return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  return match ? match.slice(1, 4).map(Number) : undefined;
};
/** Same price hue at 60% concentration, increased only as needed for readable contrast. */
export function getMutedMenuPriceColor(price: string, background: string) {
  const foreground = rgb(price), backdrop = rgb(background);
  if (!foreground || !backdrop) return price;
  let result = price;
  for (let percent = 60; percent <= 100; percent++) {
    result = "#" + foreground.map((channel, i) => Math.round(channel * percent / 100 + backdrop[i] * (100 - percent) / 100).toString(16).padStart(2, "0")).join("");
    if (menuColorContrast(result, background) >= 4.5) break;
  }
  return result;
}
