import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCanvasHeaderRatio, getCanvasBrandHeight, getCanvasBrandLimits, selectCanvasBrandTitleFit } from "./canvas-brand-title-fit";
import { getMobileBrandMeasurementTexts } from "./mobile-brand-title-fit";

test("coverage is allocated by slot structure, not a template or fixed px size", () => {
  assert.deepEqual(getCanvasBrandLimits(380, "horizontal-header"), { minimum: 30.400000000000002, maximum: 83.6, widthRatio: 0.65 });
  assert.deepEqual(getCanvasBrandLimits(281, "brand-column"), { minimum: 28.1, maximum: Infinity, widthRatio: 0.75 });
  const widths = new Map([["VAN GOGH", 453.5], ["VAN", 170], ["GOGH", 235]]);
  const height = getCanvasBrandHeight(380, 838, "horizontal-header");
  assert.ok(Math.abs(height - 106.4) < 0.0001);
  const fit = selectCanvasBrandTitleFit("VAN GOGH", widths, 380, height, getCanvasBrandLimits(380, "horizontal-header"));
  assert.deepEqual(fit.lines, ["VAN GOGH"]);
  assert.ok(Math.abs(fit.fontSize * 453.5 / 100 / 380 - 0.65) < 0.0001);
});

test("a horizontal title uses 65% even when two balanced lines win", () => {
  const widths = new Map([["SUNDAY ROASTERS", 896.9], ["SUNDAY", 350], ["ROASTERS", 500]]);
  const limits = getCanvasBrandLimits(380, "horizontal-header");
  const height = getCanvasBrandHeight(380, 838, "horizontal-header");
  const fit = selectCanvasBrandTitleFit("SUNDAY ROASTERS", widths, 380, height, limits);
  assert.deepEqual(fit.lines, ["SUNDAY", "ROASTERS"]);
  assert.ok(Math.abs(fit.fontSize - 106.4 / 2.28) < 1e-8);
  assert.deepEqual(selectCanvasBrandTitleFit("SUNDAY ROASTERS", widths, 380, height, limits), fit);
});

test("rail title uses 75% and the frame height can limit enlargement", () => {
  const widths = new Map([["LOOP BAGEL", 598.3], ["LOOP", 270], ["BAGEL", 300]]);
  const fit = selectCanvasBrandTitleFit("LOOP BAGEL", widths, 281, 134, getCanvasBrandLimits(281, "brand-column"));
  assert.deepEqual(fit.lines, ["LOOP", "BAGEL"]);
  assert.ok(Math.abs(fit.fontSize * 2.28 - 134) < 0.0001);
  assert.ok(fit.fontSize * 300 / 100 <= 281 * 0.75);
});

test("doubling slot dimensions doubles font size without any device px cap", () => {
  for (const layout of ["horizontal-header", "brand-column"] as const) {
    const widths = new Map([["KOHI", 235]]);
    const small = selectCanvasBrandTitleFit("KOHI", widths, 300, 160, getCanvasBrandLimits(300, layout));
    const large = selectCanvasBrandTitleFit("KOHI", widths, 600, 320, getCanvasBrandLimits(600, layout));
    assert.equal(large.fontSize, small.fontSize * 2);
    assert.deepEqual(large.lines, small.lines);
  }
});

test("actual fallback-font line metrics, not just CSS leading, bound the height", () => {
  const width = 380, height = getCanvasBrandHeight(width, 838, "horizontal-header");
  const fit = selectCanvasBrandTitleFit("梵高", new Map([["梵高", 172], ["梵", 86], ["高", 86]]), width, height, getCanvasBrandLimits(width, "horizontal-header"), 1.24);
  assert.deepEqual(fit.lines, ["梵高"]);
  assert.ok(fit.fontSize * (1.24 + 0.12) <= height + 0.0001);
  assert.ok(fit.fontSize <= getCanvasBrandLimits(width, "horizontal-header").maximum);
  assert.ok(fit.fontSize < height / 1.2);
});

test("height bounds reject a two-line candidate when the relative floor cannot fit", () => {
  const fit = selectCanvasBrandTitleFit("LOOP BAGEL", new Map([["LOOP BAGEL", 598.3], ["LOOP", 270], ["BAGEL", 300]]), 281, 50, getCanvasBrandLimits(281, "brand-column"));
  assert.deepEqual(fit.lines, ["LOOP BAGEL"]);
  assert.ok(fit.fontSize * 1.2 <= 50);
});

test("unbalanced words do not wrap just to enlarge a short fragment", () => {
  const fit = selectCanvasBrandTitleFit("A LONGWORD", new Map([["A LONGWORD", 620], ["A", 30], ["LONGWORD", 500]]), 300, 160, getCanvasBrandLimits(300, "brand-column"));
  assert.deepEqual(fit.lines, ["A LONGWORD"]);
});

test("a relative floor that overfills the single-line target favors balanced lines inside the same fixed row", () => {
  const fit = selectCanvasBrandTitleFit("SUNDAY ROASTERS", new Map([["SUNDAY ROASTERS", 896], ["SUNDAY", 350], ["ROASTERS", 500]]), 450, 118, getCanvasBrandLimits(450, "horizontal-header"));
  assert.deepEqual(fit.lines, ["SUNDAY", "ROASTERS"]);
  assert.ok(fit.fontSize * 2.28 <= 118.01);
});

test("CJK and impossible-height fallbacks preserve every character", () => {
  const title = "서울숲따뜻한커피";
  const widths = new Map(getMobileBrandMeasurementTexts(title).map((text) => [text, Array.from(text).length * 100]));
  const limits = getCanvasBrandLimits(250, "brand-column");
  const fit = selectCanvasBrandTitleFit(title, widths, 250, 160, limits);
  assert.equal(fit.lines.join(""), title);
  assert.ok(fit.fontSize >= limits.minimum);
  const impossible = selectCanvasBrandTitleFit(title, widths, 250, 1, limits);
  assert.equal(impossible.fontSize, 25);
  assert.equal(impossible.naturalWrap, true);
  assert.deepEqual(impossible.lines, [title]);
  const unknown = selectCanvasBrandTitleFit("UNMEASURED", new Map(), 250, 160, limits);
  assert.equal(unknown.naturalWrap, true);
});

test("the common selector has no template-specific branch and mobile keeps its own fitter", () => {
  const source = readFileSync(new URL("./canvas-brand-title-fit.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /templateKey|cafe_sunday|van_gogh|loop_bagel|round_focus|cafe_kohi|singleCap|multiCap/);
  const mobile = readFileSync(new URL("../components/menu-templates/shared/MobileBrandTitle.tsx", import.meta.url), "utf8");
  assert.match(mobile, /selectMobileBrandTitleFit/);
  assert.doesNotMatch(mobile, /selectCanvasBrandTitleFit/);
});

test("horizontal row starts compact, grows for two lines or supporting copy, and stays bounded", () => {
  assert.equal(getCanvasHeaderRatio(1000, 40, 1, 1.08), .08);
  assert.ok(Math.abs(getCanvasHeaderRatio(1000, 50, 2, 1.08) - .114) < 1e-8);
  assert.equal(getCanvasHeaderRatio(1000, 40, 1, 1.08, 100), .1);
  assert.equal(getCanvasHeaderRatio(1000, 100, 2, 1.08), .14);
});
