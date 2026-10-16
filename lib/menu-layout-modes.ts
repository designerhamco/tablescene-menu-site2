import { getFixedOnePageLayoutShell } from "./one-page-layout-shells";

export const BASIC_LAYOUT_MODE_ORDER = ["orderedBalancedFit", "orderedFit"] as const;
export const PC_TABLET_LAYOUT_MODES = BASIC_LAYOUT_MODE_ORDER;

export type PcTabletLayoutMode = (typeof PC_TABLET_LAYOUT_MODES)[number];

export const BASIC_DEFAULT_LAYOUT_MODE: PcTabletLayoutMode = "orderedBalancedFit";
export const DEFAULT_PC_TABLET_LAYOUT_MODE: PcTabletLayoutMode = BASIC_DEFAULT_LAYOUT_MODE;
export const BASIC_LAYOUT_MODE_ALIASES = {
  orderedBalancedFit: "orderedBalancedFit",
  orderedFit: "orderedFit",
  balanced: "orderedBalancedFit",
  balancedExperimental: "orderedBalancedFit",
  "자동 균형 배치": "orderedBalancedFit",
  "자동 균형": "orderedBalancedFit",
  "묶음형 자동 배치": "orderedBalancedFit",
  "채움형 배치": "orderedFit",
} as const satisfies Record<string, PcTabletLayoutMode>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function getDefaultPcTabletLayoutMode(templateKey?: string | null): PcTabletLayoutMode {
  return getFixedOnePageLayoutShell(templateKey) === "brand_panel_flow" ? "orderedFit" : DEFAULT_PC_TABLET_LAYOUT_MODE;
}

export function normalizePcTabletLayoutMode(value: unknown, templateKey?: string | null): PcTabletLayoutMode {
  if (typeof value !== "string") return getDefaultPcTabletLayoutMode(templateKey);
  const normalizedValue = value.trim();
  if (normalizedValue in BASIC_LAYOUT_MODE_ALIASES) {
    return BASIC_LAYOUT_MODE_ALIASES[normalizedValue as keyof typeof BASIC_LAYOUT_MODE_ALIASES];
  }
  return getDefaultPcTabletLayoutMode(templateKey);
}

export const normalizeBasicLayoutMode = normalizePcTabletLayoutMode;

export function getPcTabletLayoutModeFromPageSettings(pageSettings: unknown, templateKey?: string | null): PcTabletLayoutMode {
  if (!isRecord(pageSettings)) return getDefaultPcTabletLayoutMode(templateKey);
  const designSettings = pageSettings.design;
  if (!isRecord(designSettings)) return getDefaultPcTabletLayoutMode(templateKey);
  return normalizePcTabletLayoutMode(designSettings.pcTabletLayoutMode, templateKey);
}

export function supportsPcTabletLayoutMode(templateKey: string | null | undefined) {
  return templateKey === "restaurant_onue_a" || templateKey === "cafe_design_a" || templateKey === "cafe_mocha_forest_a" || templateKey === "cafe_sunday_line_a" || templateKey === "cafe_van_gogh_a" || templateKey === "cafe_round_focus_a" || templateKey === "fast_food_loop_bagel_a" || templateKey === "cafe_noir_a";
}
