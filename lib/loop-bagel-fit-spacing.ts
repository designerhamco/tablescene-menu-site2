import type { MenuPreviewDevice } from "./menu-preview-devices";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function usesLoopBagelFitSpacing(templateKey: string, previewDevice?: MenuPreviewDevice): boolean {
  return templateKey === "fast_food_loop_bagel_a" && previewDevice !== "mobile";
}

/**
 * Loop Bagel's PC/tablet rhythm stays tied to the selected font scale.
 * Fixed viewport dimensions provide a bounded correction, never leftover
 * content space (which changes as gaps change and can cause a feedback loop).
 * Category/item ratios and the final pixel clamps remain owned by CSS.
 */
export function getLoopBagelFitGapScale(fontScale: number, menuWidth: number, viewportHeight: number): number {
  const safeFontScale = Number.isFinite(fontScale) ? fontScale : 0.8;
  const safeMenuWidth = Number.isFinite(menuWidth) ? menuWidth : 640;
  const safeViewportHeight = Number.isFinite(viewportHeight) ? viewportHeight : 640;
  const widthProgress = clamp((safeMenuWidth - 640) / 800, 0, 1);
  const heightProgress = clamp((safeViewportHeight - 640) / 440, 0, 1);
  const screenCorrection = 0.94 + 0.1 * widthProgress + 0.06 * heightProgress;
  const maximumGapScale = 0.78 + 0.22 * widthProgress + 0.1 * heightProgress;

  return Math.round(clamp((safeFontScale + 0.02) * screenCorrection, 0.44, maximumGapScale) * 1000) / 1000;
}
