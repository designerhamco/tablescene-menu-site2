import { usesOnePageProportionPolicy } from "./one-page-proportion-policy";
import type { MenuPreviewDevice } from "./menu-preview-devices";

export const MENU_DECORATION_LINES = ["categoryUnderline", "columnDivider", "categoryDivider", "itemDivider", "priceLeader"] as const;
export type MenuDecorationLine = typeof MENU_DECORATION_LINES[number];
export const MENU_DECORATION_WIDTHS = [1, 2, 3] as const;
export const MENU_DECORATION_STYLES = ["solid", "dashed", "dotted"] as const;
export type MenuLineDecoration = {
  visible?: boolean;
  width?: typeof MENU_DECORATION_WIDTHS[number];
  style?: typeof MENU_DECORATION_STYLES[number];
  color?: string;
};
export type MenuDecorations = Partial<Record<MenuDecorationLine, MenuLineDecoration>> & { patternBands?: boolean };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Missing properties always retain the native template, including old saved designs. */
export function normalizeMenuDecorations(value: unknown): MenuDecorations {
  const source = record(value), result: MenuDecorations = {};
  if (typeof source.patternBands === "boolean") result.patternBands = source.patternBands;
  for (const key of MENU_DECORATION_LINES) {
    const input = record(source[key]), line: MenuLineDecoration = {};
    if (typeof input.visible === "boolean") line.visible = input.visible;
    if (MENU_DECORATION_WIDTHS.some(width => width === input.width)) line.width = input.width as MenuLineDecoration["width"];
    if (MENU_DECORATION_STYLES.some(style => style === input.style)) line.style = input.style as MenuLineDecoration["style"];
    if (typeof input.color === "string" && /^#[\da-f]{6}$/i.test(input.color)) line.color = input.color.toUpperCase();
    if (Object.keys(line).length) result[key] = line;
  }
  return result;
}

export function readMenuDecorations(pageSettings: unknown): MenuDecorations {
  return normalizeMenuDecorations(record(record(pageSettings).design).decorations);
}

export function supportsMenuDecorations(templateKey: string | null | undefined, presentation?: "one" | "multi") {
  return usesOnePageProportionPolicy(templateKey, presentation);
}

export function supportsMenuDecorationLine(key: MenuDecorationLine, album: boolean, device?: MenuPreviewDevice) {
  if (album && (key === "columnDivider" || key === "itemDivider" || key === "priceLeader")) return false;
  return key !== "columnDivider" || device !== "mobile";
}

/** Native defaults are used only to style an explicitly edited line, never to
 * reconstruct an untouched template. Its original markup/CSS remain authoritative. */
export function nativeMenuDecorationVisible(key: MenuDecorationLine, templateKey: string, neutral = false) {
  if (neutral) return false;
  return key === "categoryUnderline" ? templateKey === "cafe_design_a"
    : key === "columnDivider" ? templateKey === "cafe_mocha_forest_a"
    : key === "itemDivider" ? templateKey === "cafe_van_gogh_a"
    : key === "priceLeader" ? templateKey === "cafe_round_focus_a" : false;
}

export const MENU_DECORATION_NAMES: Record<MenuDecorationLine, string> = {
  categoryUnderline: "카테고리명 아래 선", columnDivider: "열 사이 구분선", categoryDivider: "카테고리 사이 구분선",
  itemDivider: "메뉴 아이템 사이 구분선", priceLeader: "메뉴명–가격 연결선",
};

export const MENU_DECORATION_CSS_NAMES: Record<MenuDecorationLine, string> = {
  categoryUnderline: "underline", columnDivider: "column", categoryDivider: "category", itemDivider: "item", priceLeader: "leader",
};

export function menuDecorationScopeProps(value: MenuDecorations, templateKey: string, neutral: boolean, album: boolean) {
  const attributes: Record<string, string> = {}, style: Record<string, string> = {};
  for (const key of MENU_DECORATION_LINES) {
    const line = value[key];
    if (!line || !supportsMenuDecorationLine(key, album)) continue;
    const name = MENU_DECORATION_CSS_NAMES[key];
    if (line.visible !== undefined) attributes[`data-decoration-${name}`] = line.visible ? "on" : "off";
    const visible = line.visible ?? nativeMenuDecorationVisible(key, templateKey, neutral);
    if (!visible) continue;
    const customStroke = line.width || line.style || line.visible === true && !nativeMenuDecorationVisible(key, templateKey, neutral);
    if (customStroke) attributes[`data-decoration-${name}-stroke`] = "custom";
    if (customStroke && (line.style === "dotted" || key === "priceLeader" && !line.style)) attributes[`data-decoration-${name}-dots`] = "true";
    if (key === "priceLeader" && !nativeMenuDecorationVisible(key, templateKey, neutral)) attributes["data-decoration-leader-ink"] = "supporting";
    if (line.width) style[`--decoration-${name}-width`] = `${line.width}px`;
    if (line.style) style[`--decoration-${name}-style`] = line.style;
    if (line.color) {
      attributes[`data-decoration-${name}-color`] = "custom";
      style[`--decoration-${name}-color`] = line.color;
    }
  }
  return { attributes, style };
}
