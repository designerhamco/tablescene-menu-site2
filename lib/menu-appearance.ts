import type { CSSProperties } from "react";
import { getDefaultDesignReview } from "./menu-design-policy";
export const IMAGE_RADIUS_KEYS = ["advertisement", "cover", "item", "widget", "logo"] as const;
export type ImageRadiusKey = typeof IMAGE_RADIUS_KEYS[number];
export const IMAGE_RADIUS_LABELS: Record<ImageRadiusKey, string> = { advertisement: "광고 이미지", cover: "대표 이미지", item: "상품 이미지", widget: "위젯 이미지", logo: "로고 이미지" };
/** Logos keep their transparent artwork; full-bleed Dining covers keep their native frame. */
export const UNIFIED_IMAGE_RADIUS_KEYS = ["advertisement", "cover", "item", "widget"] as const;
export const MAX_IMAGE_RADIUS = 32;
export const MENU_SHAPE_PRESETS = {
  square: { label: "각진 모양", imageRadius: 0, chipShape: "square", chipRadius: 0 },
  soft: { label: "살짝 둥글게", imageRadius: 8, chipShape: "soft", chipRadius: 2 },
  rounded: { label: "둥글게", imageRadius: 16, chipShape: "rounded", chipRadius: 4 },
  round: { label: "많이 둥글게", imageRadius: 24, chipShape: "pill", chipRadius: 9999 },
} as const;
export const IMAGE_RADIUS_PRESETS = [
  { value: "template", label: "템플릿 기본값", radius: undefined },
  { value: "square", label: MENU_SHAPE_PRESETS.square.label, radius: MENU_SHAPE_PRESETS.square.imageRadius },
  { value: "soft", label: MENU_SHAPE_PRESETS.soft.label, radius: MENU_SHAPE_PRESETS.soft.imageRadius },
  { value: "rounded", label: MENU_SHAPE_PRESETS.rounded.label, radius: MENU_SHAPE_PRESETS.rounded.imageRadius },
  { value: "round", label: MENU_SHAPE_PRESETS.round.label, radius: MENU_SHAPE_PRESETS.round.imageRadius },
] as const;
/** Existing arbitrary saved values remain untouched until another preset is chosen. */
export function imageRadiusPreset(radius?: number) {
  return IMAGE_RADIUS_PRESETS.find(preset => preset.radius === radius)?.value ?? "saved";
}
export const CHIP_SHAPES = ["template", "square", "soft", "rounded", "pill"] as const;
export type ChipShape = typeof CHIP_SHAPES[number];
export const CHIP_SHAPE_LABELS: Record<ChipShape,string> = { template: "템플릿 기본값", square: "각진 모양", soft: "살짝 둥글게", rounded: "둥글게", pill: "알약형" };
export const ALBUM_IMAGE_RATIOS = ["1:1", "4:5", "5:4"] as const;
export type AlbumImageRatio = typeof ALBUM_IMAGE_RATIOS[number];
export type MenuAppearance = { imageRadii: Partial<Record<ImageRadiusKey, number>>; chipShape: ChipShape; albumImageRatio: AlbumImageRatio };
export const TEMPLATE_SHAPE_DEFAULTS = [
  { key: "cafe_design_a", label: "REAL MATCHA", preset: "square" },
  { key: "cafe_mocha_forest_a", label: "MELLOW", preset: "soft" },
  { key: "cafe_sunday_line_a", label: "멜로크레마", preset: "soft" },
  { key: "cafe_van_gogh_a", label: "Van Gogh", preset: "square" },
  { key: "restaurant_onue_a", label: "온유 테이블", preset: "square" },
  { key: "cafe_round_focus_a", label: "ROSY ORANGE", preset: "square" },
  { key: "fast_food_loop_bagel_a", label: "루프베이글", preset: "rounded" },
  { key: "dining_aube_table_a", label: "오브 테이블", preset: "soft" },
  { key: "dining_aube_table_b", label: "메종 마레", preset: "soft" },
  { key: "display_menu_a", label: "썸머 블루", preset: "square" },
] as const;

/** One contract for catalog, initial provisioning, renderer, editor and reset. */
export function getTemplateMenuAppearance(templateKey?: string | null, designId?: string | null): MenuAppearance {
  const standard = getDefaultDesignReview(designId ?? undefined, templateKey ?? "");
  const name = standard ? "square" : TEMPLATE_SHAPE_DEFAULTS.find(item => item.key === templateKey)?.preset;
  const appearance = normalizeMenuAppearance({});
  if (!name) return appearance;
  return withUnifiedAppearanceRadius(appearance, MENU_SHAPE_PRESETS[name].imageRadius, !templateKey?.startsWith("dining_"));
}

/** Explicit merchant choices win; missing fields inherit registered defaults. */
export function resolveMenuAppearance(pageSettings: unknown, templateKey?: string | null, designId?: string | null): MenuAppearance {
  const native = getTemplateMenuAppearance(templateKey, designId), saved = readMenuAppearance(pageSettings);
  return { ...saved, imageRadii: { ...native.imageRadii, ...saved.imageRadii }, chipShape: saved.chipShape === "template" ? native.chipShape : saved.chipShape };
}
const unifiedChipShape = (radius?: number): ChipShape => radius === undefined ? "template" : radius === 0 ? "square" : radius <= 8 ? "soft" : radius <= 16 ? "rounded" : "pill";

