import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getLoopBagelFitGapScale, usesLoopBagelFitSpacing } from "./loop-bagel-fit-spacing";

test("the spacing pilot only includes Loop Bagel PC/tablet and its responsive public view", () => {
  assert.equal(usesLoopBagelFitSpacing("fast_food_loop_bagel_a", "pc"), true);
  assert.equal(usesLoopBagelFitSpacing("fast_food_loop_bagel_a", "tablet"), true);
  assert.equal(usesLoopBagelFitSpacing("fast_food_loop_bagel_a"), true);
  assert.equal(usesLoopBagelFitSpacing("fast_food_loop_bagel_a", "mobile"), false);
  for (const key of ["cafe_design_a", "cafe_mocha_forest_a", "cafe_sunday_line_a", "cafe_real_matcha_a", "display_menu_a"]) {
    assert.equal(usesLoopBagelFitSpacing(key, "pc"), false);
  }
});

test("gap scale stays linked to font scale, with a screen-specific ceiling", () => {
  assert.equal(getLoopBagelFitGapScale(0.8, 837, 838), 0.813);
  assert.equal(getLoopBagelFitGapScale(1, 837, 838), 0.879);
  assert.equal(getLoopBagelFitGapScale(1, 984, 1000), 0.956);
  assert.equal(getLoopBagelFitGapScale(1, 1440, 1080), 1.1);
  assert.equal(getLoopBagelFitGapScale(10, 10000, 10000), 1.1);
  assert.equal(getLoopBagelFitGapScale(-1, -1, -1), 0.44);
});

test("dense menus retain smaller gaps and larger screens never reduce the gap scale", () => {
  for (const width of [600, 759, 760, 837, 899, 900, 1080, 1440, 2560]) {
    for (const height of [600, 640, 720, 838, 1000, 1080, 1440]) {
      let previous = 0;
      for (let font = 0.44; font <= 1.6; font += 0.01) {
        const gap = getLoopBagelFitGapScale(font, width, height);
        assert.ok(gap >= previous && gap >= 0.44 && gap <= 1.1);
        previous = gap;
      }
      assert.ok(getLoopBagelFitGapScale(0.6, width, height) < getLoopBagelFitGapScale(1, width, height));
      assert.ok(getLoopBagelFitGapScale(0.8, width + 1, height) >= getLoopBagelFitGapScale(0.8, width, height));
      assert.ok(getLoopBagelFitGapScale(0.8, width, height + 1) >= getLoopBagelFitGapScale(0.8, width, height));
    }
  }
});

test("screen and font corrections have no old breakpoint jumps", () => {
  for (const width of [640, 760, 900, 1080, 1440]) {
    assert.ok(Math.abs(getLoopBagelFitGapScale(1, width - 1, 838) - getLoopBagelFitGapScale(1, width + 1, 838)) <= 0.00100001);
  }
  for (const font of [0.54, 0.62, 0.66, 0.67, 0.68, 0.805, 0.815]) {
    assert.ok(Math.abs(getLoopBagelFitGapScale(font - 0.001, 837, 838) - getLoopBagelFitGapScale(font + 0.001, 837, 838)) <= 0.00300001);
  }
});

test("invalid measurements produce a finite conservative scale", () => {
  assert.equal(getLoopBagelFitGapScale(NaN, Infinity, NaN), 0.771);
});

test("candidate selection, validation and overflow backoff share the template-aware spacing rule", () => {
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/getOrderedBalancedFitGapScale\(/g) ?? []).length, 2);
  assert.equal((source.match(/getOrderedFitGapScale\(/g) ?? []).length, 2);
  assert.match(source, /getLoopBagelFitGapScale\(fontScale, menuWidth, window.innerHeight\)/);
  assert.match(source, /!isMochaForest && !isLoopBagelFitSpacing && actualCropMeasurement.bottomGap/);
  assert.match(source, /if \(isMochaForest \|\| isLoopBagelFitSpacing\) return/);
  assert.match(source, /if \(isLoopBagelFitSpacing\) \{\s*restoreOrderedFitValidationStyles\(\);\s*return;/);
  assert.match(source, /isLoopBagelFitSpacing \? \[window.innerWidth, window.innerHeight\] : \[\]/);
  assert.match(source, /const hasValidatedSafeConvergenceCandidate =\s*hasMatchingFitViewport &&/);
});

test("Loop Bagel's dense preview fixture is development-only and leaves starter data untouched", () => {
  const source = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
  const fixture = source.slice(source.indexOf("function applyCafeDenseContentQaFixture("), source.indexOf("function applySundayLineCopyQaFixture("));
  assert.ok(fixture.indexOf('process.env.NODE_ENV === "production"') < fixture.indexOf('data.menuSite.template_key === "fast_food_loop_bagel_a"'));
  assert.match(fixture, /normalizeContentQaCase\(contentQa\) !== "dense"/);
  assert.match(fixture, /items: \[\.\.\.data.items, \.\.\.extraItems\]/);
  assert.doesNotMatch(fixture, /data\.items\.(push|splice)|data\.items\[[^\]]+\]\s*=/);
});
