import assert from "node:assert/strict";
import test from "node:test";

import { getStarterPreset } from "./menu-starter-presets";

const SINGLE_PAGE_DENSITY_CONTRACT = {
  cafe_design_a: [3, 4, 4, 4, 4],
  cafe_mocha_forest_a: [3, 4, 3, 3, 3],
  cafe_sunday_line_a: [3, 3, 2, 3, 6],
  cafe_round_focus_a: [3, 4, 4, 2, 2],
} as const;

for (const [templateKey, expectedCategoryCounts] of Object.entries(SINGLE_PAGE_DENSITY_CONTRACT)) {
  test(`${templateKey} starter keeps a balanced single-page menu density`, () => {
    const preset = getStarterPreset(templateKey);
    assert.equal(preset.pages.length, 1);

    const categories = preset.pages[0]?.categories ?? [];
    assert.deepEqual(
      categories.map((category) => category.items.length),
      [...expectedCategoryCounts],
    );

    const itemKeys = categories.flatMap((category) => category.items.map((item) => item.key));
    assert.equal(itemKeys.every((key) => typeof key === "string" && key.length > 0), true);
    assert.equal(new Set(itemKeys).size, itemKeys.length);
    assert.equal(
      categories.flatMap((category) => category.items).every((item) => Boolean(item.set_name?.trim())),
      true,
      `${templateKey}: every starter item needs a secondary-language name`,
    );

    const itemByKey = new Map(
      categories.flatMap((category) => category.items.map((item) => [item.key, item] as const)),
    );

    for (const sale of preset.time_sales ?? []) {
      for (const target of sale.targets ?? []) {
        const item = itemByKey.get(target.target_item_key);
        assert.ok(item, `${templateKey}: missing promotion target ${target.target_item_key}`);
        assert.notEqual(
          item.badge_label?.trim().toLocaleLowerCase(),
          sale.badge_text?.trim().toLocaleLowerCase(),
          `${templateKey}: ${target.target_item_key} repeats the promotion badge`,
        );
      }
    }
  });
}

test("every active single-page starter includes a sixty-minute stock closeout countdown", () => {
  const expectedCloseoutKeys = new Map([
    ["cafe_design_a", "classic-butter-scone-closeout"],
    ["cafe_mocha_forest_a", "dark-chocolate-brownie-closeout"],
    ["cafe_sunday_line_a", "brown-butter-scone-closeout"],
    ["cafe_round_focus_a", "fig-butter-scone-closeout"],
  ]);

  for (const [templateKey, expectedSaleKey] of expectedCloseoutKeys) {
    const preset = getStarterPreset(templateKey);
    const closeout = preset.time_sales?.find((sale) => sale.key === expectedSaleKey);
    assert.ok(closeout, `${templateKey}: stock closeout`);
    assert.equal(closeout.duration_minutes, 60, `${templateKey}: stock closeout duration`);
    assert.equal(closeout.time_display_mode, "countdown", `${templateKey}: stock closeout display mode`);
    assert.match(closeout.badge_text ?? "", /재고 마감/, `${templateKey}: stock closeout badge`);
  }

});

test("starter-specific image and promotion presentation stays intentional", () => {
  const roundFocus = getStarterPreset("cafe_round_focus_a");
  const roundHouseSpecials = roundFocus.pages[0]?.categories.find((category) => category.key === "house-special");
  assert.equal(roundHouseSpecials?.items.length, 3);
  assert.equal(roundHouseSpecials?.items.every((item) => !item.image_url), true);
  assert.equal(roundFocus.menu_cover_enabled, false);
  assert.equal(roundFocus.featured_slides?.length, 0);
  assert.equal(roundFocus.widgets?.[0]?.type, "image");
  assert.equal(roundFocus.widgets?.[0]?.image_url, "/placeholders/starter/menu-item.svg");
  const roundFocusLastBlock = roundFocus.mixed_content_order?.at(-1);
  assert.equal(roundFocusLastBlock?.block_type, "widget");
  assert.equal(roundFocusLastBlock?.block_type === "widget" ? roundFocusLastBlock.widget_key : null, "round-focus-image-widget");

  const mochaForest = getStarterPreset("cafe_mocha_forest_a");
  assert.equal(mochaForest.widgets?.[0]?.type, "image");
  assert.equal(mochaForest.widgets?.[0]?.image_url, "/placeholders/starter/menu-item.svg");
  const mochaForestLastBlock = mochaForest.mixed_content_order?.at(-1);
  assert.equal(mochaForestLastBlock?.block_type, "widget");
  assert.equal(mochaForestLastBlock?.block_type === "widget" ? mochaForestLastBlock.widget_key : null, "mocha-forest-image-widget");

  const sundayLine = getStarterPreset("cafe_sunday_line_a");
  const sundayItems = sundayLine.pages[0]?.categories.flatMap((category) => category.items) ?? [];
  for (const itemKey of ["sunday-cream-latte", "salted-maple-latte"]) {
    assert.equal(sundayItems.find((item) => item.key === itemKey)?.image_url, undefined);
  }

  const mochaMorningDeal = mochaForest.time_sales?.find((sale) => sale.key === "americano-morning-deal");
  assert.equal(mochaMorningDeal?.badge_background_color, "#981D18");
});
