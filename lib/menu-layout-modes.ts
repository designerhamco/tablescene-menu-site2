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

export function normalizePcTabletLayoutMode(value: unknown): PcTabletLayoutMode {
  if (typeof value !== "string") return DEFAULT_PC_TABLET_LAYOUT_MODE;
  const normalizedValue = value.trim();
  if (normalizedValue in BASIC_LAYOUT_MODE_ALIASES) {
    return BASIC_LAYOUT_MODE_ALIASES[normalizedValue as keyof typeof BASIC_LAYOUT_MODE_ALIASES];
  }
  return DEFAULT_PC_TABLET_LAYOUT_MODE;
}

export const normalizeBasicLayoutMode = normalizePcTabletLayoutMode;

export function getPcTabletLayoutModeFromPageSettings(pageSettings: unknown): PcTabletLayoutMode {
  if (!isRecord(pageSettings)) return DEFAULT_PC_TABLET_LAYOUT_MODE;
  const designSettings = pageSettings.design;
  if (!isRecord(designSettings)) return DEFAULT_PC_TABLET_LAYOUT_MODE;
  return normalizePcTabletLayoutMode(designSettings.pcTabletLayoutMode);
}

export function supportsPcTabletLayoutMode(templateKey: string | null | undefined) {
  return templateKey === "cafe_design_a" || templateKey === "cafe_noir_a";
}
