/** Only in-flow copy is a header sizing input. Never tag an overlay ancestor. */
export const MENU_HEADER_COPY_SELECTOR = ".cafe-a-topline-description, .cafe-a-topline-notice-text, [data-scroll-header-copy]";
export const MENU_HEADER_CONTENT_SELECTOR = `${MENU_HEADER_COPY_SELECTOR}, [data-language-menu-trigger]`;

/** Measure the real stacked leaves and gaps, never popup/ancestor scrollHeight. */
export function measureMenuHeaderContentHeight(header: ParentNode | null): number {
  const groups = new Map<Element, {top:number;bottom:number}>();
  let required = 0;
  for (const element of header?.querySelectorAll<HTMLElement>(MENU_HEADER_CONTENT_SELECTOR) ?? []) {
    if (element.closest("[data-language-menu-surface]")) continue;
    const rect = element.getBoundingClientRect();
    const height = element.hasAttribute("data-language-menu-trigger") ? rect.height : Math.max(rect.height, element.scrollHeight);
    const stack = element.closest("[data-menu-header-info-stack]");
    if (!stack) { required = Math.max(required,height); continue; }
    const previous = groups.get(stack), top = rect.top, bottom = top + height;
    groups.set(stack,{top:Math.min(previous?.top ?? top,top),bottom:Math.max(previous?.bottom ?? bottom,bottom)});
  }
  for (const group of groups.values()) required = Math.max(required,group.bottom-group.top);
  return required;
}
