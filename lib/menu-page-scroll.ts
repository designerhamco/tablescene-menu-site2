/** Keep column selection tied to the viewport, never to growing page content. */
export function menuPageReadingHeight(viewport: number, top: number, bottom: number, header: number, gap: number, actions: number, copyPadding = 0) {
  return Math.max(1, viewport - top - bottom - header - gap - actions - copyPadding);
}

export function getMenuReadingViewportHeight(menu: HTMLElement, fallback: number): number {
  const board = menu.closest<HTMLElement>('[data-menu-page-flow="true"]');
  if (!board) return fallback;
  const style = getComputedStyle(board), menuStyle = getComputedStyle(menu);
  const header = board.querySelector<HTMLElement>('[data-native-header], [data-basic-top-row]');
  const actions = board.querySelector<HTMLElement>('[data-menu-page-actions]');
  const value = menuPageReadingHeight(board.clientHeight,
    parseFloat(style.paddingTop) || 0, parseFloat(style.paddingBottom) || 0,
    header?.getBoundingClientRect().height ?? 0, parseFloat(style.rowGap) || 0,
    actions?.getBoundingClientRect().height ?? 0,
    (parseFloat(menuStyle.paddingTop) || 0) + (parseFloat(menuStyle.paddingBottom) || 0));
  const pixels = `${value}px`;
  if (board.style.getPropertyValue('--menu-page-reading-height') !== pixels) board.style.setProperty('--menu-page-reading-height', pixels);
  return value;
}
