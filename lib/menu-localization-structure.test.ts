import assert from "node:assert/strict";
import test from "node:test";

import { getMenuLocalizationStructure } from "./menu-localization-structure";

test("multi-page Dining keeps its page, course, and price-option localization structure", () => {
  assert.equal(getMenuLocalizationStructure("dining_aube_table_a"), "default");
  assert.equal(getMenuLocalizationStructure("dining_aube_table_b"), "default");
});

test("single-page Dining and Display retain their purpose-built localization structures", () => {
  assert.equal(getMenuLocalizationStructure("cafe_design_a"), "basic");
  assert.equal(getMenuLocalizationStructure("display_menu_a"), "display");
});
