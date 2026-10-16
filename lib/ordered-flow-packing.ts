/** Includes copy insets and the optional central brand track. */
export function getOrderedFlowColumnWidth(width: number, leftInset: number, rightInset: number, gap: number, tracks: number) {
  return (width - leftInset - rightInset - gap * (tracks - 1)) / Math.max(1, tracks);
}

export const ORDERED_CANVAS_EDGE_SAFETY = 8;

/** The reserved region includes its own content clearance. */
export function getOrderedFlowCapacities(height: number, columns: number, reservedHeight = 0) {
  return Array.from({ length: columns }, (_, index) => Math.max(0,
    height - (index === columns - 1 && reservedHeight > 0 ? reservedHeight : ORDERED_CANVAS_EDGE_SAFETY)));
}

export type OrderedFlowUnit = { height: number; gapBefore: number; leadingTrim?: number };
export type OrderedFlowPlacement = { column: number; top: number };

/** Ordered, atomic rows. A heading and its first product must be one unit. */
export function packOrderedFlow(units: readonly OrderedFlowUnit[], capacities: readonly number[]) {
  const placements: OrderedFlowPlacement[] = [];
  const heights = capacities.map(() => 0);
  let column = 0;
  let overflow = capacities.length === 0 && units.length > 0;
  for (const [index, unit] of units.entries()) {
    let top = heights[column] > 0 ? heights[column] + unit.gapBefore : 0;
    let unitHeight = unit.height - (top === 0 ? unit.leadingTrim ?? 0 : 0);
    // Leave an atomic row for each remaining track, rather than making the
    // final track a footer-only column when actual copy is shorter than reference.
    const needsRemainingTrack = units.length - index <= capacities.length - column - 1;
    if ((top + unitHeight > (capacities[column] ?? 0) + 0.5 || needsRemainingTrack) && heights[column] > 0 && column + 1 < capacities.length) {
      column++;
      top = 0;
      unitHeight = unit.height - (unit.leadingTrim ?? 0);
    }
    if (top + unitHeight > (capacities[column] ?? 0) + 0.5) overflow = true;
    placements.push({ column, top });
    heights[column] = top + unitHeight;
  }
  return { placements, heights, overflow };
}
