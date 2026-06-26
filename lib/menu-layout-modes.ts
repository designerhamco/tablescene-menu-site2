export const BASIC_LAYOUT_MODE_ORDER = ["orderedBalancedFit", "orderedFit"] as const;
export const PC_TABLET_LAYOUT_MODES = BASIC_LAYOUT_MODE_ORDER;

export type PcTabletLayoutMode = (typeof PC_TABLET_LAYOUT_MODES)[number];

export const BASIC_DEFAULT_LAYOUT_MODE: PcTabletLayoutMode = "orderedBalancedFit";
export const DEFAULT_PC_TABLET_LAYOUT_MODE: PcTabletLayoutMode = BASIC_DEFAULT_LAYOUT_MODE;
const LEGACY_PC_TABLET_LAYOUT_MODES = ["balanced", "balancedExperimental"] as const;
const LEGACY_PC_TABLET_LAYOUT_MODE_FALLBACK: PcTabletLayoutMode = "orderedBalancedFit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizePcTabletLayoutMode(value: unknown): PcTabletLayoutMode {
  if (PC_TABLET_LAYOUT_MODES.includes(value as PcTabletLayoutMode)) {
    return value as PcTabletLayoutMode;
  }
  if (LEGACY_PC_TABLET_LAYOUT_MODES.includes(value as (typeof LEGACY_PC_TABLET_LAYOUT_MODES)[number])) {
    return LEGACY_PC_TABLET_LAYOUT_MODE_FALLBACK;
  }
  return DEFAULT_PC_TABLET_LAYOUT_MODE;
}

export function getPcTabletLayoutModeFromPageSettings(pageSettings: unknown): PcTabletLayoutMode {
  if (!isRecord(pageSettings)) return DEFAULT_PC_TABLET_LAYOUT_MODE;
  const designSettings = pageSettings.design;
  if (!isRecord(designSettings)) return DEFAULT_PC_TABLET_LAYOUT_MODE;
  return normalizePcTabletLayoutMode(designSettings.pcTabletLayoutMode);
}

export function supportsPcTabletLayoutMode(templateKey: string | null | undefined) {
  return templateKey === "cafe_design_a";
}
