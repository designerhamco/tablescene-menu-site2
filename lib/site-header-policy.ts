// Only dining/display introductions (including their aliases) use glass.
const GLASS_HEADER_PATHS = new Set([
  "/", "/services/basic", "/services/menu", "/services/signature",
  "/services/display", "/services/screen", "/services/full-option",
  "/tablescene-pro",
]);

export function supportsGlassSiteHeader(pathname: string) {
  return GLASS_HEADER_PATHS.has(pathname.replace(/\/$/, "") || "/");
}
