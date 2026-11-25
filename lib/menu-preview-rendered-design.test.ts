import assert from "node:assert/strict";
import test from "node:test";
import { previewCssColorHex, previewRadiusSelection, previewDecorationStroke } from "./menu-preview-rendered-design";

test("rendered ink converts browser color formats without a black fallback", () => {
  assert.equal(previewCssColorHex("rgb(133, 35, 34)"), "#852322");
  assert.equal(previewCssColorHex("rgba(244, 237, 220, 0.82)"), "#F4EDDC");
  assert.equal(previewCssColorHex("color(srgb 1 0.5 0)"), "#FF8000");
  assert.equal(previewCssColorHex("#f4eddc"), "#F4EDDC");
  assert.equal(previewCssColorHex("inherit"), undefined);
  assert.equal(previewCssColorHex("rgb(NaN, 1, 2)"), undefined);
});

test("shared shape choices require the actual image and chip pair", () => {
  for (const [image,chip,value] of [[0,0,"square"],[8,2,"soft"],[16,4,"rounded"],[24,9999,"round"]] as const) {
    assert.deepEqual(previewRadiusSelection([image,image],[chip,chip]), {value});
  }
  assert.deepEqual(previewRadiusSelection([0,16],[4]), {value:"current",label:"이미지 0–16px · 칩 4px"});
  assert.deepEqual(previewRadiusSelection([4],[4]), {value:"current",label:"이미지 4px · 칩 4px"});
  assert.deepEqual(previewRadiusSelection(["50%"],["4px"]), {value:"current",label:"이미지 50% · 칩 4px"});
  assert.deepEqual(previewRadiusSelection([],[]), {value:"current",label:"표시 대상 없음"});
});


test("decoration controls read native fractional borders and gradient dots without rounding to an editable preset", () => {
  const style = { borderTopWidth: "0px", borderTopStyle: "none", borderBottomWidth: "1.59375px", borderBottomStyle: "solid", borderInlineStartWidth: "0px", borderInlineStartStyle: "none", width: "200px", height: "1px", backgroundImage: "none" };
  const before = structuredClone(style);
  assert.deepEqual(previewDecorationStroke(style, "categoryUnderline"), { width: 1.59375, style: "solid" });
  assert.deepEqual(previewDecorationStroke({ ...style, borderTopWidth: "3px", borderTopStyle: "dashed" }, "itemDivider"), { width: 3, style: "dashed" });
  assert.deepEqual(previewDecorationStroke({ ...style, backgroundImage: "radial-gradient(circle, black 1px, transparent 2px)" }, "priceLeader"), { width: 1, style: "dotted" });
  assert.equal(previewDecorationStroke({ ...style, borderBottomWidth: "0px", borderBottomStyle: "none", height: "30px" }, "categoryUnderline"), undefined);
  assert.deepEqual(style, before);
});
