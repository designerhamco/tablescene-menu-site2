import type { CSSProperties } from "react";
export const IMAGE_RADIUS_KEYS = ["advertisement", "cover", "item", "widget", "logo"] as const;
export type ImageRadiusKey = typeof IMAGE_RADIUS_KEYS[number];
export const IMAGE_RADIUS_LABELS: Record<ImageRadiusKey, string> = { advertisement: "광고 이미지", cover: "대표 이미지", item: "상품 이미지", widget: "위젯 이미지", logo: "로고 이미지" };
export const MAX_IMAGE_RADIUS = 32;
export const CHIP_SHAPES = ["template", "square", "soft", "rounded", "pill"] as const;
export type ChipShape = typeof CHIP_SHAPES[number];
export const CHIP_SHAPE_LABELS: Record<ChipShape,string> = { template: "템플릿 기본값", square: "각진 모양", soft: "살짝 둥글게", rounded: "둥글게", pill: "알약형" };
export const ALBUM_IMAGE_RATIOS = ["1:1", "4:5", "5:4"] as const;
export type AlbumImageRatio = typeof ALBUM_IMAGE_RATIOS[number];
export type MenuAppearance = { imageRadii: Partial<Record<ImageRadiusKey, number>>; chipShape: ChipShape; albumImageRatio: AlbumImageRatio };
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
export function menuAppearanceStyle(appearance: MenuAppearance, basic: boolean, album: boolean): CSSProperties {
  const style: Record<string,string> = {};
  if (basic) {
    for (const key of IMAGE_RADIUS_KEYS) if (appearance.imageRadii[key] != null) style[`--menu-image-radius-${key}`] = `${appearance.imageRadii[key]}px`;
    const radii = { square: "0px", soft: "2px", rounded: "4px", pill: "9999px" };
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
