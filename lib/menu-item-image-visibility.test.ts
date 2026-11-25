import assert from "node:assert/strict";
import test from "node:test";
import { getMenuItemImageVisibility, mergeMenuItemImageVisibility } from "./menu-item-image-visibility";

test("legacy items keep their images and malformed settings are ignored", () => {
  for (const settings of [null, [], { item_image_visibility: [] }, { item_image_visibility: { one: "false", two: false } }]) {
    assert.notEqual(getMenuItemImageVisibility(settings).one, false);
  }
  assert.deepEqual(getMenuItemImageVisibility({ item_image_visibility: { one: false, two: true, bad: "false" } }), { one: false, two: true });
});

test("image preference uses only item ids authorized and successfully saved by the action", () => {
  const settings = { item_image_visibility: { existing: false, untouched: false }, unrelated: { keep: true } };
  const next = mergeMenuItemImageVisibility(settings, [
    { id: "existing", imageEnabled: true },
    { id: "temp-new", imageEnabled: false },
    { id: "foreign", imageEnabled: false },
    { id: "untouched" },
  ], new Map([["existing", "existing"], ["temp-new", "saved-new"]]));
  assert.deepEqual(next, { untouched: false, "saved-new": false });
  assert.deepEqual(settings.item_image_visibility, { existing: false, untouched: false });
  assert.deepEqual(settings.unrelated, { keep: true });
});
