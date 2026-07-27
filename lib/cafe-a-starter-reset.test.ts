import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCafeAStarterResetSnapshot,
  createCafeAStarterResetFinalSavePayload,
  parseCafeAStarterResetFinalSavePayload,
  type CafeAStarterResetIdFactory,
} from "./cafe-a-starter-reset";
import { getStarterPreset, type StarterPreset } from "./menu-starter-presets";

const fixedNow = new Date("2026-07-21T00:00:00.000Z");

const deterministicIdFactory: CafeAStarterResetIdFactory = (kind, key, index) => {
  const suffix = key.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `temp-${kind}-${index}-${suffix || "starter"}`;
};

test("buildCafeAStarterResetSnapshot creates a complete CafeA reset snapshot", () => {
  const result = buildCafeAStarterResetSnapshot({
    preset: getStarterPreset("cafe_design_a"),
    persistedIds: {
      pageIds: ["existing-page"],
      categoryIds: ["existing-category"],
      itemIds: ["existing-item"],
      widgetIds: ["existing-widget"],
    },
    idFactory: deterministicIdFactory,
    now: fixedNow,
  });

  if (!result.ok) {
    assert.fail(result.errors.map((error) => `${error.code}:${error.field}`).join(", "));
  }

  const { snapshot } = result;
  assert.equal(snapshot.widgets.length, 0);
  assert.deepEqual(snapshot.referenceMap.widget, {});
  assert.equal(snapshot.categoryPriceColumns.length > 0, true);
  assert.equal(snapshot.itemPriceColumnValues.length > 0, true);
  assert.deepEqual(snapshot.deletedPageIds, ["existing-page"]);
  assert.deepEqual(snapshot.deletedCategoryIds, ["existing-category"]);
  assert.deepEqual(snapshot.deletedItemIds, ["existing-item"]);
  assert.deepEqual(snapshot.deletedWidgetIds, ["existing-widget"]);
  assert.equal(snapshot.saveContractGaps.length, 0);

  const pageId = snapshot.pages[0]?.id;
  assert.ok(pageId);
  const blocks = snapshot.mixedContentOrder[pageId] ?? [];
  assert.equal(blocks.length, 7);
  assert.equal(blocks.length, snapshot.categories.length);
  assert.equal(blocks.every((block) => block.blockType === "category"), true);
  assert.deepEqual(blocks.map((block) => block.sortOrder), blocks.map((_, index) => index));
  assert.deepEqual(
    blocks.map((block) => snapshot.categories.find((category) => category.id === block.id)?.presetKey),
    ["signature-coffee", "classic-coffee", "non-coffee", "tea", "ade", "bakery", "dessert"],
  );

  assert.equal(snapshot.featuredItemId, snapshot.referenceMap.item["jeju-matcha-cream-latte"]);
  assert.equal(snapshot.featuredSlides.length > 0, true);
  assert.equal(snapshot.featuredSlides.every((slide) => Boolean(slide.featuredItemId)), true);

  assert.equal(snapshot.timeSales.length, 2);
  snapshot.timeSales.forEach((timeSale) => {
    assert.equal(timeSale.targets.length > 0, true);
    timeSale.targets.forEach((target) => {
      assert.equal(snapshot.items.some((item) => item.id === target.itemId), true);
      if (target.priceColumnId) {
        assert.equal(snapshot.categoryPriceColumns.some((column) => column.id === target.priceColumnId), true);
      }
    });
  });

  assert.equal(snapshot.items.every((item) => item.isSoldOut === false), true);
});

test("buildCafeAStarterResetSnapshot falls back for starters without widgets or mixed order", () => {
  const result = buildCafeAStarterResetSnapshot({
    preset: getStarterPreset("display_menu_a"),
    idFactory: deterministicIdFactory,
    now: fixedNow,
  });

  if (!result.ok) {
    assert.fail(result.errors.map((error) => `${error.code}:${error.field}`).join(", "));
  }

  const { snapshot } = result;
  assert.equal(snapshot.widgets.length, 0);
  assert.equal(snapshot.saveContractGaps.length, 0);
  assert.equal(snapshot.items.every((item) => item.isSoldOut === false), true);
  const pageId = snapshot.pages[0]?.id;
  assert.ok(pageId);
  assert.equal(snapshot.mixedContentOrder[pageId]?.every((block) => block.blockType === "category"), true);
});

test("buildCafeAStarterResetSnapshot rejects duplicate starter keys", () => {
  const preset = clonePreset(getStarterPreset("cafe_design_a"));
  const widget = createTestStarterWidget();
  preset.widgets = [widget, { ...widget }];

  const result = buildCafeAStarterResetSnapshot({
    preset,
    idFactory: deterministicIdFactory,
    now: fixedNow,
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "DUPLICATE_PRESET_KEY" && error.field.startsWith("preset.widgets.key")), true);
});

