import assert from "node:assert/strict";
import test from "node:test";
import { layoutScrollableMenu } from "./basic-menu-scroll";
import { createDefaultMenuWidgetDraft } from "./menu-widgets";
import { createMenuWidgetFinalSavePayloadFromEditorState, reorderMenuEditorContentBlocks } from "./menu-widget-editor-draft";
import { normalizeWidgetPlacementPayload, orderWidgetContentBlocks } from "./menu-widget-placement";
import { getMenuColumnDividerGeometry } from "./menu-column-divider";

const category = (id: string) => [{ id: `h-${id}`, group: id, kind: "heading" as const, height: 20 }, { id, group: id, kind: "item" as const, height: 50 }];
test("bottom widgets stay together in the last occupied column and keep the actual viewport floor", () => {
  const bottom = [1, 2].map(id => ({ id: `w${id}`, group: `w${id}`, kind: "widget" as const, height: 30, dockToBottom: true }));
  for (const grouped of [false, true]) for (const count of [1, 2, 3]) {
    const layout = layoutScrollableMenu([...category("a"), bottom[0], ...category("b"), bottom[1]], count, 500, grouped, { footerHeight: 45 });
    assert.deepEqual(layout.columns.flat().map(block => block.id), ["h-a", "a", "h-b", "b", "w1", "w2"]);
    assert.deepEqual(layout.columns[layout.footerColumn].slice(-2).map(block => block.id), ["w1", "w2"]);
    assert.ok(layout.contentHeight >= 500);
    assert.ok(layout.naturalHeights[layout.footerColumn] >= 45 + 60);
  }
});
test("flow widgets retain their exact category insertion point, including dense scrolling", () => {
  const flow = { id: "flow", group: "flow", kind: "widget" as const, height: 40 };
  const input = [...category("a"), flow, ...category("b")];
  assert.deepEqual(layoutScrollableMenu(input, 2, 100).columns.flat().map(block => block.id), input.map(block => block.id));
});
const draft = createDefaultMenuWidgetDraft("text", { id: "w", menuPageId: "p", sortOrder: 1 });
draft.title = "위젯"; draft.description = "내용";
const blocks = [{ blockType: "category" as const, id: "a", sortOrder: 0, menuPageId: "p", visible: true }, { blockType: "widget" as const, id: "w", sortOrder: 1, menuPageId: "p", visible: true }, { blockType: "category" as const, id: "b", sortOrder: 2, menuPageId: "p", visible: true }];
test("Basic structure pins bottom widgets last and blocks drag and keyboard targets", () => {
  const widgets = { w: draft };
  assert.deepEqual(orderWidgetContentBlocks(blocks, widgets, "cafe_design_a").map(block => block.id), ["a", "b", "w"]);
  const fixed = reorderMenuEditorContentBlocks({ p: blocks }, { menuPageId: "p", activeSortableId: "menu-content:widget:w", overSortableId: "menu-content:category:a", templateKey: "cafe_design_a", widgetDraftsById: widgets });
  assert.equal(fixed.ok, false);
  const flow = { ...draft, settings: { ...draft.settings, placement: "flow" as const } };
  const movable = reorderMenuEditorContentBlocks({ p: blocks }, { menuPageId: "p", activeSortableId: "menu-content:widget:w", overSortableId: "menu-content:category:a", templateKey: "cafe_design_a", widgetDraftsById: { w: flow } });
  assert.equal(movable.ok && movable.changed, true);
  assert.deepEqual(movable.blocks.map(block => block.id), ["w", "a", "b"]);
});
test("editor and server payloads agree, and Dining treats legacy bottom as free ordered flow", () => {
  const payload = createMenuWidgetFinalSavePayloadFromEditorState({ widgetDraftsById: { w: draft }, deletedWidgetIds: new Set(), contentBlockDraftsByPageId: { p: blocks }, templateKey: "cafe_design_a" });
  assert.deepEqual(payload.contentBlocksByPage[0].blocks.map(block => block.id), ["a", "b", "w"]);
  assert.equal(payload.widgetDrafts[0].sortOrder, 2);
  const old = { ...payload, contentBlocksByPage: [{ menuPageId: "p", blocks }] };
  const dining = normalizeWidgetPlacementPayload(old, "dining_aube_table_a");
  assert.equal(dining.widgetDrafts[0].settings.placement, "flow");
  assert.deepEqual(dining.contentBlocksByPage[0].blocks.map(block => block.id), ["a", "w", "b"]);
  assert.equal(draft.settings.placement, "bottom", "normalization never mutates loaded data");
});
test("divided columns use exactly one page inset on each side of their stroke", () => {
  const geometry = getMenuColumnDividerGeometry("32px");
  assert.equal(geometry.gap, "calc(2 * 32px + 1px)");
  assert.equal(geometry.offset, "calc(-1 * (32px + 1px))");
});