/** Preserve legacy independent choices until the user explicitly selects a shared preset. */
export function unifiedAppearanceRadius(appearance: MenuAppearance, basic: boolean) {
  const keys = UNIFIED_IMAGE_RADIUS_KEYS.filter(key => basic || key !== "cover");
  const radius = appearance.imageRadii[keys[0]];
  const mixed = keys.some(key => appearance.imageRadii[key] !== radius) || appearance.chipShape !== unifiedChipShape(radius);
  return { radius, mixed };
}
export function withUnifiedAppearanceRadius(appearance: MenuAppearance, radius: number | undefined, basic: boolean): MenuAppearance {
  const imageRadii = { ...appearance.imageRadii };
  for (const key of UNIFIED_IMAGE_RADIUS_KEYS) {
    if (!basic && key === "cover") continue;
    if (radius === undefined) delete imageRadii[key]; else imageRadii[key] = radius;
  }
  return { ...appearance, imageRadii, chipShape: unifiedChipShape(radius) };
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function normalizeMenuAppearance(value: unknown): MenuAppearance {
  const raw = object(value), radii = object(raw.imageRadii);
  const imageRadii: MenuAppearance["imageRadii"] = {};
  for (const key of IMAGE_RADIUS_KEYS) if (typeof radii[key] === "number" && Number.isFinite(radii[key]) && radii[key] >= 0 && radii[key] <= MAX_IMAGE_RADIUS) imageRadii[key] = Math.round(radii[key]);
  return { imageRadii, chipShape: CHIP_SHAPES.includes(raw.chipShape as ChipShape) ? raw.chipShape as ChipShape : "template", albumImageRatio: ALBUM_IMAGE_RATIOS.includes(raw.albumImageRatio as AlbumImageRatio) ? raw.albumImageRatio as AlbumImageRatio : "1:1" };
}
export function readMenuAppearance(pageSettings: unknown) { return normalizeMenuAppearance(object(object(pageSettings).design).appearance); }
/** Undefined means preserve settings when an older form has no appearance fields. */
export function menuAppearanceFromForm(form: Pick<FormData,"get">): MenuAppearance | undefined {
  if (form.get("menu_appearance_present") !== "1") return undefined;
  const radii: Record<string,number> = {};
  for (const key of IMAGE_RADIUS_KEYS) {
    const value = form.get(`image_radius_${key}`);
    if (value == null || value === "") continue;
    if (typeof value !== "string" || !/^\d+$/.test(value) || Number(value) > MAX_IMAGE_RADIUS) throw new Error(`이미지 라운드는 0~${MAX_IMAGE_RADIUS}px 정수로 입력해주세요.`);
    radii[key] = Number(value);
  }
  const chipShape = form.get("chip_shape"), albumImageRatio = form.get("album_image_ratio");
  if (!CHIP_SHAPES.includes(chipShape as ChipShape) || !ALBUM_IMAGE_RATIOS.includes(albumImageRatio as AlbumImageRatio)) throw new Error("이미지·텍스트칩 모양 선택값이 올바르지 않습니다.");
  return normalizeMenuAppearance({ imageRadii: radii, chipShape, albumImageRatio });
}
export function menuAppearanceStyle(appearance: MenuAppearance, supportsShapes: boolean, album: boolean): CSSProperties {
  const style: Record<string,string> = {};
  if (supportsShapes) {
    for (const key of IMAGE_RADIUS_KEYS) if (appearance.imageRadii[key] != null) style[`--menu-image-radius-${key}`] = `${appearance.imageRadii[key]}px`;
    const radii = { square: `${MENU_SHAPE_PRESETS.square.chipRadius}px`, soft: `${MENU_SHAPE_PRESETS.soft.chipRadius}px`, rounded: `${MENU_SHAPE_PRESETS.rounded.chipRadius}px`, pill: `${MENU_SHAPE_PRESETS.round.chipRadius}px` };
    if (appearance.chipShape !== "template") style["--menu-chip-radius"] = radii[appearance.chipShape];
  }
  if (album) style["--menu-album-image-ratio"] = appearance.albumImageRatio.replace(":", " / ");
  return style as CSSProperties;
}

/** Read-only catalog examples and album preview selection; never used by public routes. */
export function menuAppearancePreview(pageSettings: unknown, query: Record<string, string | string[] | undefined>, album: boolean) {
  const settings = { ...object(pageSettings) }, design = { ...object(settings.design) };
  const appearance = readMenuAppearance(settings);
  const first = (key: string) => Array.isArray(query[key]) ? query[key][0] : query[key];
  const example = first("appearanceQa");
  if (example === "custom" || example === "zero") {
    appearance.imageRadii = Object.fromEntries(IMAGE_RADIUS_KEYS.map((key,index)=>[key,example === "zero"?0:[16,20,12,8,4][index]]));
    appearance.chipShape = example === "zero" ? "square" : "rounded";
  }
  const ratio = first("albumImageRatio");
  if (album && ALBUM_IMAGE_RATIOS.includes(ratio as AlbumImageRatio)) appearance.albumImageRatio = ratio as AlbumImageRatio;
  if (example || (album && ratio)) { design.appearance = appearance; settings.design = design; }
  return settings;
}