test("buildCafeAStarterResetSnapshot rejects missing mixed-order references", () => {
  const preset = clonePreset(getStarterPreset("cafe_design_a"));
  preset.mixed_content_order = [
    {
      block_type: "widget",
      page_key: "main-menu",
      widget_key: "missing-widget",
      sort_order: 0,
      visible: true,
    },
  ];

  const result = buildCafeAStarterResetSnapshot({
    preset,
    idFactory: deterministicIdFactory,
    now: fixedNow,
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "INVALID_REFERENCE" && error.field.includes("mixed_content_order")), true);
});

test("buildCafeAStarterResetSnapshot rejects missing featured and time-sale references", () => {
  const preset = clonePreset(getStarterPreset("cafe_design_a"));
  preset.featured_item_key = "missing-item";
  if (preset.featured_slides?.[0]) {
    preset.featured_slides[0].featured_item_key = "missing-slide-item";
  }
  if (preset.time_sales?.[0]?.targets?.[0]) {
    preset.time_sales[0].targets[0].target_item_key = "missing-sale-item";
  }

  const result = buildCafeAStarterResetSnapshot({
    preset,
    idFactory: deterministicIdFactory,
    now: fixedNow,
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.field === "preset.featured_item_key"), true);
  assert.equal(result.errors.some((error) => error.field.includes("featured_slides")), true);
  assert.equal(result.errors.some((error) => error.field.includes("time_sales")), true);
});

test("buildCafeAStarterResetSnapshot rejects more than three widgets per page", () => {
  const preset = clonePreset(getStarterPreset("cafe_design_a"));
  const widget = createTestStarterWidget();
  preset.widgets = Array.from({ length: 4 }, (_, index) => ({
    ...widget,
    key: `starter-widget-${index + 1}`,
    sort_order: 5 + index,
  }));
  preset.mixed_content_order = [
    ...(preset.mixed_content_order ?? []).filter((block) => block.block_type === "category"),
    ...preset.widgets.map((starterWidget, index) => ({
      block_type: "widget" as const,
      page_key: starterWidget.page_key,
      widget_key: starterWidget.key,
      sort_order: 100 + index,
      visible: true,
    })),
  ];

  const result = buildCafeAStarterResetSnapshot({
    preset,
    idFactory: deterministicIdFactory,
    now: fixedNow,
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "TOO_MANY_WIDGETS"), true);
});

test("parseCafeAStarterResetFinalSavePayload accepts the versioned reset payload", () => {
  const result = buildCafeAStarterResetSnapshot({
    preset: getStarterPreset("cafe_design_a"),
    idFactory: deterministicIdFactory,
    now: fixedNow,
  });

  if (!result.ok) {
    assert.fail(result.errors.map((error) => `${error.code}:${error.field}`).join(", "));
  }

  const payload = createCafeAStarterResetFinalSavePayload(result.snapshot);
  const parseResult = parseCafeAStarterResetFinalSavePayload(payload);

  assert.equal(parseResult.ok, true);
  if (parseResult.ok) {
    assert.equal(parseResult.payload.source, "cafe_a_starter_reset");
    assert.equal(parseResult.payload.schemaVersion, 1);
    assert.equal(parseResult.payload.snapshot.featuredItemId, result.snapshot.featuredItemId);
  }
});

test("parseCafeAStarterResetFinalSavePayload rejects malformed snapshots before validation", () => {
  const parseResult = parseCafeAStarterResetFinalSavePayload({
    source: "cafe_a_starter_reset",
    schemaVersion: 1,
    snapshot: {
      pages: {},
    },
  });

  assert.equal(parseResult.ok, false);
  assert.equal(parseResult.errors[0]?.code, "INVALID_FINAL_SAVE_PAYLOAD");
});

function clonePreset(preset: StarterPreset): StarterPreset {
  return JSON.parse(JSON.stringify(preset)) as StarterPreset;
}

function createTestStarterWidget(): NonNullable<StarterPreset["widgets"]>[number] {
  return {
    key: "test-widget",
    page_key: "main-menu",
    type: "image_text",
    title: "테스트 안내",
    description: "테스트 위젯입니다.",
    image_url: "/menu-templates/cafe_design_a/malcha.jpg",
    image_path: null,
    visible: true,
    sort_order: 5,
    settings: {
      aspectRatio: "3:2",
      objectFit: "cover",
      textAlign: "left",
      altText: "테스트 이미지",
    },
  };
}
