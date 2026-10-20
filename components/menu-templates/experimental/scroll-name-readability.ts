import type { ScrollableMenuNameMeasurement } from "@/lib/basic-menu-scroll";

/** Read item/category title slots after thumbnails, price rails, gaps and chips.
 * Text-node ranges avoid counting ScriptAwareText wrappers twice, and preserve
 * actual font/script/word-break behavior instead of estimating from characters. */
export function measureScrollableNames(container: HTMLElement): ScrollableMenuNameMeasurement[] {
  return [...container.querySelectorAll<HTMLElement>('[data-measure-id][data-kind="item"],[data-measure-id][data-kind="heading"]')].flatMap(row => {
    const heading = row.dataset.kind === "heading";
    const name = row.querySelector<HTMLElement>(heading ? "[data-cafe-a-category-title-text]" : "[data-cafe-a-menu-name]");
    if (!name?.textContent?.trim()) return [];
    const bounds = name.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(name).fontSize) || 16;
    const tops: number[] = [];
    let naturalWidth = 0;
    let overflow = false;
    const walker = document.createTreeWalker(name, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    while (walker.nextNode()) {
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) {
        if (rect.width < .1 || rect.height < .1) continue;
        naturalWidth += rect.width;
        if (!tops.some(top => Math.abs(top - rect.top) < fontSize * .5)) tops.push(rect.top);
        if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) overflow = true;
      }
    }
    return [{
      id: row.dataset.measureId!, role: heading ? "category" : "item", availableWidth: bounds.width, naturalWidth,
      fontSize, lines: Math.max(1, tops.length), overflow,
    }];
  });
}
