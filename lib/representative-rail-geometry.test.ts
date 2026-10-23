import assert from "node:assert/strict";
import test from "node:test";
import { getRepresentativeRailGeometry } from "./representative-rail-geometry";
import { getCanvasBrandLimits, selectCanvasBrandTitleFit } from "./canvas-brand-title-fit";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < .01, `${a} != ${b}`);
test("colored rail padding and menu scrollbar are reserved without reducing the representative content column", () => {
  for (const columns of [1, 2, 3]) for (const padding of [0, 64]) {
    const layout = getRepresentativeRailGeometry(1248, padding, 32, columns, 8);
    close(layout.railWidth - padding, layout.trackWidth);
    close((layout.menuWidth - (columns - 1) * 32) / columns, layout.trackWidth);
    close(layout.railWidth + 32 + layout.menuWidth + 8, 1248);
  }
});
test("the reported narrow tablet title retains CAFE and ARTIMENU as whole words after reserving the panel", () => {
  const geometry = getRepresentativeRailGeometry(1180 - 34.44, 68.88, 34.44, 2);
  assert.ok(geometry.trackWidth > 335);
  const widths = new Map([["CAFE ARTIMENU", 900], ["CAFE", 258], ["ARTIMENU", 514]]);
  const fit = selectCanvasBrandTitleFit("CAFE ARTIMENU", widths, geometry.trackWidth, 150, getCanvasBrandLimits(geometry.trackWidth, "brand-column", 1, 33.28));
  assert.deepEqual(fit.lines, ["CAFE", "ARTIMENU"]);
  assert.ok(fit.fontSize >= 41.6);
});
test("very narrow frames cannot create a negative content width", () => {
  assert.equal(getRepresentativeRailGeometry(120, 64, 32, 3, 8).trackWidth, 0);
});
