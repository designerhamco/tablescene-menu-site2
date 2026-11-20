/** The Dining introduction alone continues its dark canvas behind the header. */
export function getSiteHeaderSurface(pathname: string): "dark" | "default" {
  return pathname.replace(/\/$/, "") === "/services/dining" ? "dark" : "default";
}

/** Change to the solid header when the story's bottom reaches the header's lower edge. */
export function isHomeHeroHeaderOverlay(pathname: string, heroBottom: number | null, headerHeight: number): boolean {
  return pathname === "/" && heroBottom !== null && Number.isFinite(heroBottom) && heroBottom > Math.max(0, headerHeight);
}

/** Dark service panels extend behind the fixed header only after reaching the top. */
export function isHomeServiceHeaderOverlay(pathname: string, top: number | null, bottom: number | null, headerHeight: number): boolean {
  // scrollIntoView may round to a whole pixel while layout edges remain fractional.
  const reachesViewportTop = top !== null && Number.isFinite(top) && top < 1;
  return pathname === "/" && reachesViewportTop && bottom !== null && Number.isFinite(bottom) && bottom > Math.max(0, headerHeight);
}
