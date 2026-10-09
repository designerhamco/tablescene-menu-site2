export type KohiBox = { left: number; right: number; top: number; bottom: number };
export type KohiColumn = { left: number; right: number };
export type KohiDividerSegment = KohiBox & { group: string; kind: "heading" | "item" | "widget" };
export type KohiDividerLine = { kind: "column" | "heading" | "category"; x1: number; y1: number; x2: number; y2: number };

const finiteBox = (box: KohiBox) => Object.values(box).every(Number.isFinite) && box.right > box.left && box.bottom > box.top;

// All coordinates are relative to the page, not the padded content canvas.
// Item/heading fragments are measured separately: a multi-column category's
// bounding box would also cover the empty space between its fragments.
export function getKohiDividerLines({
  width,
  height,
  columns,
  segments,
  brandRight,
}: {
  width: number;
  height: number;
  columns: KohiColumn[];
  segments: KohiDividerSegment[];
  brandRight?: number;
}): KohiDividerLine[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const sortedColumns = columns.filter((column) => Number.isFinite(column.left) && Number.isFinite(column.right) && column.right > column.left).sort((a, b) => a.left - b.left);
  if (sortedColumns.length === 0) return [];
  const clampX = (x: number) => Math.max(0, Math.min(width, x));
  const edges = [
    typeof brandRight === "number" && Number.isFinite(brandRight) ? clampX((brandRight + sortedColumns[0].left) / 2) : 0,
    ...sortedColumns.slice(1).map((column, index) => clampX((sortedColumns[index].right + column.left) / 2)),
    width,
  ];
  const lines: KohiDividerLine[] = edges.slice(0, -1).filter((x) => x > 0 && x < width).map((x) => ({ kind: "column", x1: x, y1: 0, x2: x, y2: height }));
  const addHorizontal = (kind: "heading" | "category", y: number, columnIndex: number) => {
    if (!Number.isFinite(y) || y <= 0 || y >= height) return;
    const x1 = edges[columnIndex];
    const x2 = edges[columnIndex + 1];
    if (x2 > x1) lines.push({ kind, x1, y1: y, x2, y2: y });
  };

  sortedColumns.forEach((column, columnIndex) => {
    const fragments = segments.filter((segment) => {
      if (!finiteBox({ left: segment.left, right: segment.right, top: segment.top, bottom: segment.bottom })) return false;
      const center = (segment.left + segment.right) / 2;
      return center >= column.left - 2 && center <= column.right + 2;
    }).sort((a, b) => a.top - b.top);
    fragments.forEach((fragment, index) => {
      const previous = fragments[index - 1];
      if (previous && previous.group !== fragment.group && fragment.top > previous.bottom) {
        addHorizontal("category", (previous.bottom + fragment.top) / 2, columnIndex);
      }
      const next = fragments[index + 1];
      if (fragment.kind === "heading" && next?.kind === "item" && next.group === fragment.group && next.top > fragment.bottom) {
        addHorizontal("heading", (fragment.bottom + next.top) / 2, columnIndex);
      }
    });
  });
  return lines;
}
