/** Physical fragments, rather than a multi-column union box, own flow boundaries. */
export function getOrderedFlowNextBlockTypes<T>(fragments: readonly {
  block: T; type: string | undefined; left: number; top: number; order: number;
}[], tolerance = 3): Map<T, "category" | "widget"> {
  const columns: Array<{left: number; fragments: typeof fragments[number][]}> = [];
  for (const fragment of fragments) {
    let column = columns.find(column => Math.abs(column.left - fragment.left) <= tolerance);
    if (!column) { column = {left: fragment.left, fragments: []}; columns.push(column); }
    column.fragments.push(fragment);
  }
  const result = new Map<T, "category" | "widget">();
  for (const column of columns.sort((a,b) => a.left-b.left)) {
    const ordered = column.fragments.sort((a,b) => a.top-b.top || a.order-b.order);
    for (let i=0; i<ordered.length; i++) {
      // Only the last physical fragment's follower applies to a block margin.
      result.delete(ordered[i].block);
      const next = ordered[i+1]?.type;
      if (next === "category" || next === "widget") result.set(ordered[i].block, next);
    }
  }
  return result;
}
