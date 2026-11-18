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
  return pathname === "/" && top !== null && bottom !== null && Number.isFinite(top) && Number.isFinite(bottom) && top <= 0 && bottom > Math.max(0, headerHeight);
}
