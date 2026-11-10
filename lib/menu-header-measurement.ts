/** Only in-flow copy is a header sizing input. Never tag an overlay ancestor. */
export const MENU_HEADER_COPY_SELECTOR = ".cafe-a-topline-description, .cafe-a-topline-notice-text, [data-scroll-header-copy]";
export const MENU_HEADER_CONTENT_SELECTOR = `${MENU_HEADER_COPY_SELECTOR}, [data-language-menu-trigger]`;

/** Absolute popup overflow must never reserve header or menu canvas space. */
export function measureMenuHeaderContentHeight(header: ParentNode | null): number {
  return Math.max(0, ...[...header?.querySelectorAll<HTMLElement>(MENU_HEADER_CONTENT_SELECTOR) ?? []]
    .filter(element => !element.closest("[data-language-menu-surface]"))
    .map(element => {
      const height = element.getBoundingClientRect().height;
      return element.hasAttribute("data-language-menu-trigger") ? height : Math.max(height, element.scrollHeight);
    }));
}
