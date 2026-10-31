import type { MenuPreviewDevice } from "./menu-preview-devices";

/** Presentation limits belong to the shared shell, never the menu renderer. */
export const MENU_PREVIEW_PRESENTATION = {
  compactBreakpoint: 768,
  desktop: { widthRatio: 1, heightRatio: 1, maxScale: Infinity },
  tablet: { widthRatio: 1, heightRatio: 1, maxScale: 1.25 },
  mobile: { widthRatio: 1, heightRatio: 1, maxScale: 1.25 },
  compact: { widthRatio: 1, heightRatio: 1, maxScale: 1 },
  compactTablet: { widthRatio: 1, heightRatio: 1, maxScale: 1.25 },
} as const;

export function getMenuPreviewPresentation(viewportWidth?: number, device?: MenuPreviewDevice) {
  if (viewportWidth !== undefined && viewportWidth < MENU_PREVIEW_PRESENTATION.compactBreakpoint) {
    if (device === "tablet") return MENU_PREVIEW_PRESENTATION.compactTablet;
    return device === "mobile" ? MENU_PREVIEW_PRESENTATION.mobile : MENU_PREVIEW_PRESENTATION.compact;
  }
  if (device === "tablet") return MENU_PREVIEW_PRESENTATION.tablet;
  return device === "mobile" ? MENU_PREVIEW_PRESENTATION.mobile : MENU_PREVIEW_PRESENTATION.desktop;
}

/** Fill a capped mockup or a borderless live PC viewport; renderer rules stay independent. */
export function fitMenuPreviewFrame(available: { width: number; height: number; viewportWidth?: number; device?: MenuPreviewDevice }, frame: { width: number; height: number }, border = 10) {
  // PC is a borderless live viewport. Phones retain a scaled desktop overview.
  if (available.device === "pc") {
    if ((available.viewportWidth ?? available.width) >= MENU_PREVIEW_PRESENTATION.compactBreakpoint) {
      return { width: available.width, height: available.height, scale: available.width && available.height ? 1 : 0, displayWidth: available.width, displayHeight: available.height };
    }
    border = 0;
  }
  const width = frame.width + border * 2;
  const height = frame.height + border * 2;
  const policy = getMenuPreviewPresentation(available.viewportWidth, available.device);
  const scale = Math.max(0, Math.min(available.width * policy.widthRatio / width, available.height * policy.heightRatio / height, policy.maxScale));
  return { width, height, scale, displayWidth: width * scale, displayHeight: height * scale };
}
