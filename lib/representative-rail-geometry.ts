/** PC/tablet fixed-rail geometry. Panel padding belongs to the painted rail;
 * every representative/menu content column receives the same usable width. */
export function getRepresentativeRailGeometry(contentWidth: number, panelPadding: number, gap: number, menuColumns: number, scrollbar = 0) {
  const count = Math.max(1, Math.min(3, Math.floor(menuColumns)));
  const trackWidth = Math.max(0, (contentWidth - panelPadding - gap * count - scrollbar) / (count + 1));
  return {
    trackWidth,
    railWidth: trackWidth + panelPadding,
    menuWidth: trackWidth * count + gap * (count - 1),
  };
}
