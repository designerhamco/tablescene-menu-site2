import assert from "node:assert/strict";
import test from "node:test";
import { hexToHsv, hsvToHex } from "./color-picker";

test("picker preserves exact sRGB hex colors across hue, saturation and value conversion", () => {
  for (const color of ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#808080", "#F4EDDC", "#852322", "#172A60", "#3F786F", "#6340C4", "#262121", "#E6F3FA"]) {
    assert.equal(hsvToHex(hexToHsv(color)), color);
  }
  assert.equal(hsvToHex({ h: 360, s: 1, v: 1 }), "#FF0000");
  assert.equal(hsvToHex({ h: 120, s: 2, v: 2 }), "#00FF00");
  assert.equal(hsvToHex({ h: 20, s: .5, v: -1 }), "#000000");
});
