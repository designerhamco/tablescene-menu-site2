export function shouldPlaceOnePageChipBelow(nameWidth: number, chipWidth: number, availableWidth: number, gap = 0) {
  return [nameWidth, chipWidth, availableWidth, gap].every(Number.isFinite) &&
    nameWidth > 0 && chipWidth > 0 && availableWidth > 0 &&
    nameWidth <= availableWidth + 0.5 && nameWidth + chipWidth + gap > availableWidth + 0.5;
}

export function hasChipAddedNameLines(inlineHeight: number, withoutChipHeight: number) {
  return Number.isFinite(inlineHeight) && Number.isFinite(withoutChipHeight) &&
    withoutChipHeight > 0 && inlineHeight > withoutChipHeight + 0.5;
}

/** Also used after a row mounts, before the parent performs its final fit check. */
export function applyOnePageChipLayout(row: HTMLElement) {
  if (!row.closest('[data-cafe-a-adaptive-fit="true"]')) return;
  const name = row.querySelector<HTMLElement>("[data-cafe-a-menu-name]");
  const chips = row.querySelector<HTMLElement>(".cafe-a-title-chips");
  if (!name || !chips || row.clientWidth <= 0) return;
  row.removeAttribute("data-cafe-a-chip-placement");
  const rowStyle = getComputedStyle(row);
  const gap = parseFloat(rowStyle.columnGap) || 0;
  const leader = row.querySelector<HTMLElement>(".cafe-a-round-focus-price-leader");
  const leaderStyle = leader ? getComputedStyle(leader) : null;
  const leaderReserve = leaderStyle?.display !== "none" && leaderStyle ? (parseFloat(leaderStyle.minWidth) || 0) + gap : 0;
  const extras = [...row.children].filter((element) => element !== name && element !== chips && element !== leader);
  const extraWidth = extras.reduce((sum, element) => sum + element.getBoundingClientRect().width + gap, 0);
  const available = row.clientWidth - (parseFloat(rowStyle.paddingLeft) || 0) - (parseFloat(rowStyle.paddingRight) || 0) - extraWidth - leaderReserve;
  const previousNameStyle = name.getAttribute("style");
  const previousChipStyle = chips.getAttribute("style");
  const restore = (element: HTMLElement, style: string | null) => {
    if (style === null) element.removeAttribute("style"); else element.setAttribute("style", style);
  };
  name.style.whiteSpace = "nowrap";
  name.style.width = "max-content";
  name.style.maxWidth = "none";
  name.style.flex = "0 0 auto";
  chips.style.width = "max-content";
  chips.style.maxWidth = "none";
  chips.style.flex = "0 0 auto";
  const nameWidth = name.getBoundingClientRect().width;
  const chipWidth = chips.getBoundingClientRect().width;
  restore(name, previousNameStyle);
  restore(chips, previousChipStyle);
  let below = shouldPlaceOnePageChipBelow(nameWidth, chipWidth, available, gap);
  if (!below && nameWidth > available + 0.5) {
    // A genuinely long name may still wrap, but the chip must not add more lines.
    const inlineHeight = name.getBoundingClientRect().height;
    chips.style.display = "none";
    const withoutChipHeight = name.getBoundingClientRect().height;
    restore(chips, previousChipStyle);
    below = hasChipAddedNameLines(inlineHeight, withoutChipHeight);
  }
  if (below) row.dataset.cafeAChipPlacement = "below";
}

/** Candidate measurement and final DOM safety see the same chip placement. */
export function applyOnePageChipLayouts(menu: HTMLElement) {
  if (!menu.closest('[data-cafe-a-adaptive-fit="true"]')) return;
  for (const row of menu.querySelectorAll<HTMLElement>(".cafe-a-menu-title-row:has(.cafe-a-title-chips)")) applyOnePageChipLayout(row);
}
