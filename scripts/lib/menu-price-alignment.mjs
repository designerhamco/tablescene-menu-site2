/** Read-only browser measurement. Inline script spans expose individual wrapped lines. */
export function measureMenuPriceAlignment() {
  const visible = (element) => {
    const rect = element?.getBoundingClientRect();
    return Boolean(rect?.width > 0 && rect?.height > 0 && getComputedStyle(element).visibility !== "hidden");
  };
  return Array.from(document.querySelectorAll('[data-cafe-a-proportion-policy="true"] [data-cafe-a-menu-item]'))
    .filter(visible)
    .flatMap((item) => {
      const name = item.querySelector("[data-cafe-a-menu-name]");
      const price = item.querySelector("[data-cafe-a-menu-price]");
      if (!visible(name) || !visible(price)) return [];
      const nameText = Array.from(name.querySelectorAll(".cafe-a-script-ko, .cafe-a-script-en")).find(visible) ?? name;
      const nameLine = Array.from(nameText.getClientRects()).find((rect) => rect.width > 0 && rect.height > 0);
      if (!nameLine) return [];
      const priceRect = price.getBoundingClientRect();
      return [{
        name: name.textContent?.trim() ?? "",
        nameFirstLine: { top: nameLine.top, bottom: nameLine.bottom },
        priceAnchor: { top: priceRect.top, bottom: priceRect.bottom },
      }];
    });
}

/**
 * Price blocks may contain stacked option discounts, but their anchor must overlap
 * the NAME'S FIRST line. Comparing with the entire h3/copy box misses this bug.
 * @param {Array<{name: string, nameFirstLine: {top: number, bottom: number}, priceAnchor: {top: number, bottom: number}}>} measurements
 */
export function getMenuPriceAlignmentFailures(measurements) {
  return measurements.filter(({ nameFirstLine, priceAnchor }) => (
    priceAnchor.top >= nameFirstLine.bottom || priceAnchor.bottom <= nameFirstLine.top
  ));
}
