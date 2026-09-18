import assert from "node:assert/strict";
import test from "node:test";

import { getStarterPreset } from "./menu-starter-presets";

const SINGLE_PAGE_DENSITY_CONTRACT = {
  cafe_design_a: [3, 4, 3, 3, 6],
  cafe_mocha_forest_a: [3, 4, 3, 3, 4],
  cafe_sunday_line_a: [3, 3, 2, 3, 6],
  cafe_round_focus_a: [3, 3, 3, 2, 2],
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
