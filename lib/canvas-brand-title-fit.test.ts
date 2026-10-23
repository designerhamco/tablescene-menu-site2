import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCanvasHeaderGapScale, getCanvasHeaderRatio, getCanvasBrandHeight, getCanvasBrandLimits, selectCanvasBrandTitleFit } from "./canvas-brand-title-fit";
import { getMobileBrandMeasurementTexts } from "./mobile-brand-title-fit";
import { getFixedOnePageLayoutShell } from "./one-page-layout-shells";

test("PC and tablet layouts share semantic title limits and the full width target", () => {
  for (const layout of ["brand-column", "horizontal-header"] as const) {
    const limits = getCanvasBrandLimits(300, layout, 1, 36);
    assert.equal(limits.minimum, 45);
    assert.equal(limits.widthRatio, 1);
    const fit = selectCanvasBrandTitleFit("CAFE ARTIMENU", new Map([["CAFE ARTIMENU", 728], ["CAFE", 226], ["ARTIMENU", 477]]), 300, 170, limits);
    assert.deepEqual(fit.lines, ["CAFE", "ARTIMENU"]);
    assert.ok(fit.fontSize >= 45);
    assert.ok(fit.fontSize * 477 / 100 >= 300 * .7);
    assert.ok(fit.fontSize * 477 / 100 <= 300 + .01);
  }
});

test("all seven one-page templates keep their explicit layout family", () => {
  for (const key of ["cafe_design_a",  "cafe_mocha_forest_a", "fast_food_loop_bagel_a"]) {
    assert.equal(getFixedOnePageLayoutShell(key), "brand_left_rail", key);
  }
  for (const key of ["cafe_sunday_line_a", "cafe_van_gogh_a"]) {
    assert.equal(getFixedOnePageLayoutShell(key), "brand_top_band", key);
  }
  assert.equal(getFixedOnePageLayoutShell("cafe_round_focus_a"), "brand_center_column");
});

test("canvas brand fitting consumes the explicit shell instead of inferring it from CSS", () => {
  const source = readFileSync(new URL("../components/menu-templates/shared/CanvasBrandTitle.tsx", import.meta.url), "utf8");
  assert.match(source, /layoutShell === "brand_top_band" \? "horizontal-header" : "brand-column"/);
  assert.doesNotMatch(source, /isEdgeBrandColumn|widthRatio: 1/);
  assert.doesNotMatch(source, /classList\.contains\("cafe-a-topline-brand-identity"\)/);
  const renderer = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(renderer, /layoutShell=\{layoutShell \?\? getFixedOnePageLayoutShell\(data\.menuSite\.template_key\)\}/);
});

test("doubling slot dimensions doubles font size without any device px cap", () => {
  for (const layout of ["horizontal-header", "brand-column"] as const) {
    const widths = new Map([["DODO", 235]]);
    const small = selectCanvasBrandTitleFit("DODO", widths, 300, 160, getCanvasBrandLimits(300, layout));
    const large = selectCanvasBrandTitleFit("DODO", widths, 600, 320, getCanvasBrandLimits(600, layout));
    assert.equal(large.fontSize, small.fontSize * 2);
    assert.deepEqual(large.lines, small.lines);
  }
});

test("header height does not shrink a measured title below its semantic size", () => {
  const widths = new Map([["梵高", 172], ["梵", 86], ["高", 86]]);
  const limits = getCanvasBrandLimits(380, "horizontal-header");
  const short = selectCanvasBrandTitleFit("梵高", widths, 380, 20, limits, 1.24);
  const tall = selectCanvasBrandTitleFit("梵高", widths, 380, 200, limits, 1.24);
  assert.deepEqual(short, tall);
  assert.ok(short.fontSize >= limits.minimum);
  assert.ok(short.fontSize <= limits.maximum);
});

test("two whole-word lines receive space instead of being shrunk into a short rail budget", () => {
  const fit = selectCanvasBrandTitleFit("LOOP BAGEL", new Map([["LOOP BAGEL", 598.3], ["LOOP", 270], ["BAGEL", 300]]), 281, 50, getCanvasBrandLimits(281, "brand-column"));
  assert.deepEqual(fit.lines, ["LOOP", "BAGEL"]);
  assert.ok(fit.fontSize >= 56);
  assert.ok(fit.fontSize * 1.2 * 2 > 50);
});

test("long unbroken names use emergency grapheme lines at the title minimum", () => {
  const title = "Incomprehensible";
  const widths = new Map(getMobileBrandMeasurementTexts(title).map(text => [text, Array.from(text).length * 60]));
  const limits = getCanvasBrandLimits(260,"brand-column",1,36);
  const fit = selectCanvasBrandTitleFit(title,widths,260,150,limits);
  assert.equal(fit.lines.join(""),title);
  assert.ok(fit.lines.length >= 2);
  assert.ok(fit.fontSize >= 45);
  for(const line of fit.lines) assert.ok(widths.get(line)! * fit.fontSize / 100 <= 260 + .01);
});

test("height shortage never takes the title below category hierarchy", () => {
  const limits = getCanvasBrandLimits(300,"horizontal-header",1,48);
  const fit = selectCanvasBrandTitleFit("CAFE ARTIMENU",new Map([["CAFE ARTIMENU",728],["CAFE",226],["ARTIMENU",477]]),300,30,limits);
  assert.ok(fit.fontSize >= 60);
  assert.equal(fit.lines.join(" "),"CAFE ARTIMENU");
});

test("the common selector has no template-specific branch and mobile keeps its own fitter", () => {
  const source = readFileSync(new URL("./canvas-brand-title-fit.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /templateKey|cafe_sunday|van_gogh|loop_bagel|round_focus|singleCap|multiCap/);
  const mobile = readFileSync(new URL("../components/menu-templates/shared/MobileBrandTitle.tsx", import.meta.url), "utf8");
  assert.match(mobile, /selectMobileBrandTitleFit/);
  assert.doesNotMatch(mobile, /selectCanvasBrandTitleFit/);
});

test("horizontal row grows from 8% to 14% using the tallest measured content", () => {
  assert.equal(getCanvasHeaderRatio(1000, 40, 1, 1.08), .08);
  assert.ok(Math.abs(getCanvasHeaderRatio(1000, 50, 2, 1.08) - .114) < 1e-8);
  assert.equal(getCanvasHeaderRatio(1000, 40, 1, 1.08, 100), .1);
  assert.equal(getCanvasHeaderRatio(1000, 100, 2, 1.08), .14);
});

test("reducing the horizontal header does not change the vertical brand-column budget", () => {
  assert.ok(Math.abs(getCanvasBrandHeight(400, 1000, "horizontal-header") - 112) < 0.0001);
  assert.equal(getCanvasBrandHeight(400, 1000, "brand-column"), 180);
});

test("only a confirmed one-line PC brand compacts the header gap", () => {
  assert.equal(getCanvasHeaderGapScale("pc", 1), .75);
  assert.equal(getCanvasHeaderGapScale("pc", 2), 1);
  assert.equal(getCanvasHeaderGapScale("tablet", 1), 1);
  assert.equal(getCanvasHeaderGapScale("mobile", 1), 1);
  assert.equal(getCanvasHeaderGapScale("pc", 1, true), 1);
});

test("PC no longer has an additional horizontal size reduction",()=>{
 const widths=new Map([["CAFE",300]]),limits=getCanvasBrandLimits(300,"horizontal-header");
 assert.deepEqual(selectCanvasBrandTitleFit("CAFE",widths,300,120,limits,1.08,.875),selectCanvasBrandTitleFit("CAFE",widths,300,120,limits));
});
