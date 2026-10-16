// The public navigation destinations alone use the compact glass header.
const GLASS_HEADER_PATHS = new Set([
  "/", "/services/basic", "/services/menu", "/services/signature",
  "/services/display", "/services/screen", "/services/full-option",
  "/tablescene-pro", "/faq", "/apply",
]);

export function supportsGlassSiteHeader(pathname: string) {
  return GLASS_HEADER_PATHS.has(pathname.replace(/\/$/, "") || "/");
}
