import test from "node:test";
import assert from "node:assert/strict";
import { layoutScrollableMenu } from "./basic-menu-scroll";
import type { MeasuredMenuBlock } from "./basic-menu-pagination";
const category = (id: string, count: number): MeasuredMenuBlock[] => [
  { id: `h-${id}`, group: id, kind: "heading", height: 30 },
  ...Array.from({length: count}, (_, i) => ({id: `${id}-${i}`, group: id, kind: "item" as const, height: 80})),
];
const ids = (blocks: MeasuredMenuBlock[]) => blocks.filter(b => b.kind !== "heading").map(b => b.id);
test("dense menus extend one shared canvas without losing, duplicating or reordering products", () => {
  const input = [...category("a", 20), ...category("b", 20)];
  for (const columns of [1, 2, 3]) for (const grouped of [false, true]) {
    const layout = layoutScrollableMenu(input, columns, 500, grouped);
    assert.ok(layout.height > 500);
    assert.deepEqual(ids(layout.columns.flat()), ids(input));
    assert.ok(layout.columns.every(column => column.reduce((n, b) => n + b.height, 0) <= layout.height));
    for (const column of layout.columns) {
      if (column.length) assert.equal(column[0].kind, "heading");
      assert.notEqual(column.at(-1)?.kind, "heading");
    }
  }
});
test("grouped scrolling retains a category even when it is taller than the viewport", () => {
  const input = [...category("a", 12), ...category("b", 4), ...category("c", 4)];
  const layout = layoutScrollableMenu(input, 3, 300, true);
  for (const group of ["a", "b", "c"]) assert.equal(layout.columns.filter(column => column.some(b => b.group === group)).length, 1);
});
test("flow can continue a category with its heading while preserving the widget boundary", () => {
  const input: MeasuredMenuBlock[] = [...category("a", 12), {id:"widget", group:"widget", kind:"widget", height:100}];
  const layout = layoutScrollableMenu(input, 3, 300);
  assert.ok(layout.columns.filter(column => column.some(b => b.group === "a")).length > 1);
  assert.deepEqual(ids(layout.columns.flat()), ids(input));
  assert.equal(layout.columns.flat().at(-1)?.id, "widget");
});
test("short or empty content keeps the viewport height without inventing scrolling", () => {
  assert.equal(layoutScrollableMenu(category("a", 1), 3, 500, true).height, 500);
  const empty = layoutScrollableMenu([], 2, 500);
  assert.equal(empty.height, 500);
  assert.deepEqual(empty.columns, [[], []]);
});
test("large images and changed content remain reachable without a stale fit limit", () => {
  const widget: MeasuredMenuBlock = {id:"image", group:"image", kind:"widget", height:1800};
  assert.equal(layoutScrollableMenu([widget], 2, 400).height, 1800);
  const input = category("a", 8);
  const before = layoutScrollableMenu(input, 2, 300);
  const after = layoutScrollableMenu(input.map(b => ({...b, height:b.height * 2})), 2, 300);
  assert.ok(after.height > before.height);
  assert.deepEqual(ids(after.columns.flat()), ids(before.columns.flat()));
});
