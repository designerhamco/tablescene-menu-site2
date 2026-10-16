export const ONE_PAGE_LAYOUT_SHELL_KEYS = ["brand_left_rail", "brand_top_band", "brand_center_rail", "brand_center_column", "brand_panel_flow"] as const;

export type OnePageLayoutShell = (typeof ONE_PAGE_LAYOUT_SHELL_KEYS)[number];

export const DEFAULT_ONE_PAGE_LAYOUT_SHELL: OnePageLayoutShell = "brand_left_rail";

const TEMPLATE_FIXED_ONE_PAGE_LAYOUT_SHELLS = {
  restaurant_onue_a: "brand_panel_flow",
  cafe_design_a: "brand_left_rail",
  cafe_mocha_forest_a: "brand_left_rail",
  cafe_sunday_line_a: "brand_top_band",
  cafe_van_gogh_a: "brand_top_band",
  cafe_round_focus_a: "brand_center_column",
  fast_food_loop_bagel_a: "brand_left_rail",
} as const satisfies Record<string, OnePageLayoutShell>;

const fixedOnePageLayoutShells: Partial<Record<string, OnePageLayoutShell>> = TEMPLATE_FIXED_ONE_PAGE_LAYOUT_SHELLS;

export const ONE_PAGE_LAYOUT_SHELL_LABELS = {
  brand_panel_flow: "좌상단 대표영역 패널형",
  brand_left_rail: "왼쪽 브랜드형",
  brand_top_band: "상단 브랜드형",
  brand_center_rail: "중앙 브랜드형",
  brand_center_column: "중앙 브랜드형",
} as const satisfies Record<OnePageLayoutShell, string>;

export const ONE_PAGE_LAYOUT_SHELL_DESCRIPTIONS = {
  brand_panel_flow: "첫 패널 상단의 대표영역 아래부터 메뉴가 이어지는 유동 패널형입니다.",
  brand_left_rail: "기존 CafeA 구성을 그대로 유지합니다.",
  brand_top_band: "브랜드 영역을 상단에 두고 메뉴를 아래에 배치합니다.",
  brand_center_rail: "브랜드 영역을 중앙 축으로 두고 메뉴를 좌우에 나눕니다.",
  brand_center_column: "브랜드 영역을 중앙 축으로 두고 메뉴를 좌우에 나눕니다.",
} as const satisfies Record<OnePageLayoutShell, string>;

export function getFixedOnePageLayoutShell(templateKey: string | null | undefined): OnePageLayoutShell {
  if (!templateKey) return DEFAULT_ONE_PAGE_LAYOUT_SHELL;
  return fixedOnePageLayoutShells[templateKey] ?? DEFAULT_ONE_PAGE_LAYOUT_SHELL;
}

export function supportsOnePageLayoutShell(templateKey: string | null | undefined) {
  // Shells are template-owned. The alternate shells remain experimental and are
  // not customer-configurable for CafeA.
  void templateKey;
  return false;
}
