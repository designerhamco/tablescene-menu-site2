import type { MenuPreviewDevice } from "./menu-preview-devices";

/** KOHI's approved numeric calibration. Other templates share behavior, not these values. */
export function usesKohiFitPolicy(templateKey: string, previewDevice?: MenuPreviewDevice): boolean {
  return templateKey === "cafe_kohi_a" && previewDevice !== "mobile";
}

export function getKohiFitLimits(previewDevice?: MenuPreviewDevice, viewportWidth = 1280) {
  const tablet = previewDevice === "tablet" || (!previewDevice && viewportWidth <= 1366);
  return tablet
    ? { maximumFontScale: 1.2 }
    : { maximumFontScale: 1.24 };
}

export function limitKohiFitFontCandidates(candidates: readonly number[], previewDevice?: MenuPreviewDevice, viewportWidth?: number) {
  const { maximumFontScale } = getKohiFitLimits(previewDevice, viewportWidth);
  return candidates.filter((scale) => Number.isFinite(scale) && scale > 0 && scale <= maximumFontScale);
}

export function isKohiFitFontScaleWithinLimits(fontScale: number, previewDevice?: MenuPreviewDevice, viewportWidth?: number): boolean {
  const { maximumFontScale } = getKohiFitLimits(previewDevice, viewportWidth);
  return Number.isFinite(fontScale) && fontScale > 0 && fontScale <= maximumFontScale;
}
