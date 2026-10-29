import assert from "node:assert/strict";
import test from "node:test";
import { fitMenuPreviewFrame } from "./menu-preview-fit";
import { getMenuPreviewFrame, MENU_PREVIEW_DEVICE_ORDER } from "./menu-preview-devices";

test("every device fits and remains centered without changing its source viewport", () => {
  for (const device of MENU_PREVIEW_DEVICE_ORDER) for (const orientation of ["landscape", "portrait"] as const) {
    const frame = getMenuPreviewFrame(device, orientation);
    const original = { ...frame };
    for (const [width, height] of [[288, 600], [736, 900], [1360, 780], [2900, 1300]]) {
      const result = fitMenuPreviewFrame({ width, height }, frame);
      assert.ok(result.displayWidth <= width + 1e-6);
      assert.ok(result.displayHeight <= height + 1e-6);
      assert.ok(Math.abs(result.displayWidth / result.displayHeight - result.width / result.height) < 1e-6);
      assert.deepEqual(frame, original);
    }
  }
});

test("wide-screen space enlarges the mockup and unmeasured space stays hidden", () => {
  const frame = getMenuPreviewFrame("tablet", "landscape");
  const laptop = fitMenuPreviewFrame({ width: 1000, height: 780 }, frame);
  const wide = fitMenuPreviewFrame({ width: 2900, height: 1300 }, frame);
  assert.ok(wide.scale > 1);
  assert.ok(wide.scale > laptop.scale);
  assert.equal(fitMenuPreviewFrame({ width: 0, height: 0 }, frame).scale, 0);
});
