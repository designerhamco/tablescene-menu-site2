/** Product policy is independent of renderer keys and of mutable price amounts.
 * This registry is a review foundation; it does not enable production switching.
 */
export type MenuService = "basic" | "dining";
export type MenuDesignAccess = "standard" | "all";
export const MENU_LAYOUTS = {
  "basic-first-column": { service: "basic", label: "1열 고정형" },
  "basic-top-row": { service: "basic", label: "상단행 고정형" },
  "basic-center-column": { service: "basic", label: "중앙열 고정형" },
  "basic-upper-left": { service: "basic", label: "좌상단 배치형" },
  "dining-full-page": { service: "dining", label: "전면 페이지형" },
  "dining-sidebar": { service: "dining", label: "좌측 내비게이션형" },
} as const;
export type MenuLayoutId = keyof typeof MENU_LAYOUTS;

export type MenuDesign = {
  id: string;
  label: string;
  layout: MenuLayoutId;
  kind: "standard" | "designer";
};

/** Access only; publication, ownership and payment checks remain separate gates. */
export function canUseMenuDesign(service: MenuService, access: MenuDesignAccess, design: MenuDesign) {
  return MENU_LAYOUTS[design.layout].service === service
    && (design.kind === "standard" || access === "all");
}

export const DEFAULT_DESIGN_REVIEWS = [
  { id: "basic-first-column", label: "베이직 기본 디자인", layout: "basic-first-column", kind: "standard", renderer: "cafe_design_a" },
  { id: "basic-top-row", label: "베이직 기본 디자인", layout: "basic-top-row", kind: "standard", renderer: "cafe_design_a" },
  { id: "basic-center-column", label: "베이직 기본 디자인", layout: "basic-center-column", kind: "standard", renderer: "cafe_design_a" },
  { id: "basic-upper-left", label: "베이직 기본 디자인", layout: "basic-upper-left", kind: "standard", renderer: "cafe_design_a" },
  { id: "dining-full-page", label: "다이닝 기본 디자인", layout: "dining-full-page", kind: "standard", renderer: "dining_aube_table_a" },
] as const satisfies readonly (MenuDesign & { renderer: string })[];
export type DefaultDesignReview = typeof DEFAULT_DESIGN_REVIEWS[number];

export function getDefaultDesignReview(value: string | undefined, renderer: string): DefaultDesignReview | undefined {
  return DEFAULT_DESIGN_REVIEWS.find(design => design.id === value && design.renderer === renderer);
}

export function getDefaultDesignReviewUrl(design: DefaultDesignReview) {
  return `/templates/${design.renderer}/preview?design=${design.id}&device=tablet&layoutMode=orderedBalancedFit&callPreview=on&orderPreview=on`;
}
