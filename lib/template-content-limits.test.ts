import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_TEMPLATE_CONTENT_LIMITS, getTemplateContentLimits } from "./template-content-limits";

test("saved top-row designs use the same tighter limits while other designs on the shared renderer keep their limits", () => {
  for (const id of ["basic-top-row", "basic-top-row-album", "basic-top-row-left-logo"]) {
    assert.deepEqual(getTemplateContentLimits("cafe_design_a", { menu_design_id: id }), { restaurantName: 40, brandDescription: 80, footerNotice: 40 });
  }
  for (const id of ["basic-first-column", "basic-center-column", "basic-upper-left", "foreign-design"]) {
    assert.deepEqual(getTemplateContentLimits("cafe_design_a", { menu_design_id: id }), DEFAULT_TEMPLATE_CONTENT_LIMITS);
  }
  assert.deepEqual(getTemplateContentLimits("cafe_design_a"), DEFAULT_TEMPLATE_CONTENT_LIMITS);
});

test("native top rows retain stricter existing limits and foreign renderer settings cannot impose a top-row limit", () => {
  assert.deepEqual(getTemplateContentLimits("cafe_mocha_forest_a"), { restaurantName: 40, brandDescription: 80, footerNotice: 40 });
  for (const key of ["cafe_sunday_line_a", "cafe_van_gogh_a"]) {
    assert.deepEqual(getTemplateContentLimits(key), { restaurantName: 16, brandDescription: 80, footerNotice: 36 });
  }
  for (const key of ["dining_aube_table_a", "restaurant_onue_a", "fast_food_loop_bagel_a"]) {
    assert.deepEqual(getTemplateContentLimits(key, { menu_design_id: "basic-top-row" }), DEFAULT_TEMPLATE_CONTENT_LIMITS);
  }
});
