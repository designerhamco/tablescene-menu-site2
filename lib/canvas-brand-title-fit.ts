import { getBalancedBrandLinePlans, normalizeMobileBrandTitle, type MobileBrandTitleFit } from "./mobile-brand-title-fit";

export const CANVAS_BRAND_TWO_LINE_GAIN = 1.15;
export const CANVAS_BRAND_FRAME_HEIGHT_RATIO = 0.18;

export function getCanvasBrandLimits(device: "tablet" | "pc", rootScale = 1) {
  const [minimum, singleCap, multiCap] = device === "tablet" ? [40, 80, 60] : [44, 88, 64];
  return { minimum: minimum * rootScale, singleCap: singleCap * rootScale, multiCap: multiCap * rootScale };
}

/** Same inputs and scoring for every skin: no template IDs or per-template sizes. */
export function selectCanvasBrandTitleFit(title: string, widths: ReadonlyMap<string, number>, width: number, height: number,
  limits: ReturnType<typeof getCanvasBrandLimits>): MobileBrandTitleFit {
  const text = normalizeMobileBrandTitle(title);
  const fallback = { lines: text ? [text] : [], fontSize: limits.minimum, naturalWrap: true };
  if (!text || !Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return fallback;
  for (const plans of getBalancedBrandLinePlans(title, widths)) {
    const candidates = plans.flatMap((plan) => {
      const count = plan.lines.length;
      const cap = count === 1 ? limits.singleCap : limits.multiCap;
      // Match the common rendered 1.08 line advance plus 0.12em safe padding.
      const size = Math.min(cap, width * (count === 1 ? 0.8 : 0.75) * 100 / plan.widest, height / (1.08 * count + 0.12));
      if (plan.widest * limits.minimum / 100 > width + 0.01 || (1.08 * count + 0.12) * limits.minimum > height + 0.01) return [];
      return [{ lines: plan.lines, fontSize: Math.max(limits.minimum, size), naturalWrap: false }];
    });
    if (!candidates.length) continue;
    const single = candidates.find((candidate) => candidate.lines.length === 1);
    const double = candidates.find((candidate) => candidate.lines.length === 2);
    if (single && double) {
      const lineWidths = double.lines.map((line) => widths.get(line) ?? 0);
      const balanced = Math.min(...lineWidths) / Math.max(...lineWidths) >= 0.5;
      return balanced && double.fontSize >= single.fontSize * CANVAS_BRAND_TWO_LINE_GAIN ? double : single;
    }
    return single ?? double ?? candidates[0];
  }
  // Impossible minimum/box combination: preserve the whole text with natural
  // wrapping instead of truncating or silently violating the minimum.
  return fallback;
}
