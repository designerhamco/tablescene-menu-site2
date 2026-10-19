import test from "node:test";
import assert from "node:assert/strict";
import {
  paginateMenuBlocks,
  selectMenuPaginationCandidate,
  type MeasuredMenuBlock,
} from "./basic-menu-pagination";
import {
  readMenuOrderSettings,
  getAllowedCheckoutModes,
} from "./menu-order-settings";
const block = (
  id: string,
  group: string,
  height: number,
  kind: MeasuredMenuBlock["kind"] = "item",
): MeasuredMenuBlock => ({ id, group, height, kind });
test("page boundaries preserve every menu/widget and never reorder them", () => {
  const input = [
    block("h", "a", 10, "heading"),
    ...Array.from({ length: 9 }, (_, i) => block(String(i), "a", 30)),
    block("w", "w", 40, "widget"),
  ];
  const pages = paginateMenuBlocks(input, 2, 100);
  assert.deepEqual(
    pages
      .flatMap((p) => p.columns.flat())
      .filter((b) => b.kind !== "heading")
      .map((b) => b.id),
    input.filter((b) => b.kind !== "heading").map((b) => b.id),
  );
  assert.ok(pages.every((p) => p.columns.length === 2));
  assert.ok(
    pages.every((p) =>
      p.columns.every((c) => c.reduce((n, b) => n + b.height, 0) <= 100),
    ),
  );
});
test("continued columns reserve their repeated category heading", () => {
  const p = paginateMenuBlocks(
    [block("h", "a", 20, "heading"), block("1", "a", 60), block("2", "a", 60)],
    1,
    100,
  );
  assert.equal(p.length, 2);
  assert.deepEqual(
    p[1].columns[0].map((b) => b.id),
    ["h", "2"],
  );
});
test("grouped layout moves a fitting category intact; flow may split it", () => {
  const input = [
    block("h1", "a", 10, "heading"),
    block("a", "a", 50),
    block("h2", "b", 10, "heading"),
    block("b1", "b", 20),
    block("b2", "b", 20),
  ];
  const group = paginateMenuBlocks(input, 2, 100, true),
    flow = paginateMenuBlocks(input, 2, 100, false);
  assert.deepEqual(
    group[0].columns[1].map((b) => b.id),
    ["h2", "b1", "b2"],
  );
  assert.ok(flow[0].columns[0].some((b) => b.id === "b1"));
});
test("oversized atomic content is reported rather than declared ready", () => {
  assert.deepEqual(
    paginateMenuBlocks([block("widget", "widget", 200, "widget")], 1, 100)[0]
      .overflow,
    ["widget"],
  );
});
test("absent merchant opt-in stays off and prepay is never enabled", () => {
  const off = readMenuOrderSettings({ table_order: { orderEnabled: "true" } });
  assert.equal(off.orderEnabled, false);
  const enabled = readMenuOrderSettings({
    table_order: { orderEnabled: true, mobilePrepayVisible: true },
  });
  assert.deepEqual(getAllowedCheckoutModes(enabled, "customer"), {
    postpay: true,
    prepayVisible: true,
    prepayAvailable: false,
  });
  assert.equal(
    getAllowedCheckoutModes(enabled, "terminal").prepayVisible,
    false,
  );
});

test("measured width search minimizes page turns before choosing wider columns", () => {
  const input = [block("1", "a", 60), block("2", "a", 60), block("3", "a", 60)];
  const candidates = [1, 2, 3].map(columns => ({columns, pages: paginateMenuBlocks(input, columns, 100)}));
  assert.equal(selectMenuPaginationCandidate(candidates).columns, 3);
  const small = [block("1", "a", 30), block("2", "a", 30)];
  assert.equal(selectMenuPaginationCandidate([1, 2, 3].map(columns => ({columns, pages: paginateMenuBlocks(small, columns, 100)}))).columns, 1);
});
test("a narrower candidate that clips is rejected even if it has fewer pages", () => {
  const invalid = {columns: 3, pages: [{columns: [[block("oversize", "a", 200)]], overflow: ["oversize"]}]};
  const valid = {columns: 2, pages: paginateMenuBlocks([block("1", "a", 80), block("2", "a", 80), block("3", "a", 80)], 2, 100)};
  assert.equal(selectMenuPaginationCandidate([invalid, valid]), valid);
});
test("flow fills free space without changing fonts, order or widget boundaries", () => {
  const input = Array.from({length: 4}, (_, i) => [block(`h${i}`, String(i), 10, "heading"), block(`a${i}`, String(i), 25), block(`b${i}`, String(i), 25)]).flat();
  assert.equal(paginateMenuBlocks(input, 3, 100, true).length, 2);
  const flow = paginateMenuBlocks(input, 3, 100, false);
  assert.equal(flow.length, 1);
  assert.deepEqual(flow.flatMap(p => p.columns.flat()).filter(b => b.kind !== "heading").map(b => b.id), input.filter(b => b.kind !== "heading").map(b => b.id));
});
