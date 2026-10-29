/** Presentation limits belong to the shared shell, never the menu renderer. */
export const MENU_PREVIEW_PRESENTATION = {
  compactBreakpoint: 768,
  desktop: { widthRatio: .9, heightRatio: .84, maxScale: 1.25 },
  compact: { widthRatio: 1, heightRatio: 1, maxScale: 1 },
} as const;

/** Center a comfortably sized mockup without changing its source viewport. */
export function fitMenuPreviewFrame(available: { width: number; height: number; viewportWidth?: number }, frame: { width: number; height: number }, border = 10) {
  const width = frame.width + border * 2;
  const height = frame.height + border * 2;
  const compact = available.viewportWidth !== undefined && available.viewportWidth < MENU_PREVIEW_PRESENTATION.compactBreakpoint;
  const policy = compact ? MENU_PREVIEW_PRESENTATION.compact : MENU_PREVIEW_PRESENTATION.desktop;
  const scale = Math.max(0, Math.min(available.width * policy.widthRatio / width, available.height * policy.heightRatio / height, policy.maxScale));
  return { width, height, scale, displayWidth: width * scale, displayHeight: height * scale };
}
