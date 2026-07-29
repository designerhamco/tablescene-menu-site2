export const ONE_PAGE_LAYOUT_SHELL_KEYS = ["brand_left_rail", "brand_top_band", "brand_center_rail"] as const;

export type OnePageLayoutShell = (typeof ONE_PAGE_LAYOUT_SHELL_KEYS)[number];

export const DEFAULT_ONE_PAGE_LAYOUT_SHELL: OnePageLayoutShell = "brand_left_rail";

export const ONE_PAGE_LAYOUT_SHELL_LABELS = {
  brand_left_rail: "왼쪽 브랜드형",
  brand_top_band: "상단 브랜드형",
  brand_center_rail: "중앙 브랜드형",
} as const satisfies Record<OnePageLayoutShell, string>;

export const ONE_PAGE_LAYOUT_SHELL_DESCRIPTIONS = {
  brand_left_rail: "기존 CafeA 구성을 그대로 유지합니다.",
  brand_top_band: "브랜드 영역을 상단에 두고 메뉴를 아래에 배치합니다.",
  brand_center_rail: "브랜드 영역을 중앙 축으로 두고 메뉴를 좌우에 나눕니다.",
} as const satisfies Record<OnePageLayoutShell, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function isOnePageLayoutShell(value: unknown): value is OnePageLayoutShell {
  return typeof value === "string" && ONE_PAGE_LAYOUT_SHELL_KEYS.includes(value as OnePageLayoutShell);
}

export function normalizeOnePageLayoutShell(value: unknown): OnePageLayoutShell {
  if (!isOnePageLayoutShell(value)) return DEFAULT_ONE_PAGE_LAYOUT_SHELL;
  return value;
}

export function getOnePageLayoutShellFromPageSettings(pageSettings: unknown): OnePageLayoutShell {
  if (!isRecord(pageSettings)) return DEFAULT_ONE_PAGE_LAYOUT_SHELL;
  const designSettings = pageSettings.design;
  if (!isRecord(designSettings)) return DEFAULT_ONE_PAGE_LAYOUT_SHELL;
  return normalizeOnePageLayoutShell(designSettings.onePageLayoutShell ?? designSettings.one_page_layout_shell);
}

export function supportsOnePageLayoutShell(templateKey: string | null | undefined) {
  return templateKey === "cafe_design_a";
}
