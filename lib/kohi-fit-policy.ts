import type { MenuPreviewDevice } from "./menu-preview-devices";

/** KOHI-only proportion-first pilot. Other templates keep their existing policy. */
export function usesKohiFitPolicy(templateKey: string, previewDevice?: MenuPreviewDevice): boolean {
  return templateKey === "cafe_kohi_a" && previewDevice !== "mobile";
}

export function getKohiFitLimits(previewDevice?: MenuPreviewDevice, viewportWidth = 1280) {
  const tablet = previewDevice === "tablet" || (!previewDevice && viewportWidth <= 1366);
  return tablet
    ? { maximumFontScale: 1.2, maximumGapScale: 0.96 }
    : { maximumFontScale: 1.24, maximumGapScale: 1 };
}

export function limitKohiFitFontCandidates(candidates: readonly number[], previewDevice?: MenuPreviewDevice, viewportWidth?: number) {
  const { maximumFontScale } = getKohiFitLimits(previewDevice, viewportWidth);
  return candidates.filter((scale) => Number.isFinite(scale) && scale > 0 && scale <= maximumFontScale);
}

export function isKohiFitScaleWithinLimits(fontScale: number, gapScale: number, previewDevice?: MenuPreviewDevice, viewportWidth?: number): boolean {
  const limits = getKohiFitLimits(previewDevice, viewportWidth);
  return Number.isFinite(fontScale) && Number.isFinite(gapScale) && fontScale > 0 && gapScale > 0 &&
    fontScale <= limits.maximumFontScale && gapScale <= limits.maximumGapScale;
}

/** No leftover-space feedback. Dense-content backoff can still reduce both scales. */
export function getKohiFitGapScale(fontScale: number, previewDevice?: MenuPreviewDevice, viewportWidth?: number): number {
  const { maximumGapScale } = getKohiFitLimits(previewDevice, viewportWidth);
  const safeFontScale = Number.isFinite(fontScale) ? fontScale : 0.8;
  return Math.round(Math.max(0.44, Math.min(maximumGapScale, safeFontScale + 0.02)) * 1000) / 1000;
}

/** Use rendered copy visibility, not the existence of untranslated starter fields. */
export function getKohiItemRhythmMultiplier(hasSecondary: boolean, hasDescription: boolean, hasAdditionalSupport = false): number {
  if (hasAdditionalSupport || (hasSecondary && hasDescription)) return 1;
  return hasSecondary || hasDescription ? 1.15 : 1.35;
}
