export type MeasuredMenuBlock = {
  id: string;
  group: string;
  height: number;
  kind: "heading" | "item" | "widget";
};
export type MenuPagePartition = {
  columns: MeasuredMenuBlock[][];
  overflow: string[];
};
/** Ordered, bounded pagination. Only category boundaries may move as a group. */
export function paginateMenuBlocks(
  blocks: readonly MeasuredMenuBlock[],
  columnCount: number,
  capacity: number,
  grouped = false,
): MenuPagePartition[] {
  const count = Math.max(1, Math.floor(columnCount)),
    height = Math.max(1, capacity);
  const headings = new Map(
    blocks.filter((b) => b.kind === "heading").map((b) => [b.group, b]),
  );
  const pages: MenuPagePartition[] = [];
  let page: MenuPagePartition = {
      columns: Array.from({ length: count }, () => []),
      overflow: [],
    },
    column = 0,
    used = 0;
  const advance = () => {
    column++;
    used = 0;
    if (column >= count) {
      pages.push(page);
      page = { columns: Array.from({ length: count }, () => []), overflow: [] };
      column = 0;
    }
  };
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i],
      next = blocks[i + 1];
    if (grouped && (i === 0 || blocks[i - 1].group !== b.group) && used > 0) {
      let size = 0;
      for (let j = i; j < blocks.length && blocks[j].group === b.group; j++)
        size += blocks[j].height;
      if (size <= height && used + size > height) advance();
    }
    const pair =
      b.kind === "heading" && next?.group === b.group
        ? b.height + next.height
        : b.height;
    if (used > 0 && used + pair > height) advance();
    if (used === 0 && b.kind === "item") {
      const h = headings.get(b.group);
      if (h) {
        page.columns[column].push(h);
        used += h.height;
      }
    }
    if (used + b.height > height) page.overflow.push(b.id);
    page.columns[column].push(b);
    used += b.height;
  }
  if (page.columns.some((c) => c.length) || !pages.length) pages.push(page);
  return pages;
}

export type MenuPaginationCandidate = { columns: number; pages: MenuPagePartition[] };
/** Minimize page turns first, then prefer the widest equally effective columns.
 * Each candidate is measured independently, so wrapping is never estimated.
 */
export function selectMenuPaginationCandidate(candidates: readonly MenuPaginationCandidate[]): MenuPaginationCandidate {
  if (!candidates.length) throw new Error("At least one measured menu layout is required");
  const overflow = (candidate: MenuPaginationCandidate) => candidate.pages.reduce((sum, page) => sum + page.overflow.length, 0);
  return [...candidates].sort((a, b) => overflow(a) - overflow(b) || a.pages.length - b.pages.length || a.columns - b.columns)[0];
}
