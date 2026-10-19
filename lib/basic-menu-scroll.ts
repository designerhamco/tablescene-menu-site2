import type { MeasuredMenuBlock } from "./basic-menu-pagination";

/** Fill changes column flow, not typography or the semantic spacing rhythm. */
export const SCROLL_FILL_MIN_OCCUPANCY = 0.8;
export const SCROLL_FILL_MAX_TYPE_LOSS = 0.08;
export type ScrollableMenuBlock = MeasuredMenuBlock & { gapAfter?: number };
export type ScrollableMenuLayout = {
  columns: ScrollableMenuBlock[][];
  height: number;
  contentHeight: number;
  naturalHeights: number[];
  footerColumn: number;
  viewportHeight: number;
};
type Atom = { blocks: ScrollableMenuBlock[]; height: number; trailingGap: number };
const gapOf = (block: ScrollableMenuBlock | undefined) => Math.max(0, block?.gapAfter ?? 0);

/** A category is atomic in grouped mode; only its title + first product are atomic in flow. */
function makeAtoms(blocks: readonly ScrollableMenuBlock[], grouped: boolean, footerHeight: number): Atom[] {
  const atoms: Atom[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const members = [blocks[i]];
    if (grouped && blocks[i].kind !== "widget") {
      while (blocks[i + 1]?.kind !== "widget" && blocks[i + 1]?.group === members[0].group)
        members.push(blocks[++i]);
    } else if (blocks[i].kind === "heading" && blocks[i + 1]?.kind === "item" && blocks[i + 1].group === blocks[i].group) {
      members.push(blocks[++i]);
    }
    atoms.push({ blocks: members, height: members.reduce((sum, b) => sum + b.height, 0), trailingGap: gapOf(members.at(-1)) });
  }
  // Notices belong to the final real block: they cannot create an otherwise empty column.
  const last = atoms.at(-1);
  if (last && footerHeight > 0) {
    last.height += footerHeight;
    last.trailingGap = 0;
  }
  return atoms;
}
function partition(atoms: readonly Atom[], capacity: number, firstColumnInset: number) {
  const columns: ScrollableMenuBlock[][] = [[]];
  let used = firstColumnInset;
  for (const atom of atoms) {
    if (columns.at(-1)!.length && used + atom.height - atom.trailingGap > capacity + 0.01) {
      columns.push([]);
      used = 0;
    }
    columns.at(-1)!.push(...atom.blocks);
    used += atom.height;
  }
  return columns;
}

/** One scrolling surface. No page count, repeated headings, compression or content reordering. */
export function layoutScrollableMenu(
  blocks: readonly ScrollableMenuBlock[],
  columnCount: number,
  viewportHeight: number,
  grouped = false,
  options: { footerHeight?: number; firstColumnInset?: number } = {},
): ScrollableMenuLayout {
  const count = Math.max(1, Math.floor(columnCount));
  const viewport = Math.max(1, viewportHeight);
  const footerHeight = Math.max(0, options.footerHeight ?? 0);
  const firstColumnInset = Math.max(0, options.firstColumnInset ?? 0);
  const atoms = makeAtoms(blocks, grouped, footerHeight);
  let low = Math.ceil(Math.max(1, firstColumnInset + (atoms[0] ? atoms[0].height - atoms[0].trailingGap : 0), ...atoms.map(a => a.height - a.trailingGap), grouped ? viewport : 0));
  let high = Math.ceil(Math.max(low, firstColumnInset + atoms.reduce((sum, atom) => sum + atom.height, 0)));
  // Flow balances contiguous reading runs independently of the viewport floor.
  // Grouped retains category-first flow with a viewport-sized minimum canvas.
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (partition(atoms, middle, firstColumnInset).length <= count) high = middle;
    else low = middle + 1;
  }
  const columns = partition(atoms, low, firstColumnInset);
  while (columns.length < count) columns.push([]);
  const footerColumn = Math.max(0, columns.findLastIndex(column => column.length > 0));
  const naturalHeights = columns.map((column, index) =>
    (index === 0 ? firstColumnInset : 0) + column.reduce((sum, block) => sum + block.height, 0) -
    (index === footerColumn && footerHeight > 0 ? 0 : gapOf(column.at(-1))) +
    (index === footerColumn ? footerHeight : 0));
  const contentHeight = blocks.length
    ? Math.max(grouped ? viewport : 0, ...naturalHeights)
    : footerHeight;
  return { columns, height: Math.max(viewport, contentHeight), contentHeight, naturalHeights, footerColumn, viewportHeight: viewport };
}

