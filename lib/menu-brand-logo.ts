/** Logo limits belong to the identity slot, independently of menu typography. */
export const MENU_LOGO_POLICY = {
  desktopWidth: .75, topRowHeight: .8, desktopHeightToWidth: .6,
  mobileWidth: .7, mobileHeightToWidth: .4, mobileMaxHeightRem: 10,
  transparentClearance: .05,
} as const;
export type MenuLogoBounds = { x: number; y: number; width: number; height: number };
export function getMenuLogoBox(width: number, height: number, mobile: boolean, topRow: boolean, rem = 16, availableHeight = Infinity) {
  const safeWidth = Math.max(0, width);
  return { width: safeWidth * (mobile ? MENU_LOGO_POLICY.mobileWidth : MENU_LOGO_POLICY.desktopWidth),
    height: Math.max(0, Math.min(availableHeight, mobile ? Math.min(safeWidth * MENU_LOGO_POLICY.mobileHeightToWidth, rem * MENU_LOGO_POLICY.mobileMaxHeightRem)
      : topRow ? height * MENU_LOGO_POLICY.topRowHeight : safeWidth * MENU_LOGO_POLICY.desktopHeightToWidth)) };
}
/** Fit the protected artwork bounds, preserving the original file and aspect. */
export function fitMenuLogo(sourceWidth: number, sourceHeight: number, bounds: MenuLogoBounds, box: {width:number; height:number}) {
  if (bounds.width <= 0 || bounds.height <= 0 || box.width <= 0 || box.height <= 0) return null;
  const scale = Math.min(box.width / bounds.width, box.height / bounds.height);
  return { width: bounds.width * scale, height: bounds.height * scale,
    imageWidth: sourceWidth * scale, imageHeight: sourceHeight * scale, left: -bounds.x * scale, top: -bounds.y * scale };
}
/** Ignore only excess transparent canvas; keep a protective inset where supplied. */
export function getMenuLogoAlphaBounds(alpha: Uint8ClampedArray, width: number, height: number): MenuLogoBounds {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (alpha[(y * width + x) * 4 + 3] > 0) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return { x: 0, y: 0, width, height };
  const clearance = Math.ceil(Math.min(right - left + 1, bottom - top + 1) * MENU_LOGO_POLICY.transparentClearance) + 1;
  left = Math.max(0, left - clearance); top = Math.max(0, top - clearance);
  right = Math.min(width - 1, right + clearance); bottom = Math.min(height - 1, bottom + clearance);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
