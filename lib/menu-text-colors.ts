import { normalizeBackgroundColor } from "./template-background-colors";
import { menuSurfaceRecord } from "./menu-design-surfaces";
import { menuColorContrast } from "./menu-interaction-theme";

export const MENU_TEXT_COLOR_GROUPS = ["brand", "category", "product", "representative", "supporting", "information"] as const;
export type MenuTextColorGroup = typeof MENU_TEXT_COLOR_GROUPS[number];
export type MenuTextColors = Partial<Record<MenuTextColorGroup, string>>;
export const MENU_TEXT_COLOR_LABELS: Record<MenuTextColorGroup, string> = {
  brand: "가게명", category: "카테고리명", product: "상품 기본정보", representative: "대표영역 설명", supporting: "메뉴영역 설명", information: "안내사항·위젯텍스트",
};
export const MENU_TEXT_COLOR_DESCRIPTIONS: Record<MenuTextColorGroup, string> = {
  brand: "가게명",
  category: "카테고리명·가격 옵션명",
  product: "상품명·판매가격·가격설명",
  representative: "가게설명·대표영역 안내사항",
  supporting: "보조언어명·상품설명·카테고리설명",
  information: "메뉴영역 안내사항·위젯텍스트",
};
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
export function resolvedMenuTextColors(pageSettings: unknown): MenuTextColors {
  const colors = readMenuTextColors(pageSettings);
  const design = menuSurfaceRecord(menuSurfaceRecord(pageSettings).design);
  return colors.information || design.textColorGroupsVersion === 2 || !colors.supporting
    ? colors : { ...colors, information: colors.supporting };
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
  if (form.get("text_color_information") == null) {
    const previous = readMenuTextColors({ design });
    if (previous.information) colors.information = previous.information;
  } else if (Object.keys(colors).length) design.textColorGroupsVersion = 2;
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
