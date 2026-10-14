import assert from "node:assert/strict";
import test from "node:test";
import { getKohiDividerLines, type KohiDividerSegment } from "./kohi-divider-geometry";

const box = (group: string, kind: KohiDividerSegment["kind"], left: number, top: number, bottom: number): KohiDividerSegment => ({ group, kind, left, right: left + 160, top, bottom });
const columns = [{ left: 220, right: 380 }, { left: 420, right: 580 }];

test("KOHI page rules reach the page edges without moving the padded content", () => {
  const lines = getKohiDividerLines({ width: 640, height: 480, columns, brandRight: 180, segments: [box("a", "heading", 220, 20, 50), box("a", "item", 220, 70, 100), box("b", "heading", 420, 20, 50), box("b", "item", 420, 70, 100)] });
  assert.deepEqual(lines.filter((line) => line.kind === "column").map((line) => [line.x1, line.y1, line.y2]), [[200, 0, 480], [400, 0, 480]]);
  assert.deepEqual(lines.filter((line) => line.kind === "heading").map((line) => [line.x1, line.y1, line.x2]), [[200, 60, 400], [400, 60, 640]]);
  assert.equal(columns[0].left, 220);
});

test("KOHI category rules stay in their own column and in empty gaps", () => {
  const lines = getKohiDividerLines({ width: 640, height: 480, columns, segments: [box("a", "item", 220, 80, 130), box("b", "heading", 220, 160, 190), box("b", "item", 220, 210, 240), box("c", "item", 420, 110, 260)] });
  assert.deepEqual(lines.filter((line) => line.kind === "category"), [{ kind: "category", x1: 0, y1: 145, x2: 400, y2: 145 }]);
});

test("KOHI fill-mode continuation does not invent a heading or category boundary", () => {
  const lines = getKohiDividerLines({ width: 640, height: 480, columns, segments: [box("a", "heading", 220, 20, 50), box("a", "item", 220, 70, 440), box("a", "item", 420, 20, 90), box("b", "heading", 420, 120, 150), box("b", "item", 420, 170, 210)] });
  assert.equal(lines.filter((line) => line.kind === "heading").length, 2);
  assert.deepEqual(lines.filter((line) => line.kind === "category").map((line) => [line.x1, line.y1, line.x2]), [[400, 105, 640]]);
});

test("KOHI single-column mobile rules span the page without vertical lines", () => {
  const lines = getKohiDividerLines({ width: 390, height: 1600, columns: [{ left: 20, right: 370 }], segments: [box("a", "heading", 20, 500, 530), box("a", "item", 20, 550, 610)] });
  assert.deepEqual(lines, [{ kind: "heading", x1: 0, y1: 540, x2: 390, y2: 540 }]);
});

test("KOHI invalid or overlapping measurements never draw through content", () => {
  assert.deepEqual(getKohiDividerLines({ width: Number.NaN, height: 400, columns, segments: [] }), []);
  assert.deepEqual(getKohiDividerLines({ width: 640, height: 400, columns: [], segments: [] }), []);
  const lines = getKohiDividerLines({ width: 640, height: 480, columns, segments: [box("a", "heading", 220, 20, 60), box("a", "item", 220, 55, 100)] });
  assert.equal(lines.some((line) => line.kind === "heading"), false);
});

test("KOHI mobile rules measure whitespace from stroke edges instead of the old midpoint", () => {
  const lines = getKohiDividerLines({ width: 390, height: 1600, columns: [{ left: 24, right: 366 }], mobileSpacing: { headingBefore: 8, categoryAfter: 12, strokeWidth: 1 }, segments: [box("a", "heading", 24, 100, 130), box("a", "item", 24, 163, 200), box("b", "heading", 24, 261, 291), box("b", "item", 24, 324, 380)] });
  assert.equal(lines.find((line) => line.kind === "heading")?.y1, 138.5);
  assert.equal(163 - (138.5 + 0.5), 24);
  assert.equal(lines.find((line) => line.kind === "category")?.y1, 248.5);
  assert.equal(261 - (248.5 + 0.5), 12);
});

test("KOHI canvas rules link category leading space to outer insets and equalize text-to-stroke gaps", () => {
  const inset = 16, gap = inset, stroke = 1.6;
  const headingBottom = 90, itemTop = headingBottom + gap * 2 + stroke;
  const itemBottom = 200, nextHeadingTop = itemBottom + gap + inset + stroke;
  const lines = getKohiDividerLines({ width: 640, height: 480, columns,
    canvasSpacing: { categoryBefore: inset, contentGap: gap, strokeWidth: stroke },
    segments: [box("a", "heading", 220, inset, headingBottom), box("a", "item", 220, itemTop, itemBottom), box("b", "heading", 220, nextHeadingTop, nextHeadingTop + 50)] });
  const headingLine = lines.find(line => line.kind === "heading")!;
  const categoryLine = lines.find(line => line.kind === "category")!;
  for (const actual of [headingLine.y1 - stroke / 2 - headingBottom, itemTop - headingLine.y1 - stroke / 2, categoryLine.y1 - stroke / 2 - itemBottom]) {
    assert.ok(Math.abs(actual - gap) < 0.001);
  }
  assert.ok(Math.abs(nextHeadingTop - categoryLine.y1 - stroke / 2 - inset) < 0.001);
});
