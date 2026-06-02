export const PC_TABLET_LAYOUT_MODES = ["orderedFit", "balanced"] as const;

export type PcTabletLayoutMode = (typeof PC_TABLET_LAYOUT_MODES)[number];

export const DEFAULT_PC_TABLET_LAYOUT_MODE: PcTabletLayoutMode = "orderedFit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normalizePcTabletLayoutMode(value: unknown): PcTabletLayoutMode {
  return value === "balanced" ? "balanced" : DEFAULT_PC_TABLET_LAYOUT_MODE;
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
