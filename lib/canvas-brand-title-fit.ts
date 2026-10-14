import { getBalancedBrandLinePlans, normalizeMobileBrandTitle, type MobileBrandTitleFit } from "./mobile-brand-title-fit";

export const CANVAS_BRAND_TWO_LINE_GAIN = 1.15;
export const CANVAS_BRAND_FRAME_HEIGHT_RATIO = 0.18;
export const CANVAS_PC_BRAND_CEILING_SCALE = 0.875;
export const CANVAS_HEADER_BASE_RATIO = 0.08;
export const CANVAS_HEADER_MAX_RATIO = 0.14;

/** Only confirmed one-line PC text brands use a more compact header gap. */
export function getCanvasHeaderGapScale(device: "pc" | "tablet" | "mobile", lineCount: number, naturalWrap = false) {
  return device === "pc" && lineCount === 1 && !naturalWrap ? 0.75 : 1;
}

export function getCanvasHeaderRatio(frameHeight: number, fontSize: number, lines: number, lineAdvance: number, sideHeight = 0) {
  if (frameHeight <= 0) return CANVAS_HEADER_BASE_RATIO;
  const needed = Math.max(fontSize * (Math.max(1.08, lineAdvance) * lines + 0.12), sideHeight);
  return Math.max(CANVAS_HEADER_BASE_RATIO, Math.min(CANVAS_HEADER_MAX_RATIO, needed / frameHeight));
}

export type CanvasBrandSlotLayout = "horizontal-header" | "brand-column";

export function getCanvasBrandHeight(width: number, frameHeight: number, layout: CanvasBrandSlotLayout) {
  // A horizontal title must remain a compact band, not expand to the tall
  // brand-rail budget merely because a two-word title can become two lines.
  return Math.min(frameHeight * CANVAS_BRAND_FRAME_HEIGHT_RATIO, layout === "horizontal-header" ? width * 0.28 : Infinity);
}

export function getCanvasBrandLimits(width: number, layout: CanvasBrandSlotLayout, rootScale = 1) {
  // All dimensions come from the slot, never a template or device's fixed px.
  // A width-relative floor prevents extreme names becoming illegible solely
  // to chase coverage; those names use the existing text-preserving fallback.
  const horizontal = layout === "horizontal-header";
  const minimum = Math.max(0, width) * (horizontal ? 0.08 : 0.1) * rootScale;
  return { minimum, maximum: horizontal ? Math.max(minimum, width * 0.22 * rootScale) : Infinity, widthRatio: horizontal ? 0.65 : 0.75 };
}

/** Same inputs and scoring for every skin: no template IDs or per-template sizes. */
export function selectCanvasBrandTitleFit(title: string, widths: ReadonlyMap<string, number>, width: number, height: number,
  limits: ReturnType<typeof getCanvasBrandLimits>, measuredLineAdvance = 1.08, ceilingScale = 1): MobileBrandTitleFit {
  const text = normalizeMobileBrandTitle(title);
  const lineAdvance = Math.max(1.08, measuredLineAdvance);
  const fallback = { lines: text ? [text] : [], fontSize: limits.minimum, naturalWrap: true };
  if (!text || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return fallback;
  for (const plans of getBalancedBrandLinePlans(title, widths)) {
    const candidates = plans.flatMap((plan) => {
      const count = plan.lines.length;
      // CJK fallback font metrics can expand the actual line box beyond 1.08.
      // Use its measured advance plus the common 0.12em safe padding.
      const size = Math.min(limits.maximum, width * limits.widthRatio * 100 / plan.widest, height / (lineAdvance * count + 0.12)) * ceilingScale;
      if (plan.widest * limits.minimum / 100 > width + 0.01 || (lineAdvance * count + 0.12) * limits.minimum > height + 0.01) return [];
      return [{ lines: plan.lines, fontSize: Math.max(limits.minimum, size), naturalWrap: false }];
    });
    if (!candidates.length) continue;
    const single = candidates.find((candidate) => candidate.lines.length === 1);
    const double = candidates.find((candidate) => candidate.lines.length === 2);
    if (single && double) {
      const lineWidths = double.lines.map((line) => widths.get(line) ?? 0);
      const balanced = Math.min(...lineWidths) / Math.max(...lineWidths) >= 0.5;
      const singleCoverage = (widths.get(text) ?? 0) * single.fontSize / 100;
      const floorExceededTarget = singleCoverage > width * limits.widthRatio * 1.05;
      return balanced && (double.fontSize >= single.fontSize * CANVAS_BRAND_TWO_LINE_GAIN || floorExceededTarget) ? double : single;
    }
    return single ?? double ?? candidates[0];
  }
  // Impossible minimum/box combination: preserve the whole text with natural
  // wrapping instead of truncating or silently violating the minimum.
  return fallback;
}
