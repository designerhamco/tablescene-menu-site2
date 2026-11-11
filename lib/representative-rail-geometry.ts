/** PC/tablet side-rail geometry. Panel padding belongs to the painted rail;
 * every representative/menu content column receives the same usable width.
 * A menu divider widens only menu-to-menu gaps, never the rail boundary. */
export function getRepresentativeRailGeometry(contentWidth: number, panelPadding: number, gap: number, menuColumns: number, scrollbar = 0, menuGap = gap) {
  const count = Math.max(1, Math.min(3, Math.floor(menuColumns)));
  const trackWidth = Math.max(0, (contentWidth - panelPadding - gap - menuGap * (count - 1) - scrollbar) / (count + 1));
  return {
    trackWidth,
    railWidth: trackWidth + panelPadding,
    menuWidth: trackWidth * count + menuGap * (count - 1),
  };
}
