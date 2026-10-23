import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCanvasBrandMeasurementTexts, getCanvasHeaderGapScale, getCanvasHeaderRatio, getCanvasBrandHeight, getCanvasBrandLimits, selectCanvasBrandTitleFit } from "./canvas-brand-title-fit";
import { getMobileBrandMeasurementTexts } from "./mobile-brand-title-fit";
import { getFixedOnePageLayoutShell } from "./one-page-layout-shells";

test("PC/tablet title size is fixed to the category ratio for each layout", () => {
  for (const layout of ["brand-column", "horizontal-header"] as const) {
    const expected = 36 * (layout === "horizontal-header" ? 1.3 : 1.6);
    for (const width of [180, 300, 800]) {
      const limits = getCanvasBrandLimits(width, layout, 1, 36);
      assert.equal(limits.fontSize, expected);
      assert.equal(limits.minimum, expected);
      assert.equal(limits.maximum, expected);
    }
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

test("available width changes wrapping while the title size remains constant", () => {
  const title="CAFE ARTIMENU";
  const widths=new Map(getMobileBrandMeasurementTexts(title).map(text => [text, Array.from(text).length * 60]));
  for (const layout of ["brand-column", "horizontal-header"] as const) {
    const expected=36*(layout === "horizontal-header" ? 1.3 : 1.6);
    for (const width of [200,400,1000]) {
      const fit=selectCanvasBrandTitleFit(title,widths,width,40,getCanvasBrandLimits(width,layout,1,36));
      assert.equal(fit.fontSize,expected);
      assert.equal(fit.lines.join(" ").replace(/ /g,""),title.replace(/ /g,""));
      for(const line of fit.lines) assert.ok(widths.get(line)! * fit.fontSize / 100 <= width + .01);
    }
  }
});

test("long unbroken names use emergency grapheme lines without shrinking", () => {
  const title="Incomprehensible";
  const widths=new Map(getMobileBrandMeasurementTexts(title).map(text=>[text,Array.from(text).length*60]));
  const fit=selectCanvasBrandTitleFit(title,widths,220,20,getCanvasBrandLimits(220,"brand-column",1,36));
  assert.equal(fit.lines.join(""),title);
  assert.ok(fit.lines.length>1);
  assert.equal(fit.fontSize,36*1.6);
});

test("header word wrapping does not add lines merely to enlarge the title", () => {
  const widths=new Map([["CAFE ARTIMENU",728],["CAFE",226],["ARTIMENU",477]]);
  const fit=selectCanvasBrandTitleFit("CAFE ARTIMENU",widths,384,30,getCanvasBrandLimits(384,"horizontal-header",1,34.56));
  assert.deepEqual(fit.lines,["CAFE ARTIMENU"]);
  assert.equal(fit.fontSize,34.56*1.3);
});

test("height, device ceiling and font width cannot change the selected semantic size", () => {
  const widths=new Map([["DODO",235]]);
  const limits=getCanvasBrandLimits(300,"brand-column",1,36);
  assert.deepEqual(selectCanvasBrandTitleFit("DODO",widths,300,20,limits,1.24,.875),selectCanvasBrandTitleFit("DODO",widths,300,200,limits));
  assert.equal(selectCanvasBrandTitleFit("DODO",widths,300,20,limits,1.08,1,1.1).fontSize,36*1.6*1.1);
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


test("an oversized word never pulls fragments into an intact neighboring word", () => {
  const title="CAFE ARTIMENU";
  const widths=new Map(getMobileBrandMeasurementTexts(title).map(text=>[text,Array.from(text).length*60]));
  const fit=selectCanvasBrandTitleFit(title,widths,237,300,getCanvasBrandLimits(237,"brand-column",1,33.28));
  assert.equal(fit.lines[0],"CAFE");
  assert.equal(fit.lines.slice(1).join(""),"ARTIMENU");
  assert.equal(fit.fontSize,33.28*1.6);
});


test("valid forty-character PC titles have measured line plans without changing mobile defaults", () => {
 const title="W".repeat(40);
 const widths=new Map(getCanvasBrandMeasurementTexts(title).map(text=>[text,text.length*100]));
 const fit=selectCanvasBrandTitleFit(title,widths,220,500,getCanvasBrandLimits(220,"brand-column",1,33.28));
 assert.equal(fit.naturalWrap,false);
 assert.equal(fit.lines.join(""),title);
 assert.equal(fit.fontSize,33.28*1.6);
 assert.ok(getMobileBrandMeasurementTexts(title).length<2);
});
