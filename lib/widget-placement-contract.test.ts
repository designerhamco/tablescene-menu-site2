import assert from "node:assert/strict";
import test from "node:test";
import { layoutScrollableMenu } from "./basic-menu-scroll";
import { createDefaultMenuWidgetDraft } from "./menu-widgets";
import { createMenuWidgetFinalSavePayloadFromEditorState, reorderMenuEditorContentBlocks } from "./menu-widget-editor-draft";
import { normalizeWidgetPlacementPayload, orderWidgetContentBlocks } from "./menu-widget-placement";
import { getMenuColumnDividerGeometry } from "./menu-column-divider";

const category = (id: string) => [{ id: `h-${id}`, group: id, kind: "heading" as const, height: 20 }, { id, group: id, kind: "item" as const, height: 50 }];
test("legacy bottom hints cannot reorder blocks or introduce a viewport spacer", () => {
  const widgets = [1, 2].map(id => ({ id: `w${id}`, group: `w${id}`, kind: "widget" as const, height: 30, dockToBottom: true }));
  const input = [...category("a"), widgets[0], ...category("b"), widgets[1]];
  for (const grouped of [false, true]) for (const count of [1, 2, 3]) {
    const layout = layoutScrollableMenu(input, count, 500, grouped, { footerHeight: 45 });
    assert.deepEqual(layout.columns.flat().map(block => block.id), input.map(block => block.id));
    const final = layout.columns[layout.footerColumn];
    assert.equal(final.at(-1)?.id, "w2");
    assert.equal(layout.naturalHeights[layout.footerColumn], final.reduce((n, b) => n + b.height, 45));
    if (!grouped) assert.ok(layout.contentHeight < 500, "sparse flow stays natural height");
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
test("Basic and Dining allow widgets before, between and after whole categories", () => {
  const legacy = { ...draft, settings: { ...draft.settings, placement: "bottom" as const } };
  for (const templateKey of ["cafe_design_a", "cafe_mocha_forest_a", "dining_aube_table_a", "dining_aube_table_b"]) {
    const widgets = { w: legacy };
    assert.deepEqual(orderWidgetContentBlocks(blocks, widgets, templateKey).map(block => block.id), ["a", "w", "b"]);
    for (const [target, expected] of [["a", ["w", "a", "b"]], ["b", ["a", "b", "w"]]] as const) {
      const moved = reorderMenuEditorContentBlocks({ p: blocks }, { menuPageId: "p", activeSortableId: "menu-content:widget:w", overSortableId: `menu-content:category:${target}`, templateKey, widgetDraftsById: widgets });
      assert.equal(moved.ok && moved.changed, true);
      assert.ok(moved.ok);
      assert.deepEqual(moved.blocks.map(block => block.id), expected);
    }
  }
});
test("editor and authorized save preserve mixed order and canonicalize legacy hints without mutation", () => {
  const legacy = { ...draft, settings: { ...draft.settings, placement: "bottom" as const } };
  for (const templateKey of ["cafe_design_a", "dining_aube_table_a"]) {
    const payload = createMenuWidgetFinalSavePayloadFromEditorState({ widgetDraftsById: { w: legacy }, deletedWidgetIds: new Set(), contentBlockDraftsByPageId: { p: blocks }, templateKey });
    const saved = normalizeWidgetPlacementPayload(payload, templateKey);
    assert.deepEqual(saved.contentBlocksByPage[0].blocks.map(block => block.id), ["a", "w", "b"]);
    assert.equal(saved.widgetDrafts[0].sortOrder, 1);
    assert.equal(saved.widgetDrafts[0].settings.placement, "flow");
    assert.deepEqual(normalizeWidgetPlacementPayload(saved, templateKey), saved, "normalization is idempotent");
    assert.equal(legacy.settings.placement, "bottom", "loaded customer object remains untouched");
  }
});
test("divided columns use exactly one page inset on each side of their stroke", () => {
  const geometry = getMenuColumnDividerGeometry("32px");
  assert.equal(geometry.gap, "calc(2 * 32px + 1px)");
  assert.equal(geometry.offset, "calc(-1 * (32px + 1px))");
});
