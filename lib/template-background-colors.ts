const FALLBACK_BACKGROUND_COLOR = "#FFFFFF";

const TEMPLATE_DEFAULT_BACKGROUND_COLORS: Record<string, string> = {
  cafe_design_a: "#FFFFFF",
  cafe_mocha_forest_a: "#F0E8D8",
  cafe_noir_a: "#FFFFFF",
  cafe_design_b: "#FFF7ED",
  cafe_design_c: "#F8FAFC",
  fine_dining_design_a: "#F7F3EA",
  fine_dining_design_b: "#F7F3EA",
  casual_dining_design_a: "#F8FAFC",
  casual_dining_design_b: "#F8FAFC",
  fast_food_design_a: "#FFF7D6",
  fast_food_design_b: "#FFF7D6",
  brunch_design_a: "#F8F4EC",
  brunch_design_b: "#F8F4EC",
};

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function normalizeBackgroundColor(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const color = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(color) ? color.toUpperCase() : null;
}

export function getTemplateDefaultBackgroundColor(templateKey?: string | null): string {
  if (!templateKey) return FALLBACK_BACKGROUND_COLOR;

  return TEMPLATE_DEFAULT_BACKGROUND_COLORS[templateKey] ?? FALLBACK_BACKGROUND_COLOR;
}

export function getCustomBackgroundColor(pageSettings: unknown): string | null {
  const pageSettingsRecord = getRecord(pageSettings);
  if (!pageSettingsRecord) return null;

  const designRecord = getRecord(pageSettingsRecord.design);
  return normalizeBackgroundColor(designRecord?.backgroundColor) ?? normalizeBackgroundColor(pageSettingsRecord.backgroundColor);
}

export function getResolvedBackgroundColor(templateKey: string | null | undefined, pageSettings: unknown): string {
  return getCustomBackgroundColor(pageSettings) ?? getTemplateDefaultBackgroundColor(templateKey);
}
