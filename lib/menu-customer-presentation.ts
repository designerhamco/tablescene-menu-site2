/** Channel changes layout only. Signed table sessions still authorize every action. */
export function buildCustomerMenuPath(path: string) {
  if (!path.startsWith("/menu/")) return path;
  const url = new URL(path, "https://menu.invalid");
  url.searchParams.set("mode", "customer");
  return url.pathname + url.search + url.hash;
}
export function usesCustomerMenuPresentation(
  mode: unknown,
  templateKey: string | null | undefined,
) {
  return mode === "customer" && templateKey !== "display_menu_a";
}
