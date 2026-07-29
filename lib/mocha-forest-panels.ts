export const MOCHA_FOREST_TEMPLATE_KEY = "cafe_mocha_forest_a" as const;

export const MOCHA_FOREST_PANEL_COLORS = {
  brown: "#382010",
  ivory: "#F0E8D8",
  green: "#384028",
} as const;

export type MochaForestPanel = keyof typeof MOCHA_FOREST_PANEL_COLORS;

export function getMochaForestPanelRole(columnIndex: number, columnCount: number): MochaForestPanel {
  const safeColumnCount = Math.max(1, Math.floor(columnCount));
  const safeColumnIndex = Math.max(0, Math.min(Math.floor(columnIndex), safeColumnCount - 1));

  if (safeColumnIndex === 0) return "brown";
  if (safeColumnIndex === safeColumnCount - 1) return "green";
  return "ivory";
}

export function isMochaForestTemplateKey(templateKey?: string | null) {
  return templateKey?.trim().toLowerCase() === MOCHA_FOREST_TEMPLATE_KEY;
}
