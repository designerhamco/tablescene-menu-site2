/** The Dining introduction alone continues its dark canvas behind the header. */
export function getSiteHeaderSurface(pathname: string): "dark" | "default" {
  return pathname.replace(/\/$/, "") === "/services/dining" ? "dark" : "default";
}