export type ScrollableMenuNameMeasurement = {
  id: string;
  availableWidth: number;
  naturalWidth: number;
  fontSize: number;
  lines: number;
  overflow: boolean;
};
export type ScrollableMenuCandidate = {
  columnCount: number; columnWidth: number; layout: ScrollableMenuLayout; itemSize?: number;
  /** Measured at the SAME device typography ceiling, before any grouped fit. */
  names?: readonly ScrollableMenuNameMeasurement[];
};

/** Do not buy a shorter scroll with cramped product names. A single very long
 * name need not change the board unless the wider candidate actually helps it. */
export function shouldPreferWiderScrollableNames(narrow: readonly ScrollableMenuNameMeasurement[], wide: readonly ScrollableMenuNameMeasurement[]) {
  const widerById = new Map(wide.map(name => [name.id, name]));
  let improvedCrampedNames = 0;
  for (const name of narrow) {
    const wider = widerById.get(name.id);
    if (!wider || wider.availableWidth < name.availableWidth * 1.15) continue;
    const improvesOverflow = name.overflow && !wider.overflow;
    const improvesWrapping = wider.lines < name.lines;
    if (!improvesOverflow && !improvesWrapping) continue;
    if (improvesOverflow || name.lines >= 3) return true;
    // Eight em is a width budget, not a forced one-line/character-count rule.
    // Short labels use only their own natural width and remain eligible for 3.
    const desiredWidth = Math.min(name.naturalWidth, name.fontSize * 8);
    if (name.lines > 1 && name.availableWidth < desiredWidth - name.fontSize * .25) improvedCrampedNames++;
  }
  return improvedCrampedNames >= 2;
}
/** Prefer readable width to underfilled/empty columns. Sparse content stays honestly sparse. */
export function selectScrollableMenuCandidate(candidates: readonly ScrollableMenuCandidate[], grouped = false) {
  const preferred = candidates.filter(candidate => candidate.columnCount >= 1 && candidate.columnCount <= 3);
  if (!preferred.length) throw new Error("At least one measured 1–3-column scroll candidate is required");
  const two = preferred.find(candidate => candidate.columnCount === 2 && candidate.layout.columns.every(column => column.length));
  const three = preferred.find(candidate => candidate.columnCount === 3 && candidate.layout.columns.every(column => column.length));
  if (two?.names && three?.names && shouldPreferWiderScrollableNames(three.names, two.names)) return two;
  return selectPreferredScrollCandidate(preferred, grouped);
}

function selectPreferredScrollCandidate(candidates: readonly ScrollableMenuCandidate[], grouped: boolean) {
  const ordered = [...candidates].sort((a, b) => b.columnCount - a.columnCount);
  const nonempty = ordered.filter(candidate => candidate.columnCount === 1 || candidate.layout.columns.every(column => column.length));
  // Never choose a narrower-count overflow when a readable candidate fits one viewport.
  const fitting = nonempty.filter(candidate => candidate.layout.naturalHeights.every(height => height <= candidate.layout.viewportHeight + 0.1));
  const largestFittingType = Math.max(0, ...fitting.map(candidate => candidate.itemSize ?? 0));
  // Do not shrink readable type substantially just to hide another column's whitespace.
  const eligible = fitting.length ? fitting.filter(candidate => !candidate.itemSize ||
    candidate.itemSize >= largestFittingType * (1 - SCROLL_FILL_MAX_TYPE_LOSS)) : nonempty;
  if (!fitting.length) {
    if (grouped) return eligible[0] ?? ordered.at(-1)!;
    // At the fixed readable type size, use the arrangement with the least
    // actual scrolling; narrower tracks can wrap enough to be taller.
    return [...nonempty].sort((a, b) =>
      Math.max(...a.layout.naturalHeights) - Math.max(...b.layout.naturalHeights) ||
      b.columnCount - a.columnCount)[0] ?? ordered.at(-1)!;
  }
  return eligible.find(candidate => candidate.columnCount === 1 || grouped ||
    candidate.layout.naturalHeights.reduce((sum, height) => sum + height, 0) /
      (candidate.columnCount * candidate.layout.viewportHeight) >= SCROLL_FILL_MIN_OCCUPANCY) ?? eligible.at(-1)!;
}
