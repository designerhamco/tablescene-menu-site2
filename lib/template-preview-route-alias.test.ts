import assert from "node:assert/strict";
import test from "node:test";

import {
  getTemplatePreviewRouteKey,
  resolveTemplatePreviewRouteKey,
} from "./templates";

test("renamed templates expose stable public preview route aliases", () => {
  assert.equal(getTemplatePreviewRouteKey("cafe_design_a"), "cafe_real_matcha_a");
  assert.equal(getTemplatePreviewRouteKey("cafe_sunday_line_a"), "cafe_sunday_roasters_a");
  assert.equal(getTemplatePreviewRouteKey("cafe_mocha_forest_a"), "cafe_mocha_forest_a");
});

test("public preview route aliases resolve to persisted template keys", () => {
  assert.equal(resolveTemplatePreviewRouteKey("cafe_real_matcha_a"), "cafe_design_a");
  assert.equal(resolveTemplatePreviewRouteKey("cafe_sunday_roasters_a"), "cafe_sunday_line_a");
  assert.equal(resolveTemplatePreviewRouteKey("cafe_design_a"), "cafe_design_a");
  assert.equal(resolveTemplatePreviewRouteKey("unknown-template"), null);
});
