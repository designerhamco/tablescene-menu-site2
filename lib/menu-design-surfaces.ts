import { getTemplateCapabilities } from "./template-capabilities";
import { getAubeTableDefaultCoverBackgroundColor, isAubeTableTemplate } from "./aube-table";
import { getDefaultDesignReview } from "./menu-design-policy";
import { MOCHA_FOREST_PANEL_COLORS } from "./mocha-forest-panels";
import { getTemplateDefaultBackgroundColor, normalizeBackgroundColor } from "./template-background-colors";

export const REPRESENTATIVE_ALIGNMENTS = ["left", "center", "right"] as const;
export type RepresentativeAlignment = typeof REPRESENTATIVE_ALIGNMENTS[number];
export type MenuSurfaceSettings = {
  pageBackground?: string; auxiliaryBackground?: string; coverBackground?: string;
  sidebarBackground?: string; coverDescriptionColor?: string; representativeAlignment?: RepresentativeAlignment;
};
export const menuSurfaceRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? { ...value as Record<string, unknown> } : {};
export function menuSurfaceSupport(templateKey: string) {
  return { basic: getTemplateCapabilities(templateKey).menuCover.coverMode === "section", dining: isAubeTableTemplate(templateKey), sidebar: templateKey === "dining_aube_table_b" };
}
export function readMenuSurfaceSettings(pageSettings: unknown): MenuSurfaceSettings {
  const page = menuSurfaceRecord(pageSettings), design = menuSurfaceRecord(page.design), result: MenuSurfaceSettings = {};
  for (const [key, stored] of [["pageBackground", "backgroundColor"], ["auxiliaryBackground", "auxiliaryBackgroundColor"], ["sidebarBackground", "sidebarBackgroundColor"], ["coverDescriptionColor", "coverDescriptionColor"]] as const) {
    const color = normalizeBackgroundColor(design[stored] ?? (key === "pageBackground" ? page.backgroundColor : undefined));
    if (color) result[key] = color;
  }
  const cover = normalizeBackgroundColor(page.multi_page_cover_background_color);
  if (cover) result.coverBackground = cover;
  if (REPRESENTATIVE_ALIGNMENTS.includes(design.representativeAlignment as RepresentativeAlignment)) result.representativeAlignment = design.representativeAlignment as RepresentativeAlignment;
  return result;
}
export function menuSurfaceDefaults(templateKey: string, settings: unknown = {}) {
  const raw = menuSurfaceRecord(settings), neutral = Boolean(getDefaultDesignReview(typeof raw.menu_design_id === "string" ? raw.menu_design_id : undefined, templateKey));
  const page = neutral ? "#FFFFFF" : templateKey === "cafe_mocha_forest_a" ? MOCHA_FOREST_PANEL_COLORS.ivory : templateKey === "dining_aube_table_b" ? "#F7F2EA" : getTemplateDefaultBackgroundColor(templateKey);
  return { pageBackground: page, auxiliaryBackground: templateKey === "cafe_mocha_forest_a" && !neutral ? MOCHA_FOREST_PANEL_COLORS.brown : templateKey === "cafe_round_focus_a" && !neutral ? page : null,
    coverBackground: neutral ? "#FFFFFF" : getAubeTableDefaultCoverBackgroundColor(templateKey), sidebarBackground: neutral ? "#F4F5F3" : "#401E24", coverDescriptionColor: neutral ? "#606561" : "#FFFFFF" };
}
/** Older forms do not clear optional surfaces. Only submitted controls can edit them. */
export function menuSurfaceSettingsFromForm(form: Pick<FormData, "get">, templateKey: string): MenuSurfaceSettings | undefined {
  if (form.get("menu_surfaces_present") !== "1") return undefined;
  const support = menuSurfaceSupport(templateKey);
  if (!support.basic && !support.dining) return undefined;
  const result: MenuSurfaceSettings = {};
  const keys = ["pageBackground", ...(support.basic ? ["auxiliaryBackground"] : ["coverBackground", "coverDescriptionColor"]), ...(support.sidebar ? ["sidebarBackground"] : [])] as (keyof Omit<MenuSurfaceSettings, "representativeAlignment">)[];
  for (const key of keys) {
    const value = form.get(`surface_${key}`);
    if (value === "" || value == null) continue;
    const color = normalizeBackgroundColor(value);
    if (!color) throw new Error("색상은 #RRGGBB 형식으로 선택해주세요.");
    result[key] = color;
  }
  if (support.basic) {
    const align = form.get("representative_alignment");
    if (align && align !== "template") {
      if (!REPRESENTATIVE_ALIGNMENTS.includes(align as RepresentativeAlignment)) throw new Error("대표영역 정렬 선택값을 확인해주세요.");
      result.representativeAlignment = align as RepresentativeAlignment;
    }
  }
  return result;
}
/** Presentation JSON only; preserve content, opacity, appearance and unknown keys. */
export function withMenuSurfaceSettings(pageSettings: unknown, settings: unknown, templateKey: string, value: MenuSurfaceSettings) {
  const page = menuSurfaceRecord(pageSettings), design = menuSurfaceRecord(page.design), support = menuSurfaceSupport(templateKey);
  const assign = (key: string, next: string | undefined) => { if (next) design[key] = next; else delete design[key]; };
  if (!support.basic && !support.dining) return page;
  assign("backgroundColor", value.pageBackground); delete page.backgroundColor;
  if (support.basic) { assign("auxiliaryBackgroundColor", value.auxiliaryBackground); assign("representativeAlignment", value.representativeAlignment); }
  if (support.dining) {
    page.multi_page_cover_background_color = value.coverBackground ?? menuSurfaceDefaults(templateKey, settings).coverBackground;
    assign("coverDescriptionColor", value.coverDescriptionColor);
    if (support.sidebar) assign("sidebarBackgroundColor", value.sidebarBackground);
  }
  page.design = design;
  return page;
}
