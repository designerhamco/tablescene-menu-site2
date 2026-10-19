import { paginateMenuBlocks, type MeasuredMenuBlock } from "./basic-menu-pagination";

/** Keep reading sizes and registered order; extend a shared scroll canvas instead of adding pages. */
export function layoutScrollableMenu(
  blocks: readonly MeasuredMenuBlock[],
  columnCount: number,
  viewportHeight: number,
  grouped = false,
) {
  const count = Math.max(1, Math.floor(columnCount));
  const groups = new Map<string, number>();
  for (const block of blocks) groups.set(block.group, (groups.get(block.group) ?? 0) + block.height);
  const largestBlock = Math.max(1, ...blocks.map(block => block.height));
  // Grouped mode keeps even a tall category together; scrolling removes the old viewport limit.
  let low = Math.ceil(Math.max(1, viewportHeight, largestBlock, grouped ? Math.max(0, ...groups.values()) : 0));
  let high = Math.ceil(Math.max(low, blocks.reduce((sum, block) => sum + block.height, 0)));
  // One continuous reading surface: a column break never starts a new category.
  // Keep the pagination helper's repeated-heading default for its other callers.
  const partition = (height: number) => paginateMenuBlocks(blocks, count, height, grouped, { repeatContinuationHeadings: false });
  const fits = (height: number) => {
    const pages = partition(height);
    return pages.length === 1 && pages[0].overflow.length === 0;
  };
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (fits(middle)) high = middle;
    else low = middle + 1;
  }
  return { columns: partition(low)[0].columns, height: low };
}
