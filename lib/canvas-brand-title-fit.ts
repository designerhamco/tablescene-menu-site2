import { getBalancedBrandLinePlans, normalizeMobileBrandTitle, type MobileBrandTitleFit } from "./mobile-brand-title-fit";

export const CANVAS_BRAND_FRAME_HEIGHT_RATIO = 0.18;
export const CANVAS_HEADER_BASE_RATIO = 0.08;
export const CANVAS_HEADER_MAX_RATIO = 0.14;

/** Only confirmed one-line PC text brands use a more compact header gap. */
export function getCanvasHeaderGapScale(device: "pc" | "tablet" | "mobile", lineCount: number, naturalWrap = false) {
  return device === "pc" && lineCount === 1 && !naturalWrap ? 0.75 : 1;
}

export function getCanvasHeaderRatio(frameHeight: number, fontSize: number, lines: number, lineAdvance: number, sideHeight = 0) {
  if (frameHeight <= 0) return CANVAS_HEADER_BASE_RATIO;
  const titleHeight = fontSize * (Math.max(1.08, lineAdvance) * lines + 0.12);
  const neededHeight = Math.max(titleHeight, sideHeight);
  return Math.max(CANVAS_HEADER_BASE_RATIO, Math.min(CANVAS_HEADER_MAX_RATIO, neededHeight / frameHeight));
}

export type CanvasBrandSlotLayout = "horizontal-header" | "brand-column";

export function getCanvasBrandHeight(width: number, frameHeight: number, layout: CanvasBrandSlotLayout) {
  // Initial geometry hint only. Actual title/copy height can grow the header;
  // this budget must never shrink a title below the category hierarchy.
  const frameRatio = layout === "horizontal-header" ? CANVAS_HEADER_MAX_RATIO : CANVAS_BRAND_FRAME_HEIGHT_RATIO;
  return Math.min(frameHeight * frameRatio, layout === "horizontal-header" ? width * 0.28 : Infinity);
}

export function getCanvasBrandLimits(width: number, _layout: CanvasBrandSlotLayout, rootScale = 1, categorySize = 32 * rootScale) {
  const minimum = Math.max(40 * rootScale, categorySize * 1.25);
  return { minimum, maximum: Math.max(minimum, categorySize * 2.5, width * .32), preferred: Math.max(minimum, categorySize * 1.75), widthRatio: 1 };
}

/** Shared PC/tablet title hierarchy. Font names never select a policy. */
export function selectCanvasBrandTitleFit(title: string, widths: ReadonlyMap<string, number>, width: number, height: number,
  limits: ReturnType<typeof getCanvasBrandLimits>, measuredLineAdvance = 1.08, _ceilingScale = 1, opticalScale = 1): MobileBrandTitleFit {
  const text = normalizeMobileBrandTitle(title);
  void height; void measuredLineAdvance; void _ceilingScale;
  const fallback = { lines: text ? [text] : [], fontSize: limits.minimum, naturalWrap: true };
  if (!text || !Number.isFinite(width) || width <= 0) return fallback;
  const maximum = limits.maximum * Math.max(1, opticalScale);
  for (const plans of getBalancedBrandLinePlans(title, widths)) {
    const candidates = plans.flatMap(plan => {
      if (plan.widest * limits.minimum / 100 > width + .01) return [];
      return [{lines: plan.lines, fontSize: Math.max(limits.minimum, Math.min(maximum, width * 100 / plan.widest)), naturalWrap: false}];
    });
    if (!candidates.length) continue;
    const single = candidates.find(candidate => candidate.lines.length === 1);
    const double = candidates.find(candidate => candidate.lines.length === 2);
    // Preserve a comfortable one-line title. If it would fall below the
    // semantic preferred size, use two whole-word lines when they are larger.
    if (single) return double && single.fontSize < limits.preferred && double.fontSize > single.fontSize ? double : single;
    // Word groups first, emergency grapheme breaks only when an intact word
    // cannot fit at the title minimum. Never shrink below category hierarchy.
    return candidates[0];
  }
  return fallback;
}
