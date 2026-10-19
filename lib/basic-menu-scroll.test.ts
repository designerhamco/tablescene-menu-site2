import test from "node:test";
import assert from "node:assert/strict";
import { layoutScrollableMenu, selectScrollableMenuCandidate } from "./basic-menu-scroll";
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
    assert.deepEqual(layout.columns.flat().map(b => b.id), input.map(b => b.id), "each category heading and product occurs exactly once in registered order");
    assert.ok(layout.columns.every(column => column.reduce((n, b) => n + b.height, 0) <= layout.height));
    for (const column of layout.columns) {
      if (grouped && column.length) assert.equal(column[0].kind, "heading");
      assert.notEqual(column.at(-1)?.kind, "heading");
    }
  }
});
test("grouped scrolling retains a category even when it is taller than the viewport", () => {
  const input = [...category("a", 12), ...category("b", 4), ...category("c", 4)];
  const layout = layoutScrollableMenu(input, 3, 300, true);
  for (const group of ["a", "b", "c"]) assert.equal(layout.columns.filter(column => column.some(b => b.group === group)).length, 1);
});
test("flow continues products without repeating the category heading and preserves the widget boundary", () => {
  const input: MeasuredMenuBlock[] = [...category("a", 12), {id:"widget", group:"widget", kind:"widget", height:100}];
  const layout = layoutScrollableMenu(input, 3, 300);
  assert.ok(layout.columns.filter(column => column.some(b => b.group === "a")).length > 1);
  assert.deepEqual(ids(layout.columns.flat()), ids(input));
  assert.equal(layout.columns.flat().at(-1)?.id, "widget");
  assert.equal(layout.columns.flat().filter(b => b.kind === "heading").length, 1);
  assert.ok(layout.columns.slice(1).some(column => column[0]?.kind === "item"), "a continued column starts directly with the next product");
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


test("fill balances continuous runs even when their combined height is below the viewport", () => {
  const input = category("a", 12);
  const flow = layoutScrollableMenu(input, 3, 1100);
  assert.ok(flow.columns.every(c => c.length > 0));
  assert.ok(Math.max(...flow.naturalHeights) - Math.min(...flow.naturalHeights) <= 110);
  assert.deepEqual(flow.columns.flat(), input);
});
test("notices consume only the final real column and cannot become a notice-only track", () => {
  const input = category("a", 8).map(b => ({...b, gapAfter:10}));
  const layout = layoutScrollableMenu(input, 3, 500, false, {footerHeight:90});
  assert.equal(layout.footerColumn, 2);
  for (const [i,c] of layout.columns.entries()) {
    const expected = c.reduce((sum,b)=>sum+b.height,0) + (i===2 ? 90 : -10);
    assert.equal(layout.naturalHeights[i],expected);
    assert.ok(c.length > 0);
  }
  assert.deepEqual(layout.columns.flat(),input);
});
test("fill keeps measured semantic gaps and top alignment when content is sparse", () => {
  const input=category("a",3).map(b=>({...b,gapAfter:10}));
  const flow=layoutScrollableMenu(input,1,1000);
  assert.equal(flow.height,1000);
  assert.equal(flow.contentHeight,flow.naturalHeights[0],"unused height never expands category spacing");
  const grouped=layoutScrollableMenu(input,1,1000,true);
  assert.equal(grouped.contentHeight,1000,"grouped retains its original viewport-sized canvas");
});
test("column selection prefers one-viewport fit over occupancy, and never adds avoidable scrolling", () => {
  const candidate=(count:number, heights:number[])=>({columnCount:count,columnWidth:300,layout:{...layoutScrollableMenu(category("a",12),count,500),naturalHeights:heights}});
  assert.equal(selectScrollableMenuCandidate([candidate(1,[1300]),candidate(2,[650,650]),candidate(3,[440,430,430])]).columnCount,3);
  assert.equal(selectScrollableMenuCandidate([candidate(1,[800]),candidate(2,[450,450]),candidate(3,[300,300,300])]).columnCount,2);
  assert.equal(selectScrollableMenuCandidate([candidate(1,[2000]),candidate(2,[1100,1100]),candidate(3,[750,750,750])]).columnCount,3);
});
test("fractional measurements do not add per-item rounding or trailing phantom gaps", () => {
  const input=Array.from({length:10},(_,i)=>({id:String(i),group:"a",kind:"item" as const,height:50.25,gapAfter:10.25}));
  const layout=layoutScrollableMenu(input,1,492.25);
  assert.equal(layout.naturalHeights[0],492.25);
  assert.equal(layout.height,492.25);
});
test("trailing widgets keep registered order above notices and empty content needs no fake canvas", () => {
  const input=[...category("a",4),...Array.from({length:2},(_,i)=>({id:`w${i}`,group:`w${i}`,kind:"widget" as const,height:100,gapAfter:20}))];
  const layout=layoutScrollableMenu(input,2,300,false,{footerHeight:80});
  assert.deepEqual(layout.columns.flat(),input);
  assert.equal(layout.columns[layout.footerColumn].at(-1)?.id,"w1");
  const empty=layoutScrollableMenu([],1,500,false,{footerHeight:40});
  assert.equal(empty.contentHeight,40);assert.equal(empty.height,500);
});

test("the final widget-to-notice boundary keeps the same measured gap as category boundaries", () => {
  const input = [
    {id:"heading",group:"a",kind:"heading" as const,height:52,gapAfter:12},
    {id:"product",group:"a",kind:"item" as const,height:112,gapAfter:32},
    {id:"widget",group:"widget",kind:"widget" as const,height:132,gapAfter:32},
  ];
  const layout = layoutScrollableMenu(input, 1, 600, false, {footerHeight:60});
  assert.equal(layout.naturalHeights[0], 40+80+100+60+12+32+32);
  assert.equal(layout.contentHeight, layout.naturalHeights[0]);
});

test("when all fixed-size fill candidates overflow, choose the shortest measured scroll", () => {
  const input=category("a",12);
  const candidate=(count:number,heights:number[])=>({columnCount:count,columnWidth:300,itemSize:20,
    layout:{...layoutScrollableMenu(input,count,500),naturalHeights:heights}});
  assert.equal(selectScrollableMenuCandidate([
    candidate(1,[1100]),candidate(2,[670,700]),candidate(3,[800,810,790]),
  ]).columnCount,2);
});

test("fewer columns cannot trade away more than eight percent of the safe readable type", () => {
  const input=category("a",12);
  const candidates=[{columnCount:2,columnWidth:500,itemSize:18.8,layout:layoutScrollableMenu(input,2,1000)},
    {columnCount:3,columnWidth:320,itemSize:21.6,layout:layoutScrollableMenu(input,3,1000)}];
  assert.equal(selectScrollableMenuCandidate(candidates).columnCount,3);
});
