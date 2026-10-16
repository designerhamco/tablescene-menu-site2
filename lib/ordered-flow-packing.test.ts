import test from "node:test";
import assert from "node:assert/strict";
import { getOrderedFlowCapacities, getOrderedFlowColumnWidth, packOrderedFlow } from "./ordered-flow-packing";

test("ordered products continue across columns while the final footer keeps its own budget", () => {
  const result = packOrderedFlow(Array.from({ length: 7 }, () => ({ height: 30, gapBefore: 10 })), [120, 120, 50]);
  assert.equal(result.overflow, false);
  assert.deepEqual(result.placements.map(p => p.column), [0, 0, 0, 1, 1, 1, 2]);
  assert.deepEqual(result.heights, [110, 110, 30]);
});
test("a heading and first product never split or gain a leading category gap", () => {
  const result = packOrderedFlow([{ height: 70, gapBefore: 0 }, { height: 65, gapBefore: 40 }, { height: 20, gapBefore: 10 }], [100, 100]);
  assert.equal(result.overflow, false);
  assert.deepEqual(result.placements, [{ column: 0, top: 0 }, { column: 1, top: 0 }, { column: 1, top: 75 }]);
});
test("oversized content remains a failed fit instead of creating an offscreen column", () => {
  const result = packOrderedFlow([{ height: 80, gapBefore: 0 }, { height: 80, gapBefore: 20 }], [90, 60]);
  assert.equal(result.overflow, true);
  assert.equal(result.placements.length, 2);
  assert.ok(result.placements.every(p => p.column < 2));
});

test("a separator's leading whitespace is removed only at a new column edge", () => {
  const result = packOrderedFlow([{ height: 70, gapBefore: 0 }, { height: 65, gapBefore: 20, leadingTrim: 15 }, { height: 25, gapBefore: 10 }], [100, 90]);
  assert.equal(result.overflow, false);
  assert.deepEqual(result.heights, [70, 85]);
  assert.deepEqual(result.placements, [{ column: 0, top: 0 }, { column: 1, top: 0 }, { column: 1, top: 60 }]);
});


test("footer clearance replaces the open-edge buffer instead of deducting it twice", () => {
  const capacities = getOrderedFlowCapacities(200, 3, 60);
  assert.deepEqual(capacities, [192, 192, 140]);
  const rows = [{ height: 180, gapBefore: 0 }, { height: 180, gapBefore: 20 }, { height: 135, gapBefore: 20 }];
  assert.equal(packOrderedFlow(rows, capacities).overflow, false);
  assert.deepEqual(getOrderedFlowCapacities(200, 3), [192, 192, 192]);
});


test("short actual copy still shares the final track with its footer", () => {
  const result = packOrderedFlow([{ height: 80, gapBefore: 10 }, { height: 80, gapBefore: 10 }, { height: 40, gapBefore: 10 }], [300, 300, 100]);
  assert.equal(result.overflow, false);
  assert.deepEqual(result.heights, [80, 80, 40]);
  assert.deepEqual(result.placements.map(p => p.column), [0, 1, 2]);
});


test("rescue eligibility uses actual inner copy width including panel padding and brand track", () => {
  assert.equal(getOrderedFlowColumnWidth(1008, 32, 32, 72, 4), 182);
  assert.ok(getOrderedFlowColumnWidth(1008, 32, 32, 72, 4) < 12 * 16);
  assert.equal(getOrderedFlowColumnWidth(1200, 0, 0, 30, 5), 216);
});
