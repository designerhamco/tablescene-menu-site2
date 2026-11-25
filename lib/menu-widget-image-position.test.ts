import assert from "node:assert/strict";
import test from "node:test";
import { getWidgetImagePositionAxis, getWidgetImagePositionOnAxis, getWidgetImagePositionOptions } from "./menu-widget-image-position";
import { MENU_WIDGET_OBJECT_POSITIONS } from "./menu-widgets";

test("cover exposes only the axis that can crop and contain exposes only the axis with free space", () => {
  assert.equal(getWidgetImagePositionAxis(600, 1200, "3:1", "cover"), "vertical");
  assert.equal(getWidgetImagePositionAxis(600, 1200, "3:1", "contain"), "horizontal");
  assert.equal(getWidgetImagePositionAxis(1600, 900, "1:2", "cover"), "horizontal");
  assert.equal(getWidgetImagePositionAxis(1600, 900, "1:2", "contain"), "vertical");
});

test("matching ratios, missing dimensions and legacy ratios do not invent a positioning axis", () => {
  for (const fit of ["cover", "contain"] as const) {
    assert.equal(getWidgetImagePositionAxis(1800, 600, "3:1", fit), null);
    assert.equal(getWidgetImagePositionAxis(1500, 1000, "3:2", fit), null);
    assert.equal(getWidgetImagePositionAxis(0, 100, "1:1", fit), null);
    assert.equal(getWidgetImagePositionAxis(Number.NaN, 100, "1:1", fit), null);
  }
});

test("all nine saved positions select their equivalent option without changing the stored value", () => {
  for (const position of MENU_WIDGET_OBJECT_POSITIONS) {
    for (const axis of ["horizontal", "vertical"] as const) {
      assert.ok(getWidgetImagePositionOptions(axis).some(option => option === getWidgetImagePositionOnAxis(position, axis)));
    }
  }
  assert.equal(getWidgetImagePositionOnAxis("top-left", "vertical"), "top-center");
  assert.equal(getWidgetImagePositionOnAxis("top-left", "horizontal"), "center-left");
  assert.equal(getWidgetImagePositionOnAxis("bottom-right", "vertical"), "bottom-center");
  assert.equal(getWidgetImagePositionOnAxis("bottom-right", "horizontal"), "center-right");
});

test("contain keeps nine choices for matching, different and not-yet-loaded image ratios", () => {
  for (const axis of [null, "horizontal", "vertical"] as const) {
    const options = getWidgetImagePositionOptions(axis, "contain");
    assert.equal(options.length, 9);
    assert.ok(options.some(option => option === "top-left"));
    assert.ok(options.some(option => option === "bottom-right"));
  }
  assert.equal(getWidgetImagePositionOptions(null, "cover").length, 0);
  assert.equal(getWidgetImagePositionOptions("horizontal", "cover").length, 3);
  assert.equal(getWidgetImagePositionOptions("vertical", "cover").length, 3);
});
