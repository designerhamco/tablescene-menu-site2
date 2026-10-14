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
  mobileSpacing,
  canvasSpacing,
  canvasBounds,
}: {
  width: number;
  height: number;
  columns: KohiColumn[];
  segments: KohiDividerSegment[];
  brandRight?: number;
  mobileSpacing?: { headingBefore: number; categoryAfter: number; strokeWidth: number };
  canvasSpacing?: { categoryBefore: number; contentGap: number; strokeWidth: number };
  canvasBounds?: KohiBox;
}): KohiDividerLine[] {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  const sortedColumns = columns.filter((column) => Number.isFinite(column.left) && Number.isFinite(column.right) && column.right > column.left).sort((a, b) => a.left - b.left);
  if (sortedColumns.length === 0) return [];
  const boundedCanvas = canvasBounds && finiteBox(canvasBounds)
    ? {
        left: Math.max(0, Math.min(width, canvasBounds.left)),
        right: Math.max(0, Math.min(width, canvasBounds.right)),
        top: Math.max(0, Math.min(height, canvasBounds.top)),
        bottom: Math.max(0, Math.min(height, canvasBounds.bottom)),
      }
    : { left: 0, right: width, top: 0, bottom: height };
  if (boundedCanvas.right <= boundedCanvas.left || boundedCanvas.bottom <= boundedCanvas.top) return [];
  const clampX = (x: number) => Math.max(boundedCanvas.left, Math.min(boundedCanvas.right, x));
  const edges = [
    typeof brandRight === "number" && Number.isFinite(brandRight) ? clampX((brandRight + sortedColumns[0].left) / 2) : boundedCanvas.left,
    ...sortedColumns.slice(1).map((column, index) => clampX((sortedColumns[index].right + column.left) / 2)),
    boundedCanvas.right,
  ];
  const lines: KohiDividerLine[] = edges.slice(0, -1).filter((x) => x > boundedCanvas.left && x < boundedCanvas.right).map((x) => ({ kind: "column", x1: x, y1: boundedCanvas.top, x2: x, y2: boundedCanvas.bottom }));
  const addHorizontal = (kind: "heading" | "category", y: number, columnIndex: number) => {
    if (!Number.isFinite(y) || y <= boundedCanvas.top || y >= boundedCanvas.bottom) return;
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
        const spacing = canvasSpacing ? { categoryAfter: canvasSpacing.categoryBefore, strokeWidth: canvasSpacing.strokeWidth } : mobileSpacing;
        const y = spacing && fragment.kind === "heading" ? fragment.top - spacing.categoryAfter - spacing.strokeWidth / 2 : (previous.bottom + fragment.top) / 2;
        if (y > previous.bottom && y < fragment.top) addHorizontal("category", y, columnIndex);
      }
      const next = fragments[index + 1];
      if (fragment.kind === "heading" && next?.kind === "item" && next.group === fragment.group && next.top > fragment.bottom) {
        const spacing = canvasSpacing ? { headingBefore: canvasSpacing.contentGap, strokeWidth: canvasSpacing.strokeWidth } : mobileSpacing;
        const y = spacing ? fragment.bottom + spacing.headingBefore + spacing.strokeWidth / 2 : (fragment.bottom + next.top) / 2;
        if (y > fragment.bottom && y < next.top) addHorizontal("heading", y, columnIndex);
      }
    });
  });
  return lines;
}
