import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCanvasBrandLimits, selectCanvasBrandTitleFit } from "./canvas-brand-title-fit";
import { getMobileBrandMeasurementTexts } from "./mobile-brand-title-fit";

for (const [device, minimum, singleCap, multiCap] of [["tablet", 40, 80, 60], ["pc", 44, 88, 64]] as const) {
  const limits = getCanvasBrandLimits(device);
  test(`${device} brand fits independently with bounded short and whole-word long titles`, () => {
    assert.deepEqual(limits, { minimum, singleCap, multiCap });
    const short = selectCanvasBrandTitleFit("KOHI", new Map([["KOHI", 235]]), 300, 160, limits);
    assert.equal(short.fontSize, singleCap);
    assert.deepEqual(short.lines, ["KOHI"]);
    const long = selectCanvasBrandTitleFit("SUNDAY ROASTERS", new Map([["SUNDAY ROASTERS", 1000], ["SUNDAY", 400], ["ROASTERS", 500]]), 300, 160, limits);
    assert.deepEqual(long.lines, ["SUNDAY", "ROASTERS"]);
    assert.ok(long.fontSize >= minimum && long.fontSize <= multiCap);
    assert.equal(long.lines.join(" "), "SUNDAY ROASTERS");
    assert.equal(selectCanvasBrandTitleFit("UNMEASURED", new Map(), 300, 160, limits).fontSize, minimum);
  });
}

test("two balanced lines can win even when the whole title fits at the minimum", () => {
  const fit = selectCanvasBrandTitleFit("LOOP BAGEL", new Map([["LOOP BAGEL", 598.3], ["LOOP", 270], ["BAGEL", 300]]), 281, 141, getCanvasBrandLimits("tablet"));
  assert.deepEqual(fit.lines, ["LOOP", "BAGEL"]);
  assert.equal(fit.fontSize, 60);
});

test("a short title stays on one line if wrapping cannot improve its size", () => {
  const fit = selectCanvasBrandTitleFit("VAN GOGH", new Map([["VAN GOGH", 453.5], ["VAN", 170], ["GOGH", 235]]), 512, 141, getCanvasBrandLimits("tablet"));
  assert.deepEqual(fit.lines, ["VAN GOGH"]);
  assert.equal(fit.fontSize, 80);
});

test("the same dimensions and font measurements always give the same result", () => {
  const widths = new Map([["SUNDAY ROASTERS", 896.9], ["SUNDAY", 350], ["ROASTERS", 500]]);
  const fit = selectCanvasBrandTitleFit("SUNDAY ROASTERS", widths, 512, 141, getCanvasBrandLimits("tablet"));
  assert.deepEqual(fit.lines, ["SUNDAY", "ROASTERS"]);
  assert.equal(fit.fontSize, 60);
  assert.deepEqual(selectCanvasBrandTitleFit("SUNDAY ROASTERS", widths, 512, 141, getCanvasBrandLimits("tablet")), fit);
});

test("height bounds reject a two-line candidate even if it would otherwise be larger", () => {
  const fit = selectCanvasBrandTitleFit("LOOP BAGEL", new Map([["LOOP BAGEL", 598.3], ["LOOP", 270], ["BAGEL", 300]]), 281, 70, getCanvasBrandLimits("tablet"));
  assert.deepEqual(fit.lines, ["LOOP BAGEL"]);
  assert.ok(fit.fontSize * 1.2 <= 70);
});

test("unbalanced words do not wrap just to enlarge a short fragment", () => {
  const fit = selectCanvasBrandTitleFit("A LONGWORD", new Map([["A LONGWORD", 620], ["A", 30], ["LONGWORD", 500]]), 300, 160, getCanvasBrandLimits("tablet"));
  assert.deepEqual(fit.lines, ["A LONGWORD"]);
});

test("CJK and impossible-height fallbacks preserve every character and the minimum", () => {
  const title = "서울숲따뜻한커피";
  const widths = new Map(getMobileBrandMeasurementTexts(title).map((text) => [text, Array.from(text).length * 100]));
  const fit = selectCanvasBrandTitleFit(title, widths, 250, 160, getCanvasBrandLimits("tablet"));
  assert.equal(fit.lines.join(""), title);
  assert.ok(fit.fontSize >= 40);
  const impossible = selectCanvasBrandTitleFit(title, widths, 1, 1, getCanvasBrandLimits("pc"));
  assert.equal(impossible.fontSize, 44);
  assert.equal(impossible.naturalWrap, true);
  assert.deepEqual(impossible.lines, [title]);
});

test("the common selector has no template-specific branch and mobile keeps its own fitter", () => {
  const source = readFileSync(new URL("./canvas-brand-title-fit.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /templateKey|cafe_sunday|van_gogh|loop_bagel|round_focus|cafe_kohi/);
  const mobile = readFileSync(new URL("../components/menu-templates/shared/MobileBrandTitle.tsx", import.meta.url), "utf8");
  assert.match(mobile, /selectMobileBrandTitleFit/);
  assert.doesNotMatch(mobile, /selectCanvasBrandTitleFit/);
});
