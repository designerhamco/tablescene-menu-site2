import { normalizeBackgroundColor } from "./template-background-colors";
import { getReadableTextColorForTimeSaleBadge } from "./menu-time-sales";

export const PREVIEW_CHIP_COLOR_KEYS = ["generalBackground", "generalText", "saleBackground", "saleText"] as const;
export type PreviewChipColors = Partial<Record<typeof PREVIEW_CHIP_COLOR_KEYS[number], string>>;
export function readPreviewChipColors(raw: unknown): PreviewChipColors {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const result: PreviewChipColors = {};
  for (const key of PREVIEW_CHIP_COLOR_KEYS) {
    const color = normalizeBackgroundColor(source[key]);
    if (color) result[key] = color;
  }
  return result;
}
export function resolvePreviewChipColors(value: PreviewChipColors): PreviewChipColors {
  return { ...value,
    ...(value.generalBackground && !value.generalText ? { generalText: getReadableTextColorForTimeSaleBadge(value.generalBackground) } : {}),
    ...(value.saleBackground && !value.saleText ? { saleText: getReadableTextColorForTimeSaleBadge(value.saleBackground) } : {}),
  };
}
