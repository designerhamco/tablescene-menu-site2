import { getBalancedBrandLinePlans, getMobileBrandMeasurementTexts, normalizeMobileBrandTitle, type MobileBrandTitleFit } from "./mobile-brand-title-fit";

const CANVAS_MEASURED_UNITS = 64;
export const getCanvasBrandMeasurementTexts = (title: string) => getMobileBrandMeasurementTexts(title, CANVAS_MEASURED_UNITS);

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

/** Fixed semantic size: available width selects line breaks, never font size. */
export function getCanvasBrandLimits(_width: number, layout: CanvasBrandSlotLayout, rootScale = 1, categorySize = 32 * rootScale) {
  void _width;
  const fontSize = categorySize * (layout === "horizontal-header" ? 1.3 : 1.6);
  return { fontSize, minimum: fontSize, maximum: fontSize };
}

/** Shared PC/tablet title hierarchy. Font names never select a policy. */
export function selectCanvasBrandTitleFit(title: string, widths: ReadonlyMap<string, number>, width: number, height: number,
  limits: ReturnType<typeof getCanvasBrandLimits>, measuredLineAdvance = 1.08, _ceilingScale = 1, opticalScale = 1): MobileBrandTitleFit {
  const text = normalizeMobileBrandTitle(title);
  void height; void measuredLineAdvance; void _ceilingScale;
  const fontSize = limits.fontSize * Math.max(1, opticalScale);
  const fallback = { lines: text ? [text] : [], fontSize, naturalWrap: true };
  if (!text || !Number.isFinite(width) || width <= 0) return fallback;
  // Fewest whole-word lines first. Only a word that cannot fit at the fixed
  // size needs grapheme-safe breaks. No width target, enlargement or shrink.
  const [wordPlans, graphemePlans = []] = getBalancedBrandLinePlans(title, widths, CANVAS_MEASURED_UNITS);
  const fits = (candidate: { widest: number }) => candidate.widest * fontSize / 100 <= width + .01;
  const wordPlan = wordPlans.find(fits);
  if (wordPlan) return { lines: wordPlan.lines, fontSize, naturalWrap: false };
  const words = text.split(" ");
  if (words.length > 1) {
    const lines: string[] = [];
    for (const word of words) {
      const wordWidth = widths.get(word);
      if (wordWidth && fits({ widest: wordWidth })) { lines.push(word); continue; }
      const plan = getBalancedBrandLinePlans(word, widths, CANVAS_MEASURED_UNITS).flat().find(fits);
      if (!plan) return fallback;
      lines.push(...plan.lines);
    }
    return { lines, fontSize, naturalWrap: false };
  }
  const plan = graphemePlans.find(fits);
  if (plan) return { lines: plan.lines, fontSize, naturalWrap: false };
  return fallback;
}
