/** A logo removes the visible heading but must not remove its native ink source. */
export function getRenderedMenuBrandElement(root: HTMLElement): HTMLElement | undefined {
  const visible = [...root.querySelectorAll<HTMLElement>("[data-cafe-a-store-title],.cafe-a-store-title,.aube-table-cover h1")]
    .find(element => element.getBoundingClientRect().width > 0 && !element.closest('[inert],[aria-hidden="true"]'));
  return visible ?? [...root.querySelectorAll<HTMLElement>("[data-cafe-a-brand-color-probe]")].find(element => !element.closest("[inert]"));
}

export function getRenderedMenuBrandColor(root: HTMLElement): string {
  const brand = getRenderedMenuBrandElement(root);
  return brand ? getComputedStyle(brand).color : getComputedStyle(root).getPropertyValue("--menu-role-brand-color").trim() || "#191c1b";
}
