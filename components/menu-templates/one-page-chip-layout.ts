export function shouldPlaceOnePageChipBelow(nameWidth: number, chipWidth: number, availableWidth: number, gap = 0) {
  return [nameWidth, chipWidth, availableWidth, gap].every(Number.isFinite) &&
    nameWidth > 0 && chipWidth > 0 && availableWidth > 0 &&
    nameWidth <= availableWidth + 0.5 && nameWidth + chipWidth + gap > availableWidth + 0.5;
}

/** Synchronous: the candidate fitter and final DOM safety see the same chip placement. */
export function applyOnePageChipLayouts(menu: HTMLElement) {
  if (!menu.closest('[data-cafe-a-adaptive-fit="true"]')) return;
  for (const row of menu.querySelectorAll<HTMLElement>(".cafe-a-menu-title-row:has(.cafe-a-title-chips)")) {
    const name = row.querySelector<HTMLElement>("[data-cafe-a-menu-name]");
    const chips = row.querySelector<HTMLElement>(".cafe-a-title-chips");
    if (!name || !chips || row.clientWidth <= 0) continue;
    row.removeAttribute("data-cafe-a-chip-placement");
    const previousStyle = name.getAttribute("style");
    name.style.whiteSpace = "nowrap";
    name.style.width = "max-content";
    name.style.maxWidth = "none";
    name.style.flexShrink = "0";
    const nameWidth = name.getBoundingClientRect().width;
    const chipWidth = chips.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const extras = [...row.children].filter((element) => element !== name && element !== chips && !element.classList.contains("cafe-a-round-focus-price-leader"));
    const extraWidth = extras.reduce((sum, element) => sum + element.getBoundingClientRect().width + gap, 0);
    if (previousStyle === null) name.removeAttribute("style"); else name.setAttribute("style", previousStyle);
    if (shouldPlaceOnePageChipBelow(nameWidth, chipWidth, row.clientWidth - extraWidth, gap)) row.dataset.cafeAChipPlacement = "below";
  }
}
