import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCafeAStarterResetSnapshot,
  createCafeAStarterResetFinalSavePayload,
  parseCafeAStarterResetFinalSavePayload,
  type CafeAStarterResetIdFactory,
} from "./cafe-a-starter-reset";
import { getStarterPreset } from "./menu-starter-presets";

const ACTIVE_TEMPLATE_EXPECTATIONS = {
  cafe_design_a: { pages: 1, categories: 5, items: 8 },
  cafe_mocha_forest_a: { pages: 1, categories: 5, items: 8 },
  cafe_sunday_line_a: { pages: 1, categories: 5, items: 13 },
  cafe_round_focus_a: { pages: 1, categories: 5, items: 13 },
  cafe_brew_chapter_a: { pages: 1, categories: 5, items: 15 },
  cafe_noir_a: { pages: 1, categories: 4, items: 20 },
  display_menu_a: { pages: 4, categories: 6, items: 17 },
} as const;

function createIdFactory(templateKey: string): CafeAStarterResetIdFactory {
  return (kind, key, index) => `qa-${templateKey}-${kind}-${index}-${key || "item"}`;
}

for (const [templateKey, expected] of Object.entries(ACTIVE_TEMPLATE_EXPECTATIONS)) {
  test(`${templateKey} starter survives the final-save round trip`, () => {
    const result = buildCafeAStarterResetSnapshot({
      preset: getStarterPreset(templateKey),
      idFactory: createIdFactory(templateKey),
      now: new Date("2026-08-06T00:00:00.000Z"),
    });

    if (!result.ok) {
      assert.fail(result.errors.map((error) => `${error.code}:${error.field}`).join(", "));
    }

    const { snapshot } = result;
    assert.equal(snapshot.pages.length, expected.pages);
    assert.equal(snapshot.categories.length, expected.categories);
    assert.equal(snapshot.items.length, expected.items);
    assert.equal(snapshot.saveContractGaps.length, 0);

    const pageIds = new Set(snapshot.pages.map((page) => page.id));
    const categoryIds = new Set(snapshot.categories.map((category) => category.id));
    const itemIds = new Set(snapshot.items.map((item) => item.id));
    const widgetIds = new Set(snapshot.widgets.map((widget) => widget.id));

    assert.equal(pageIds.size, snapshot.pages.length);
    assert.equal(categoryIds.size, snapshot.categories.length);
    assert.equal(itemIds.size, snapshot.items.length);
    assert.equal(widgetIds.size, snapshot.widgets.length);
    assert.equal(snapshot.categories.every((category) => pageIds.has(category.pageId)), true);
    assert.equal(snapshot.items.every((item) => categoryIds.has(item.categoryId)), true);

    for (const [pageId, blocks] of Object.entries(snapshot.mixedContentOrder)) {
      assert.equal(pageIds.has(pageId), true);
      assert.equal(
        blocks.every((block) => block.blockType === "category" ? categoryIds.has(block.id) : widgetIds.has(block.id)),
        true,
      );
    }

    const parsed = parseCafeAStarterResetFinalSavePayload(createCafeAStarterResetFinalSavePayload(snapshot));
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.payload.snapshot, snapshot);
    }
  });
}
